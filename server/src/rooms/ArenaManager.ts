import type { Server, Socket } from 'socket.io';
import {
  DUEL_ROUNDS,
  DUEL_ROUND_SEC,
  ELO_DELTA,
  READY_COUNTDOWN_SEC,
  VERDICT_AUTOADVANCE_SEC,
  type AckResponse,
  type BotDifficulty,
  type ClientToServerEvents,
  type DuelFinal,
  type DuelRound,
  type InterServerEvents,
  type JoinedRoom,
  type OpponentActivity,
  type PlayerIdentity,
  type PlayerSlot,
  type RoomCode,
  type RoomPlayer,
  type RoomState,
  type RoundWinner,
  type ServerToClientEvents,
  type SocketData,
  type SocketErrorCode,
} from '../../../shared/types.ts';
import { SKILLS, getSkill } from '../data/skills.ts';
import { normalize, pick } from '../lib/text.ts';
import { BOT_PROFILES, planBotAnswer } from '../services/bot.ts';
import { buildDuelChallenge } from '../services/challenges.ts';
import { judgeDuel } from '../services/referee.ts';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type ArenaSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type Timer = ReturnType<typeof setTimeout>;

const SLOTS: PlayerSlot[] = ['player1', 'player2'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
/** Margen de latencia tras `endsAt` en el que aún se aceptan envíos. */
const SUBMIT_GRACE_MS = 750;
const MAX_ANSWER_CHARS = 600;
const RECONNECT_WINDOW_MS = 60_000;
const ROOM_TTL_MS = 2 * 60 * 60_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;

interface Room {
  state: RoomState;
  usedSkillIds: string[];
  /** Cuenta regresiva de inicio o auto-avance del veredicto. */
  phaseTimer: Timer | null;
  roundTimer: Timer | null;
  botTimers: Timer[];
  cleanupTimer: Timer | null;
  nextVotes: Set<PlayerSlot>;
  /** Invalida evaluaciones en vuelo si la sala cambió mientras el árbitro pensaba. */
  judgeToken: number;
  lastActivity: number;
}

class ArenaError extends Error {
  constructor(
    message: string,
    readonly code: SocketErrorCode,
  ) {
    super(message);
  }
}

/* ── helpers puros ───────────────────────────────────────────────────────── */

function other(slot: PlayerSlot): PlayerSlot {
  return slot === 'player1' ? 'player2' : 'player1';
}

function parseIdentity(payload: unknown): PlayerIdentity {
  const p = payload as Partial<PlayerIdentity> | null;
  const nickname = typeof p?.nickname === 'string' ? p.nickname.trim().slice(0, 24) : '';
  if (!nickname) throw new ArenaError('Nickname requerido.', 'INVALID_PAYLOAD');
  const elo = typeof p?.elo === 'number' && Number.isFinite(p.elo) ? Math.max(0, Math.min(5000, Math.round(p.elo))) : 1000;
  return { nickname, elo };
}

function parseFixedSkill(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !getSkill(value)) throw new ArenaError('Skill fijada desconocida.', 'INVALID_PAYLOAD');
  return value;
}

function parseDifficulty(value: unknown): BotDifficulty {
  return value === 'maestro' ? 'maestro' : 'novato';
}

/** Ronda pública: oculta el texto de los envíos hasta que haya veredicto. */
function publicRound(round: DuelRound): DuelRound {
  if (round.result) return round;
  const submissions: DuelRound['submissions'] = {};
  for (const slot of SLOTS) {
    const s = round.submissions[slot];
    if (s) submissions[slot] = { text: '', submittedAt: s.submittedAt };
  }
  return { ...round, submissions };
}

function publicState(state: RoomState): RoomState {
  return { ...state, serverNow: Date.now(), rounds: state.rounds.map(publicRound) };
}

function computeFinal(rounds: DuelRound[]): DuelFinal {
  const roundsWon: Record<PlayerSlot, number> = { player1: 0, player2: 0 };
  const totalPoints: Record<PlayerSlot, number> = { player1: 0, player2: 0 };
  const improved: Record<PlayerSlot, Set<string>> = { player1: new Set(), player2: new Set() };

  for (const round of rounds) {
    const r = round.result;
    if (!r) continue;
    if (r.winner !== 'tie') roundsWon[r.winner]++;
    for (const slot of SLOTS) {
      totalPoints[slot] += r[slot].totalScore;
      if (!r[slot].antiCalzadorTriggered && r[slot].totalScore >= round.challenge.minScore) {
        improved[slot].add(round.challenge.skillId);
      }
    }
  }

  let winner: RoundWinner = 'tie';
  if (roundsWon.player1 !== roundsWon.player2) winner = roundsWon.player1 > roundsWon.player2 ? 'player1' : 'player2';
  else if (totalPoints.player1 !== totalPoints.player2)
    winner = totalPoints.player1 > totalPoints.player2 ? 'player1' : 'player2';

  const eloChange: Record<PlayerSlot, number> =
    winner === 'tie'
      ? { player1: ELO_DELTA.tie, player2: ELO_DELTA.tie }
      : { [winner]: ELO_DELTA.win, [other(winner)]: ELO_DELTA.loss } as Record<PlayerSlot, number>;

  return {
    winner,
    roundsWon,
    totalPoints,
    eloChange,
    improvedSkills: { player1: [...improved.player1], player2: [...improved.player2] },
  };
}

/* ════════════════════════════════════════════════════════════════════════════
 * ArenaManager
 * ════════════════════════════════════════════════════════════════════════════ */

export class ArenaManager {
  private readonly rooms = new Map<RoomCode, Room>();

  constructor(private readonly io: IO) {
    setInterval(() => this.sweep(), SWEEP_INTERVAL_MS).unref();
    io.on('connection', (socket) => this.attach(socket));
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  /* ── registro de eventos ─────────────────────────────────────────────── */

  private attach(socket: ArenaSocket): void {
    const guard =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        try {
          fn(...args);
        } catch (err) {
          const ack = args.find((a): a is (res: AckResponse<never>) => void => typeof a === 'function');
          const code = err instanceof ArenaError ? err.code : undefined;
          const message = err instanceof Error ? err.message : 'Error inesperado';
          if (!(err instanceof ArenaError)) console.error('[arena]', err);
          if (ack) ack({ ok: false, error: message, ...(code ? { code } : {}) });
          else socket.emit('room:error', { message, ...(code ? { code } : {}) });
        }
      };

    socket.on('room:create', guard((payload, ack) => ack({ ok: true, data: this.createRoom(socket, payload) })));
    socket.on('room:join', guard((payload, ack) => ack({ ok: true, data: this.joinRoom(socket, payload) })));
    socket.on('room:addBot', guard((payload, ack) => ack({ ok: true, data: this.addBot(socket, payload) })));
    socket.on('duel:quickBot', guard((payload, ack) => ack({ ok: true, data: this.quickBot(socket, payload) })));
    socket.on('room:ready', guard(() => this.markReady(socket)));
    socket.on('duel:typing', guard((isTyping) => this.typing(socket, isTyping)));
    socket.on('duel:submit', guard((payload, ack) => {
      this.submit(socket, payload);
      ack({ ok: true, data: undefined });
    }));
    socket.on('duel:nextRound', guard(() => this.voteNext(socket)));
    socket.on('duel:rematch', guard((ack) => ack({ ok: true, data: this.rematch(socket) })));
    socket.on('room:leave', guard(() => this.leave(socket, true)));
    socket.on('disconnect', () => this.leave(socket, false));
  }

  /* ── utilidades de sala ──────────────────────────────────────────────── */

  private newCode(): RoomCode {
    for (;;) {
      let code = '';
      for (let i = 0; i < 4; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }

  private newRoom(fixedSkillId: string | null): Room {
    const now = Date.now();
    const room: Room = {
      state: {
        code: this.newCode(),
        phase: 'waiting',
        players: {},
        rounds: [],
        currentRoundIndex: -1,
        fixedSkillId,
        final: null,
        serverNow: now,
        createdAt: now,
      },
      usedSkillIds: [],
      phaseTimer: null,
      roundTimer: null,
      botTimers: [],
      cleanupTimer: null,
      nextVotes: new Set(),
      judgeToken: 0,
      lastActivity: now,
    };
    this.rooms.set(room.state.code, room);
    return room;
  }

  private humanPlayer(socket: ArenaSocket, slot: PlayerSlot, id: PlayerIdentity): RoomPlayer {
    return {
      slot,
      id: socket.id,
      nickname: id.nickname,
      elo: id.elo,
      isBot: false,
      connected: true,
      ready: false,
      activity: 'idle',
    };
  }

  private botPlayer(room: Room, slot: PlayerSlot, difficulty: BotDifficulty): RoomPlayer {
    const profile = BOT_PROFILES[difficulty];
    return {
      slot,
      id: `bot:${room.state.code}`,
      nickname: profile.nickname,
      elo: profile.elo,
      isBot: true,
      botDifficulty: difficulty,
      connected: true,
      ready: true,
      activity: 'idle',
    };
  }

  private bindSocket(socket: ArenaSocket, room: Room, slot: PlayerSlot, nickname: string): void {
    void socket.join(room.state.code);
    socket.data.roomCode = room.state.code;
    socket.data.slot = slot;
    socket.data.nickname = nickname;
  }

  /** Sala + slot del socket, validando que siga siendo el dueño del slot. */
  private context(socket: ArenaSocket): { room: Room; slot: PlayerSlot; player: RoomPlayer } {
    const { roomCode, slot } = socket.data;
    const room = roomCode ? this.rooms.get(roomCode) : undefined;
    const player = room && slot ? room.state.players[slot] : undefined;
    if (!room || !slot || !player || player.id !== socket.id) {
      throw new ArenaError('No estás en ninguna sala.', 'NOT_IN_ROOM');
    }
    return { room, slot, player };
  }

  private emitState(room: Room): void {
    room.lastActivity = Date.now();
    this.io.to(room.state.code).emit('room:state', publicState(room.state));
  }

  private emitActivity(room: Room, slot: PlayerSlot, activity: OpponentActivity, except?: ArenaSocket): void {
    const player = room.state.players[slot];
    if (player) player.activity = activity;
    const target = except ? except.to(room.state.code) : this.io.to(room.state.code);
    target.emit('duel:opponentActivity', { slot, activity });
  }

  private connectedHumans(room: Room): RoomPlayer[] {
    return SLOTS.map((s) => room.state.players[s]).filter((p): p is RoomPlayer => !!p && !p.isBot && p.connected);
  }

  private currentRound(room: Room): DuelRound | undefined {
    return room.state.rounds[room.state.currentRoundIndex];
  }

  private clearRoundTimers(room: Room): void {
    if (room.roundTimer) clearTimeout(room.roundTimer);
    room.roundTimer = null;
    for (const t of room.botTimers) clearTimeout(t);
    room.botTimers = [];
  }

  private clearPhaseTimer(room: Room): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    room.phaseTimer = null;
  }

  private destroy(room: Room): void {
    this.clearRoundTimers(room);
    this.clearPhaseTimer(room);
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.judgeToken++;
    this.rooms.delete(room.state.code);
    this.io.in(room.state.code).socketsLeave(room.state.code);
  }

  private sweep(): void {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (now - room.lastActivity > ROOM_TTL_MS || this.connectedHumans(room).length === 0) this.destroy(room);
    }
  }

  /* ── lobby ───────────────────────────────────────────────────────────── */

  private createRoom(socket: ArenaSocket, payload: unknown): JoinedRoom {
    const identity = parseIdentity(payload);
    const fixedSkillId = parseFixedSkill((payload as { fixedSkillId?: unknown }).fixedSkillId);
    this.leave(socket, true);

    const room = this.newRoom(fixedSkillId);
    room.state.players.player1 = this.humanPlayer(socket, 'player1', identity);
    this.bindSocket(socket, room, 'player1', identity.nickname);
    this.emitState(room);
    return { code: room.state.code, slot: 'player1', state: publicState(room.state) };
  }

  private joinRoom(socket: ArenaSocket, payload: unknown): JoinedRoom {
    const identity = parseIdentity(payload);
    const rawCode = (payload as { code?: unknown }).code;
    const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
    if (!/^[A-Z0-9]{4}$/.test(code)) throw new ArenaError('Código de sala inválido.', 'INVALID_PAYLOAD');
    const room = this.rooms.get(code);
    if (!room) throw new ArenaError(`La sala ${code} no existe o ya cerró.`, 'ROOM_NOT_FOUND');

    // Ya está dentro (p.ej. doble clic): devolver su estado.
    if (socket.data.roomCode === code && socket.data.slot && room.state.players[socket.data.slot]?.id === socket.id) {
      return { code, slot: socket.data.slot, state: publicState(room.state) };
    }

    const { players, phase } = room.state;

    // Reconexión: recuperar un slot humano desconectado con el mismo nickname.
    const reclaim = SLOTS.find((s) => {
      const p = players[s];
      return p && !p.isBot && !p.connected && normalize(p.nickname) === normalize(identity.nickname);
    });
    if (reclaim) {
      this.leave(socket, true);
      const player = players[reclaim]!;
      const round = this.currentRound(room);
      player.id = socket.id;
      player.connected = true;
      player.activity = phase === 'round' && round?.submissions[reclaim] ? 'submitted' : 'idle';
      if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
      this.bindSocket(socket, room, reclaim, player.nickname);
      this.emitActivity(room, reclaim, player.activity);
      this.emitState(room);
      return { code, slot: reclaim, state: publicState(room.state) };
    }

    if (phase !== 'waiting') {
      throw new ArenaError(phase === 'ready' ? 'La sala está llena.' : 'La sala ya está en duelo.', 'ROOM_FULL');
    }
    const slot = SLOTS.find((s) => !players[s]);
    if (!slot) throw new ArenaError('La sala está llena.', 'ROOM_FULL');

    this.leave(socket, true);
    players[slot] = this.humanPlayer(socket, slot, identity);
    this.bindSocket(socket, room, slot, identity.nickname);
    if (players[other(slot)]) this.enterReady(room);
    else this.emitState(room);
    return { code, slot, state: publicState(room.state) };
  }

  private addBot(socket: ArenaSocket, payload: unknown): RoomState {
    const { room, slot } = this.context(socket);
    if (room.state.phase !== 'waiting') throw new ArenaError('Solo puedes añadir un bot en la sala de espera.', 'INVALID_PHASE');
    const botSlot = other(slot);
    if (room.state.players[botSlot]) throw new ArenaError('La sala ya tiene rival.', 'ROOM_FULL');
    room.state.players[botSlot] = this.botPlayer(room, botSlot, parseDifficulty((payload as { difficulty?: unknown })?.difficulty));
    this.enterReady(room);
    return publicState(room.state);
  }

  private quickBot(socket: ArenaSocket, payload: unknown): JoinedRoom {
    const identity = parseIdentity(payload);
    const p = payload as { difficulty?: unknown; fixedSkillId?: unknown };
    const fixedSkillId = parseFixedSkill(p.fixedSkillId);
    this.leave(socket, true);

    const room = this.newRoom(fixedSkillId);
    room.state.players.player1 = this.humanPlayer(socket, 'player1', identity);
    room.state.players.player2 = this.botPlayer(room, 'player2', parseDifficulty(p.difficulty));
    this.bindSocket(socket, room, 'player1', identity.nickname);
    this.enterReady(room);
    return { code: room.state.code, slot: 'player1', state: publicState(room.state) };
  }

  /** Ambos conectados: cuenta regresiva de inicio (se adelanta si todos pulsan LISTO). */
  private enterReady(room: Room): void {
    this.clearPhaseTimer(room);
    room.state.phase = 'ready';
    for (const s of SLOTS) {
      const p = room.state.players[s];
      if (p) {
        p.ready = p.isBot;
        p.activity = p.connected ? 'idle' : 'disconnected';
      }
    }
    room.phaseTimer = setTimeout(() => this.startRound(room, 1), READY_COUNTDOWN_SEC * 1000);
    this.emitState(room);
  }

  private markReady(socket: ArenaSocket): void {
    const { room, player } = this.context(socket);
    if (room.state.phase !== 'ready') throw new ArenaError('No hay duelo por iniciar.', 'INVALID_PHASE');
    player.ready = true;
    const all = SLOTS.every((s) => room.state.players[s]?.ready);
    if (all) this.startRound(room, 1);
    else this.emitState(room);
  }

  /* ── rondas ──────────────────────────────────────────────────────────── */

  private pickSkillId(room: Room, index: 1 | 2 | 3): string {
    if (index === 1 && room.state.fixedSkillId) return room.state.fixedSkillId;
    const pool = SKILLS.filter((s) => !room.usedSkillIds.includes(s.id));
    return pick(pool.length ? pool : SKILLS).id;
  }

  private startRound(room: Room, index: 1 | 2 | 3): void {
    if (!this.rooms.has(room.state.code)) return;
    this.clearPhaseTimer(room);
    this.clearRoundTimers(room);

    const skillId = this.pickSkillId(room, index);
    room.usedSkillIds.push(skillId);
    const now = Date.now();
    const round: DuelRound = {
      index,
      challenge: buildDuelChallenge(getSkill(skillId)!, index),
      startedAt: now,
      endsAt: now + DUEL_ROUND_SEC * 1000,
      submissions: {},
      result: null,
      source: null,
    };
    room.state.rounds.push(round);
    room.state.currentRoundIndex = room.state.rounds.length - 1;
    room.state.phase = 'round';
    room.nextVotes.clear();
    for (const s of SLOTS) {
      const p = room.state.players[s];
      if (p) p.activity = p.connected ? 'idle' : 'disconnected';
    }

    this.io.to(room.state.code).emit('duel:roundStart', publicRound(round));
    this.emitState(room);

    room.roundTimer = setTimeout(() => void this.closeRound(room), DUEL_ROUND_SEC * 1000 + SUBMIT_GRACE_MS);
    for (const s of SLOTS) {
      const p = room.state.players[s];
      if (p?.isBot) this.scheduleBot(room, round, s, p.botDifficulty ?? 'novato');
    }
  }

  private isLive(room: Room, round: DuelRound): boolean {
    return this.rooms.get(room.state.code) === room && room.state.phase === 'round' && this.currentRound(room) === round;
  }

  private scheduleBot(room: Room, round: DuelRound, slot: PlayerSlot, difficulty: BotDifficulty): void {
    const plan = planBotAnswer(round.challenge, difficulty);
    room.botTimers.push(
      setTimeout(() => {
        if (this.isLive(room, round) && !round.submissions[slot]) this.emitActivity(room, slot, 'typing');
      }, plan.typingAfterMs),
      setTimeout(() => {
        void plan.text.then((text) => {
          if (this.isLive(room, round) && !round.submissions[slot]) this.record(room, round, slot, text);
        });
      }, plan.submitAfterMs),
    );
  }

  private typing(socket: ArenaSocket, isTyping: unknown): void {
    const { room, slot } = this.context(socket);
    const round = this.currentRound(room);
    if (room.state.phase !== 'round' || !round || round.submissions[slot]) return;
    const activity: OpponentActivity = isTyping === true ? 'typing' : 'idle';
    if (room.state.players[slot]!.activity === activity) return;
    this.emitActivity(room, slot, activity, socket);
  }

  private submit(socket: ArenaSocket, payload: unknown): void {
    const { room, slot } = this.context(socket);
    const round = this.currentRound(room);
    if (room.state.phase !== 'round' || !round) throw new ArenaError('No hay una ronda en curso.', 'INVALID_PHASE');
    if (Date.now() > round.endsAt + SUBMIT_GRACE_MS) throw new ArenaError('Tiempo agotado.', 'INVALID_PHASE');
    if (round.submissions[slot]) throw new ArenaError('Ya enviaste tu respuesta.', 'ALREADY_SUBMITTED');
    const raw = (payload as { text?: unknown } | null)?.text;
    const text = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
    if (!text) throw new ArenaError('La respuesta está vacía.', 'INVALID_PAYLOAD');
    if (text.length > MAX_ANSWER_CHARS) throw new ArenaError(`Máximo ${MAX_ANSWER_CHARS} caracteres.`, 'INVALID_PAYLOAD');
    this.record(room, round, slot, text);
  }

  private record(room: Room, round: DuelRound, slot: PlayerSlot, text: string): void {
    round.submissions[slot] = { text, submittedAt: Date.now() };
    this.emitActivity(room, slot, 'submitted');
    this.emitState(room);
    this.maybeClose(room);
  }

  /** Cierra la ronda si todos los jugadores conectados ya enviaron. */
  private maybeClose(room: Room): void {
    const round = this.currentRound(room);
    if (room.state.phase !== 'round' || !round) return;
    const done = SLOTS.every((s) => {
      const p = room.state.players[s];
      return !p || !p.connected || !!round.submissions[s];
    });
    if (done) void this.closeRound(room);
  }

  private async closeRound(room: Room): Promise<void> {
    const round = this.currentRound(room);
    if (room.state.phase !== 'round' || !round || !this.rooms.has(room.state.code)) return;
    this.clearRoundTimers(room);
    room.state.phase = 'judging';
    this.emitState(room);

    const token = ++room.judgeToken;
    const names: Record<PlayerSlot, string> = {
      player1: room.state.players.player1?.nickname ?? 'Jugador 1',
      player2: room.state.players.player2?.nickname ?? 'Jugador 2',
    };
    const answers: Record<PlayerSlot, string | null> = {
      player1: round.submissions.player1?.text ?? null,
      player2: round.submissions.player2?.text ?? null,
    };

    let judged: Awaited<ReturnType<typeof judgeDuel>>;
    try {
      judged = await judgeDuel(round.challenge, answers, names);
    } catch (err) {
      console.error('[arena] fallo del árbitro:', err);
      const zero = { antiCalzadorTriggered: false, precisionScore: 0, contextScore: 0, constraintScore: 0, totalScore: 0, feedback: 'El árbitro no pudo evaluar esta ronda.' };
      judged = { result: { winner: 'tie', comparativeVerdict: 'Ronda anulada por fallo del árbitro.', player1: zero, player2: zero }, source: 'local' };
    }
    if (this.rooms.get(room.state.code) !== room || room.judgeToken !== token) return;

    round.result = judged.result;
    round.source = judged.source;
    room.state.phase = 'verdict';
    for (const s of SLOTS) {
      const p = room.state.players[s];
      if (p) p.activity = p.connected ? 'idle' : 'disconnected';
    }
    this.io.to(room.state.code).emit('duel:roundResult', round);
    this.emitState(room);
    room.phaseTimer = setTimeout(() => this.advance(room), VERDICT_AUTOADVANCE_SEC * 1000);
  }

  private voteNext(socket: ArenaSocket): void {
    const { room, slot } = this.context(socket);
    if (room.state.phase !== 'verdict') return;
    room.nextVotes.add(slot);
    this.checkVotes(room);
  }

  private checkVotes(room: Room): void {
    if (room.state.phase !== 'verdict') return;
    const humans = this.connectedHumans(room);
    if (humans.length > 0 && humans.every((p) => room.nextVotes.has(p.slot))) this.advance(room);
  }

  private advance(room: Room): void {
    if (room.state.phase !== 'verdict' || !this.rooms.has(room.state.code)) return;
    this.clearPhaseTimer(room);
    const next = room.state.currentRoundIndex + 2;
    if (next <= DUEL_ROUNDS) this.startRound(room, next as 1 | 2 | 3);
    else this.finish(room);
  }

  private finish(room: Room): void {
    const final = computeFinal(room.state.rounds);
    for (const s of SLOTS) {
      const p = room.state.players[s];
      if (p) {
        p.elo = Math.max(0, p.elo + final.eloChange[s]);
        p.ready = p.isBot;
        p.activity = p.connected ? 'idle' : 'disconnected';
      }
    }
    room.state.final = final;
    room.state.phase = 'finished';
    this.io.to(room.state.code).emit('duel:finished', final);
    this.emitState(room);
  }

  private rematch(socket: ArenaSocket): RoomState {
    const { room } = this.context(socket);
    const { state } = room;
    if (state.phase === 'waiting' || state.phase === 'ready') return publicState(state); // el rival ya la pidió
    if (state.phase !== 'finished') throw new ArenaError('El duelo aún no termina.', 'INVALID_PHASE');

    state.rounds = [];
    state.currentRoundIndex = -1;
    state.final = null;
    room.usedSkillIds = [];
    room.nextVotes.clear();
    for (const s of SLOTS) {
      const p = state.players[s];
      if (p && !p.connected) delete state.players[s];
    }
    if (SLOTS.every((s) => state.players[s])) this.enterReady(room);
    else {
      state.phase = 'waiting';
      this.emitState(room);
    }
    return publicState(state);
  }

  /* ── salida / desconexión ────────────────────────────────────────────── */

  private leave(socket: ArenaSocket, explicit: boolean): void {
    const { roomCode, slot } = socket.data;
    socket.data.roomCode = undefined;
    socket.data.slot = undefined;
    if (!roomCode) return;
    if (explicit) void socket.leave(roomCode);
    const room = this.rooms.get(roomCode);
    const player = room && slot ? room.state.players[slot] : undefined;
    if (!room || !slot || !player || player.id !== socket.id) return;

    const { state } = room;
    if (state.phase === 'waiting' || state.phase === 'ready') {
      this.clearPhaseTimer(room);
      delete state.players[slot];
      if (this.connectedHumans(room).length === 0) return this.destroy(room);
      for (const p of Object.values(state.players)) if (p) p.ready = p.isBot;
      state.phase = 'waiting';
      this.emitState(room);
      return;
    }

    player.connected = false;
    this.emitActivity(room, slot, 'disconnected');
    if (this.connectedHumans(room).length === 0) {
      if (state.phase === 'finished') return this.destroy(room);
      // Ventana para recargar la pestaña / volver desde el celular.
      if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
      room.cleanupTimer = setTimeout(() => {
        if (this.connectedHumans(room).length === 0) this.destroy(room);
      }, RECONNECT_WINDOW_MS);
    }
    this.emitState(room);
    if (state.phase === 'round') this.maybeClose(room);
    else if (state.phase === 'verdict') this.checkVotes(room);
  }
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  GitBranch,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  DUEL_ROUNDS,
  DUEL_ROUND_SEC,
  READY_COUNTDOWN_SEC,
  VERDICT_AUTOADVANCE_SEC,
  type BotDifficulty,
  type Challenge,
  type DuelFinal,
  type DuelRound,
  type PlayerSlot,
  type Skill,
  type UserProfile,
} from '../../../shared/types.ts';
import { ScrambleText } from '../components/ScrambleText.tsx';
import { ScoreBars } from '../components/ScoreBars.tsx';
import { useArenaSocket } from '../hooks/useArenaSocket.ts';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.ts';
import { validateSentence } from '../utils/textValidation.ts';

const ROUND_MODE_LABELS: Record<Challenge['mode'], string> = {
  escenario: 'Ronda 1 · Escenario Obligado',
  tabu: 'Ronda 2 · Modo Tabú',
  sinergia: 'Sinergia',
  conexion: 'Ronda 3 · Conexión Forzada',
};

function getActivityLabel(activity: string): string {
  if (activity === 'typing') return 'Escribiendo...';
  if (activity === 'submitted') return 'Respuesta enviada';
  if (activity === 'disconnected') return 'Desconectado';
  return 'Esperando';
}

export function ArenaView({
  profile,
  skills,
  fixedSkillId,
  onClearFixedSkill,
  pendingRoomCode,
  onClearPendingRoom,
  hasCustomNickname,
  onSetNickname,
  onApplyDuelFinal,
  onGoToTreeWithSkill,
}: {
  profile: UserProfile;
  skills: Skill[];
  fixedSkillId: string | null;
  onClearFixedSkill: () => void;
  pendingRoomCode: string | null;
  onClearPendingRoom: () => void;
  hasCustomNickname: boolean;
  onSetNickname: (name: string) => void;
  onApplyDuelFinal: (final: DuelFinal, mySlot: PlayerSlot, rounds: DuelRound[]) => void;
  onGoToTreeWithSkill: (skillId?: string) => void;
}) {
  const arena = useArenaSocket();
  const [joinCodeInput, setJoinCodeInput] = useState(pendingRoomCode ?? '');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('novato');
  const [nickGateInput, setNickGateInput] = useState(profile.nickname);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estado de ronda en curso
  const [roundText, setRoundText] = useState('');
  const [votedNextRound, setVotedNextRound] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const typingTimerRef = useRef<number | null>(null);
  const lastRoundKeyRef = useRef<string | null>(null);
  const appliedFinalKeyRef = useRef<string | null>(null);
  const autoJoinedPendingRef = useRef(false);

  const speech = useSpeechRecognition({
    onTranscript: (chunk) => {
      setRoundText((prev) => {
        const trimmed = prev.trimEnd();
        return trimmed ? `${trimmed} ${chunk}` : chunk;
      });
    },
  });

  const fixedSkill = useMemo(
    () => skills.find((s) => s.id === fixedSkillId) ?? null,
    [fixedSkillId, skills],
  );

  // Ticker de 250ms para temporizadores de 40s, ready (3s) y veredicto (8s)
  useEffect(() => {
    const phase = arena.roomState?.phase;
    if (phase !== 'round' && phase !== 'ready' && phase !== 'verdict') return;
    setNowTick(Date.now());
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [arena.roomState?.phase]);

  // Unión automática si vino por /?room=XXXX y ya tiene nickname personalizado
  useEffect(() => {
    if (
      pendingRoomCode &&
      hasCustomNickname &&
      arena.connected &&
      !arena.roomState &&
      !autoJoinedPendingRef.current
    ) {
      autoJoinedPendingRef.current = true;
      void arena
        .joinRoom({ nickname: profile.nickname, elo: profile.elo }, pendingRoomCode)
        .then((ok) => {
          if (ok) onClearPendingRoom();
        });
    }
  }, [
    arena,
    hasCustomNickname,
    onClearPendingRoom,
    pendingRoomCode,
    profile.elo,
    profile.nickname,
  ]);

  const currentRound: DuelRound | null = useMemo(() => {
    const rs = arena.roomState;
    if (!rs || rs.currentRoundIndex < 0) return null;
    return rs.rounds[rs.currentRoundIndex] ?? null;
  }, [arena.roomState]);

  // Limpiar input al cambiar de ronda o salir de sala
  useEffect(() => {
    if (!arena.roomState || !currentRound) {
      lastRoundKeyRef.current = null;
      setRoundText('');
      setVotedNextRound(false);
      return;
    }
    const roundKey = `${arena.roomState.code}:${currentRound.index}:${currentRound.startedAt}`;
    if (lastRoundKeyRef.current !== roundKey) {
      lastRoundKeyRef.current = roundKey;
      setRoundText('');
      setVotedNextRound(false);
      speech.stopListening();
    }
  }, [arena.roomState, currentRound, speech]);

  // Aplicar ELO y skills mejoradas al finalizar el duelo (solo una vez)
  useEffect(() => {
    const rs = arena.roomState;
    const slot = arena.mySlot;
    if (!rs || rs.phase !== 'finished' || !rs.final || !slot) return;
    const key = `${rs.code}:${rs.rounds.length}:${rs.final.totalPoints.player1}:${rs.final.totalPoints.player2}`;
    if (appliedFinalKeyRef.current === key) return;
    appliedFinalKeyRef.current = key;
    onApplyDuelFinal(rs.final, slot, rs.rounds);

    if (rs.final.winner === slot) {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f49c3b', '#f7f2ec', '#7b8794', '#4ade80'],
      });
    }
  }, [arena.mySlot, arena.roomState, onApplyDuelFinal]);

  const handleCopyInviteLink = async (code: string) => {
    const url = `${window.location.origin}/?room=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleRoundInputChange = (value: string) => {
    setRoundText(value);
    arena.setTyping(value.trim().length > 0);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      arena.setTyping(false);
    }, 1500);
  };

  const handleJoinFromPendingGate = () => {
    if (!pendingRoomCode) return;
    const cleanNick = nickGateInput.trim();
    if (cleanNick.length >= 2) {
      onSetNickname(cleanNick);
    }
    const finalNick = cleanNick.length >= 2 ? cleanNick : profile.nickname;
    void arena.joinRoom({ nickname: finalNick, elo: profile.elo }, pendingRoomCode).then((ok) => {
      if (ok) onClearPendingRoom();
    });
  };

  const roomState = arena.roomState;
  const mySlot: PlayerSlot = arena.mySlot ?? 'player1';
  const opponentSlot: PlayerSlot = mySlot === 'player1' ? 'player2' : 'player1';
  const p1 = roomState?.players.player1;
  const p2 = roomState?.players.player2;
  const me = roomState?.players[mySlot];
  const opponent = roomState?.players[opponentSlot];

  const liveValidation = useMemo(() => {
    if (!currentRound) return null;
    return validateSentence(roundText, currentRound.challenge);
  }, [currentRound, roundText]);

  const roundRemainingSec = useMemo(() => {
    if (!currentRound || roomState?.phase !== 'round') return DUEL_ROUND_SEC;
    const serverNowEstimate = nowTick + arena.clockOffsetMs;
    return Math.max(0, Math.ceil((currentRound.endsAt - serverNowEstimate) / 1000));
  }, [arena.clockOffsetMs, currentRound, nowTick, roomState?.phase]);

  // Contador visual para veredicto (8s)
  const [verdictTick, setVerdictTick] = useState(VERDICT_AUTOADVANCE_SEC);
  useEffect(() => {
    if (roomState?.phase !== 'verdict') {
      setVerdictTick(VERDICT_AUTOADVANCE_SEC);
      return;
    }
    setVerdictTick(VERDICT_AUTOADVANCE_SEC);
    const id = window.setInterval(() => {
      setVerdictTick((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [roomState?.phase, currentRound?.index]);

  return (
    <motion.section
      key="arena-view"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-5xl px-3 pb-14 pt-28 sm:px-6 sm:pb-16 md:pt-24"
    >
      {/* Cabecera de estado Socket.IO */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 shrink-0 text-accent" />
          <h1 className="font-display text-lg font-bold tracking-wider text-ink sm:text-2xl">
            ARENA 1v1
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {roomState && (
            <button
              type="button"
              onClick={arena.leaveRoom}
              className="inline-flex items-center gap-1.5 rounded-full border border-surface bg-base/80 px-2.5 py-1 font-mono text-[11px] text-secondary transition hover:border-danger/60 hover:text-danger sm:px-3"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Salir</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-surface bg-base/80 px-2.5 py-1 font-mono text-[11px] sm:gap-2 sm:px-3">
            <span
              className={`h-2 w-2 rounded-full ${arena.connected ? 'bg-success' : 'bg-accent animate-pulse'}`}
            />
            <span className={arena.connected ? 'text-success' : 'text-accent'}>
              <span className="sm:hidden">
                {arena.connected ? 'En vivo' : 'Conectando...'}
              </span>
              <span className="hidden sm:inline">
                {arena.connected ? 'Socket en tiempo real listo' : 'Conectando con Arena...'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Error de sala */}
      {arena.error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-danger/60 bg-danger/15 px-4 py-3 text-xs text-ink">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
            {arena.error}
          </span>
          <button
            type="button"
            onClick={arena.clearError}
            className="text-secondary hover:text-ink"
            aria-label="Cerrar error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── FLUJO ?room=XXXX SIN NICKNAME PERSONALIZADO (Enfocado para QR móvil) ── */}
      {!roomState && pendingRoomCode && !hasCustomNickname ? (
        <div className="glass-panel mx-auto max-w-md rounded-2xl border border-accent/55 p-5 shadow-[0_0_32px_rgba(244,156,59,0.14)] sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
            Sala QR · {pendingRoomCode}
          </div>
          <h2 className="font-display text-xl font-bold text-ink">
            Únete al duelo en 1 toque
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            Elige tu nickname para entrar directo al combate en tiempo real.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <input
              type="text"
              value={nickGateInput}
              maxLength={20}
              onChange={(e) => setNickGateInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && arena.connected && arena.busyAction !== 'join') {
                  handleJoinFromPendingGate();
                }
              }}
              placeholder="Ej. LexiMaster"
              aria-label="Tu nickname para unirte"
              className="min-h-[46px] w-full rounded-xl border border-surface bg-base/85 px-4 py-2.5 font-mono text-[16px] text-ink focus:border-accent focus:outline-none sm:text-sm"
            />
            <button
              type="button"
              disabled={!arena.connected || arena.busyAction === 'join'}
              onClick={handleJoinFromPendingGate}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110 disabled:opacity-50"
            >
              {arena.busyAction === 'join' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  CONECTANDO...
                </>
              ) : (
                `UNIRSE A SALA ${pendingRoomCode}`
              )}
            </button>
            <button
              type="button"
              onClick={onClearPendingRoom}
              className="min-h-[44px] w-full rounded-xl border border-surface px-4 py-2.5 text-xs font-medium text-secondary transition hover:border-secondary hover:text-ink"
            >
              Ver lobby completo
            </button>
          </div>
        </div>
      ) : null}

      {/* ── ESTADO 1: LOBBY ── */}
      {!roomState && !(pendingRoomCode && !hasCustomNickname) && (
        <div className="space-y-5">
          {fixedSkill && (
            <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/45 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-ink">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>
                  Palabra fijada para la <strong>Ronda 1</strong>:{' '}
                  <strong className="text-accent">{fixedSkill.word}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={onClearFixedSkill}
                className="rounded-lg border border-surface px-2.5 py-1 font-mono text-[11px] text-secondary hover:border-secondary hover:text-ink"
              >
                Quitar fijación
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Crear Sala Privada */}
            <div className="glass-panel flex flex-col justify-between gap-5 rounded-2xl p-6">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/45 bg-accent/15 text-accent">
                  <Plus className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-ink">Sala Privada + QR</h2>
                <p className="text-xs leading-relaxed text-secondary">
                  Genera un código de 4 caracteres y un QR escaneable para que otro jugador o
                  jurado se una desde su celular al instante.
                </p>
              </div>
              <button
                type="button"
                disabled={!arena.connected || arena.busyAction !== null}
                onClick={() =>
                  void arena.createRoom(
                    { nickname: profile.nickname, elo: profile.elo },
                    fixedSkill?.id,
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {arena.busyAction === 'create' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                CREAR SALA PRIVADA
              </button>
            </div>

            {/* Unirse por código */}
            <div className="glass-panel flex flex-col justify-between gap-5 rounded-2xl p-6">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-secondary/50 bg-surface/50 text-ink">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-ink">Unirse por Código</h2>
                <p className="text-xs leading-relaxed text-secondary">
                  Introduce el código de 4 letras de tu rival para entrar directo a la sala de
                  duelo.
                </p>
                <input
                  type="text"
                  maxLength={4}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="K7X2"
                  aria-label="Código de sala"
                  className="mt-2 w-full rounded-xl border border-surface bg-base/85 px-4 py-2.5 text-center font-mono text-lg font-bold tracking-[0.35em] text-ink uppercase placeholder:text-secondary/40 focus:border-accent focus:outline-none"
                />
              </div>
              <button
                type="button"
                disabled={
                  !arena.connected ||
                  joinCodeInput.trim().length < 4 ||
                  arena.busyAction !== null
                }
                onClick={() =>
                  void arena.joinRoom(
                    { nickname: profile.nickname, elo: profile.elo },
                    joinCodeInput,
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-secondary/60 bg-surface/40 px-4 py-3 font-display text-xs font-bold tracking-wider text-ink transition hover:border-ink hover:bg-surface/70 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {arena.busyAction === 'join' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                UNIRSE A SALA
              </button>
            </div>

            {/* Duelo rápido vs Bot */}
            <div className="glass-panel flex flex-col justify-between gap-5 rounded-2xl border border-accent/35 p-6">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/45 bg-accent/15 text-accent">
                  <Bot className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-ink">Duelo Rápido vs Bot</h2>
                <p className="text-xs leading-relaxed text-secondary">
                  Enfréntate al instante a nuestro Bot IA en 3 rondas cronometradas arbitradas en
                  vivo.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {(['novato', 'maestro'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setBotDifficulty(diff)}
                      className={`rounded-xl border px-3 py-2 font-mono text-xs uppercase transition ${
                        botDifficulty === diff
                          ? 'border-accent bg-accent/20 font-bold text-accent'
                          : 'border-surface bg-base/60 text-secondary hover:text-ink'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={!arena.connected || arena.busyAction !== null}
                onClick={() =>
                  void arena.quickBot(
                    { nickname: profile.nickname, elo: profile.elo },
                    botDifficulty,
                    fixedSkill?.id,
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/70 bg-accent/20 px-4 py-3 font-display text-xs font-bold tracking-wider text-ink transition hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {arena.busyAction === 'quickBot' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Swords className="h-4 w-4 text-accent" />
                )}
                DUELO RÁPIDO VS BOT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ESTADO 2: SALA DE ESPERA / READY ── */}
      {roomState && (roomState.phase === 'waiting' || roomState.phase === 'ready') && (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
          {/* Código y QR */}
          <div className="glass-panel flex flex-col items-center justify-between gap-4 rounded-2xl p-4 text-center sm:p-6 lg:col-span-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-secondary">
                Código de Sala
              </p>
              <div className="mt-1 font-mono text-3xl font-bold tracking-[0.22em] text-accent sm:text-4xl sm:tracking-[0.28em]">
                {roomState.code}
              </div>
            </div>

            <div className="rounded-2xl border border-ink/30 bg-ink p-3 shadow-lg">
              <QRCodeSVG
                value={`${window.location.origin}/?room=${roomState.code}`}
                size={160}
                className="h-auto max-w-full"
                bgColor="#f7f2ec"
                fgColor="#14151a"
                marginSize={1}
                title={`Unirse a sala ${roomState.code}`}
              />
            </div>

            <div className="w-full space-y-2">
              <p className="break-all rounded-lg border border-surface bg-base/80 px-3 py-1.5 font-mono text-[11px] text-secondary sm:truncate">
                {`${window.location.origin}/?room=${roomState.code}`}
              </p>
              <button
                type="button"
                onClick={() => void handleCopyInviteLink(roomState.code)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-secondary/60 bg-surface/40 px-4 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    ENLACE COPIADO
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    COPIAR ENLACE
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Slots de jugadores y acciones */}
          <div className="glass-panel flex flex-col justify-between gap-5 rounded-2xl p-4 sm:p-6 lg:col-span-7">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">
                  {roomState.phase === 'waiting'
                    ? 'Esperando contrincante...'
                    : '¡Rival conectado! Listos para pelear'}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(['player1', 'player2'] as const).map((slot) => {
                  const player = roomState.players[slot];
                  const isMe = slot === mySlot;
                  return (
                    <div
                      key={slot}
                      className={`rounded-2xl border p-4 ${
                        player
                          ? isMe
                            ? 'border-accent/60 bg-accent/10'
                            : 'border-secondary/60 bg-surface/35'
                          : 'border-dashed border-surface bg-base/50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-secondary">
                        <span>{slot === 'player1' ? 'Jugador 1' : 'Jugador 2'}</span>
                        {isMe && <span className="text-accent">TÚ</span>}
                      </div>

                      {player ? (
                        <div>
                          <p className="flex items-center gap-1.5 font-display text-[1rem] font-bold text-ink">
                            {player.isBot && <Bot className="h-4 w-4 text-accent" />}
                            {player.nickname}
                          </p>
                          <p className="mt-1 font-mono text-xs text-secondary">
                            ELO {player.elo}
                          </p>
                          <div className="mt-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                                player.ready
                                  ? 'border-success/60 bg-success/15 text-success'
                                  : 'border-surface bg-base/75 text-secondary'
                              }`}
                            >
                              {player.ready ? 'LISTO' : 'PREPARANDO'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-secondary" />
                          <p className="text-xs text-secondary">
                            Escanea el QR o comparte el código...
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 border-t border-surface/80 pt-4">
              {roomState.phase === 'waiting' && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-secondary">Bot:</span>
                    {(['novato', 'maestro'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setBotDifficulty(diff)}
                        className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] uppercase ${
                          botDifficulty === diff
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-surface text-secondary'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={arena.busyAction === 'addBot'}
                    onClick={() => void arena.addBot(botDifficulty)}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
                  >
                    <Bot className="h-4 w-4" />
                    INICIAR CONTRA BOT AHORA
                  </button>
                </div>
              )}

              {roomState.phase === 'ready' && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-secondary">
                    Cuenta regresiva automática ({READY_COUNTDOWN_SEC}s) o pulsa listo para
                    empezar de inmediato.
                  </p>
                  <button
                    type="button"
                    disabled={Boolean(me?.ready)}
                    onClick={arena.markReady}
                    className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-success px-5 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {me?.ready ? 'ESPERANDO AL RIVAL...' : 'LISTO PARA PELEAR'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ESTADO 3: GAMEPLAY DE 3 RONDAS (40s) ── */}
      {roomState &&
        (roomState.phase === 'round' || roomState.phase === 'judging') &&
        currentRound && (
          <div className="space-y-4">
            {/* HUD Superior */}
            <div className="glass-panel rounded-2xl p-3.5 sm:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Fila marcador + timer en móvil */}
                <div className="flex items-center justify-between gap-2 md:contents">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <div className="min-w-0 rounded-xl border border-accent/50 bg-accent/15 px-2.5 py-1.5 text-center sm:px-3">
                      <p className="max-w-[78px] truncate font-mono text-[10px] text-secondary sm:max-w-[115px]">
                        {p1?.nickname ?? 'P1'}
                      </p>
                      <p className="font-mono text-base font-bold text-ink sm:text-lg">
                        {
                          roomState.rounds.filter((r) => r.result?.winner === 'player1')
                            .length
                        }
                      </p>
                    </div>

                    <span className="font-display text-xs font-bold text-secondary sm:text-sm">
                      VS
                    </span>

                    <div className="min-w-0 rounded-xl border border-secondary/50 bg-surface/35 px-2.5 py-1.5 text-center sm:px-3">
                      <p className="max-w-[78px] truncate font-mono text-[10px] text-secondary sm:max-w-[115px]">
                        {p2?.nickname ?? 'P2'}
                      </p>
                      <p className="font-mono text-base font-bold text-ink sm:text-lg">
                        {
                          roomState.rounds.filter((r) => r.result?.winner === 'player2')
                            .length
                        }
                      </p>
                    </div>
                  </div>

                  {/* Timer en esquina superior derecha en móvil */}
                  <div
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-base font-bold md:hidden ${
                      roundRemainingSec <= 10
                        ? 'border-danger/70 bg-danger/15 text-danger'
                        : 'border-accent/50 bg-accent/15 text-accent'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span>{roundRemainingSec}s</span>
                  </div>
                </div>

                {/* Ronda + Modo */}
                <div className="flex items-center justify-between border-t border-surface/60 pt-2 md:block md:border-t-0 md:pt-0 md:text-center">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-accent">
                      Ronda {currentRound.index} de {DUEL_ROUNDS}
                    </p>
                    <p className="font-display text-xs font-semibold text-ink">
                      {ROUND_MODE_LABELS[currentRound.challenge.mode]}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs md:hidden">
                    <p className="text-[10px] uppercase text-secondary">Rival</p>
                    <p
                      className={
                        opponent?.activity === 'submitted'
                          ? 'text-success'
                          : opponent?.activity === 'typing'
                            ? 'text-accent'
                            : opponent?.activity === 'disconnected'
                              ? 'text-danger'
                              : 'text-ink'
                      }
                    >
                      {getActivityLabel(opponent?.activity ?? 'idle')}
                    </p>
                  </div>
                </div>

                {/* Estado rival + Timer en desktop */}
                <div className="hidden items-center gap-4 md:flex">
                  <div className="text-right font-mono text-xs">
                    <p className="text-[10px] uppercase text-secondary">Estado Rival</p>
                    <p
                      className={
                        opponent?.activity === 'submitted'
                          ? 'text-success'
                          : opponent?.activity === 'typing'
                            ? 'text-accent'
                            : opponent?.activity === 'disconnected'
                              ? 'text-danger'
                              : 'text-ink'
                      }
                    >
                      {getActivityLabel(opponent?.activity ?? 'idle')}
                    </p>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-lg font-bold ${
                      roundRemainingSec <= 10
                        ? 'border-danger/70 bg-danger/15 text-danger'
                        : 'border-accent/50 bg-accent/15 text-accent'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span>{roundRemainingSec}s</span>
                  </div>
                </div>
              </div>

              {/* Barra regresiva de 40s */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className={`h-full transition-all duration-300 ${
                    roundRemainingSec <= 10 ? 'bg-danger' : 'bg-accent'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (roundRemainingSec / DUEL_ROUND_SEC) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Tarjeta del Reto */}
            <div className="glass-panel rounded-2xl p-4 sm:p-6">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="break-words font-display text-2xl font-bold tracking-wide text-ink sm:text-4xl">
                  <ScrambleText
                    text={currentRound.challenge.targetWord}
                    triggerKey={`${roomState.code}-${currentRound.index}`}
                  />
                </h2>
                <span className="font-mono text-xs text-secondary">
                  Palabra objetivo · Ronda {currentRound.index}
                </span>
              </div>

              <p className="rounded-xl border border-surface bg-base/65 p-4 text-sm leading-relaxed text-ink">
                {currentRound.challenge.prompt}
              </p>

              {currentRound.challenge.tabooWords &&
                currentRound.challenge.tabooWords.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-danger">
                      Prohibidas:
                    </span>
                    {currentRound.challenge.tabooWords.map((word) => {
                      const violated = liveValidation?.violatedTabooWords.includes(word);
                      return (
                        <span
                          key={word}
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${
                            violated
                              ? 'animate-pulse border-danger bg-danger text-ink'
                              : 'border-danger/50 bg-danger/15 text-danger'
                          }`}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                )}

              {currentRound.challenge.requiredWords &&
                currentRound.challenge.requiredWords.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                      Conexión obligatoria:
                    </span>
                    {currentRound.challenge.requiredWords.map((word) => {
                      const matched = liveValidation?.matchedRequiredWords.includes(word);
                      return (
                        <span
                          key={word}
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${
                            matched
                              ? 'border-success/70 bg-success/15 text-success'
                              : 'border-accent/60 bg-accent/15 text-accent'
                          }`}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                )}

              {/* Área de respuesta */}
              {currentRound.submissions[mySlot] || roomState.phase === 'judging' ? (
                <div className="mt-5 rounded-2xl border border-accent/40 bg-base/75 p-5 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-accent" />
                  <p className="font-display text-sm font-bold text-ink">
                    {roomState.phase === 'judging'
                      ? 'El Árbitro IA está evaluando ambas respuestas...'
                      : '¡Respuesta enviada! Esperando al contrincante...'}
                  </p>
                  {(currentRound.submissions[mySlot]?.text || roundText.trim()) && (
                    <p className="mt-2 text-xs italic text-secondary">
                      “{currentRound.submissions[mySlot]?.text || roundText.trim()}”
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <textarea
                    key={`${roomState.code}-${currentRound.index}`}
                    rows={3}
                    value={roundText}
                    onChange={(e) => handleRoundInputChange(e.target.value)}
                    placeholder={`Usa "${currentRound.challenge.targetWord}" con ingenio y contexto real...`}
                    className={`min-h-[104px] w-full resize-none rounded-2xl border bg-base/80 p-3.5 text-[16px] leading-relaxed text-ink placeholder:text-secondary/65 focus:outline-none sm:p-4 sm:text-sm ${
                      liveValidation && liveValidation.violatedTabooWords.length > 0
                        ? 'border-danger'
                        : liveValidation?.hasTargetWord
                          ? 'border-success/70'
                          : 'border-surface focus:border-accent'
                    }`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                          liveValidation?.hasTargetWord
                            ? 'border-success/60 bg-success/15 text-success'
                            : 'border-surface text-secondary'
                        }`}
                      >
                        Objetivo: {currentRound.challenge.targetWord}
                      </span>
                      {liveValidation && liveValidation.violatedTabooWords.length > 0 && (
                        <span className="rounded-md border border-danger/60 bg-danger/15 px-2 py-0.5 font-mono text-[11px] text-danger">
                          Tabú: {liveValidation.violatedTabooWords.join(', ')}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-secondary">
                      {liveValidation?.wordCount ?? 0} palabras
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 pt-1 sm:flex sm:items-center sm:justify-between">
                    <button
                      type="button"
                      disabled={!speech.isSupported}
                      onClick={speech.toggleListening}
                      className={`inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition sm:w-auto ${
                        !speech.isSupported
                          ? 'cursor-not-allowed border-surface text-secondary/50'
                          : speech.isListening
                            ? 'animate-pulse border-accent bg-accent/20 text-accent'
                            : 'border-secondary/50 bg-surface/35 text-ink hover:border-accent'
                      }`}
                    >
                      {speech.isSupported ? (
                        <Mic className="h-4 w-4" />
                      ) : (
                        <MicOff className="h-4 w-4" />
                      )}
                      <span>{speech.isListening ? 'DETENER...' : 'DICTAR POR VOZ'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={roundText.trim().length === 0 || arena.busyAction === 'submit'}
                      onClick={() => {
                        speech.stopListening();
                        arena.setTyping(false);
                        void arena.submitAnswer(roundText.trim());
                      }}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                    >
                      <Send className="h-4 w-4" />
                      ENVIAR RESPUESTA
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ── ESTADO 4: CARA A CARA (VEREDICTO DE RONDA) ── */}
      {roomState && roomState.phase === 'verdict' && currentRound && currentRound.result && (
        <div className="space-y-4 sm:space-y-5">
          <div className="glass-panel rounded-2xl border border-accent/45 p-4 sm:p-5">
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-accent sm:text-xs">
                Cara a Cara · Ronda {currentRound.index}/{DUEL_ROUNDS} ·{' '}
                {currentRound.challenge.targetWord}
              </span>
              <span className="font-mono text-[11px] text-secondary sm:text-xs">
                Siguiente automática en {verdictTick}s
              </span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-ink">
              {currentRound.result.comparativeVerdict}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(['player1', 'player2'] as const).map((slot) => {
              const player = roomState.players[slot];
              const scores = currentRound.result![slot];
              const isWinner = currentRound.result!.winner === slot;
              const isMe = slot === mySlot;
              const submission = currentRound.submissions[slot]?.text;

              return (
                <div
                  key={slot}
                  className={`glass-panel flex flex-col justify-between gap-4 rounded-2xl border p-4 sm:p-5 ${
                    isWinner
                      ? 'border-success/70 shadow-[0_0_25px_rgba(74,222,128,0.12)]'
                      : 'border-surface'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-display text-[1rem] font-bold text-ink">
                          {player?.nickname ?? slot}{' '}
                          {isMe && (
                            <span className="ml-1 font-mono text-[11px] text-accent">(TÚ)</span>
                          )}
                        </p>
                        <p className="font-mono text-[11px] text-secondary">
                          {isWinner
                            ? 'GANADOR DE RONDA'
                            : currentRound.result!.winner === 'tie'
                              ? 'EMPATE'
                              : 'RIVAL'}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`font-mono text-2xl font-bold ${
                            isWinner ? 'text-success' : 'text-ink'
                          }`}
                        >
                          {scores.totalScore}
                        </span>
                        <span className="font-mono text-xs text-secondary">/100</span>
                      </div>
                    </div>

                    {scores.antiCalzadorTriggered && (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-danger/60 bg-danger/15 px-2.5 py-1 font-mono text-[11px] font-bold text-danger">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        ANTI-CALZADOR
                      </div>
                    )}

                    <div className="break-words rounded-xl border border-surface bg-base/70 p-3 text-xs italic leading-relaxed text-ink/90">
                      {submission ? `“${submission}”` : '(Sin respuesta enviada a tiempo)'}
                    </div>

                    <ScoreBars scores={scores} compact />
                  </div>

                  <p className="border-t border-surface/80 pt-3 text-xs leading-relaxed text-secondary">
                    {scores.feedback}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={votedNextRound}
              onClick={() => {
                setVotedNextRound(true);
                arena.nextRound();
              }}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {votedNextRound
                ? 'ESPERANDO AL RIVAL...'
                : currentRound.index < DUEL_ROUNDS
                  ? 'SIGUIENTE RONDA →'
                  : 'VER RESULTADO FINAL →'}
            </button>
          </div>
        </div>
      )}

      {/* ── ESTADO 5: RESUMEN FINAL DEL DUELO ── */}
      {roomState && roomState.phase === 'finished' && roomState.final && (
        <div className="glass-panel space-y-6 rounded-3xl border border-accent/45 p-4 sm:p-8">
          <div className="flex flex-col gap-4 border-b border-surface/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                  roomState.final.winner === mySlot
                    ? 'border-success/60 bg-success/15 text-success'
                    : roomState.final.winner === 'tie'
                      ? 'border-accent/60 bg-accent/15 text-accent'
                      : 'border-danger/60 bg-danger/15 text-danger'
                }`}
              >
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold tracking-wide text-ink sm:text-3xl">
                  {roomState.final.winner === mySlot
                    ? '¡VICTORIA EN LA ARENA!'
                    : roomState.final.winner === 'tie'
                      ? 'EMPATE TÉCNICO'
                      : 'DERROTA EN LA ARENA'}
                </h2>
                <p className="font-mono text-xs text-secondary">
                  Rondas: {roomState.final.roundsWon[mySlot]} -{' '}
                  {roomState.final.roundsWon[opponentSlot]} · Puntos totales:{' '}
                  {roomState.final.totalPoints[mySlot]} vs{' '}
                  {roomState.final.totalPoints[opponentSlot]}
                </p>
              </div>
            </div>

            <div className="flex w-full items-center justify-between rounded-2xl border border-surface bg-base/80 px-4 py-2.5 sm:block sm:w-auto sm:text-right">
              <p className="font-mono text-[10px] uppercase tracking-wider text-secondary">
                Cambio de ELO
              </p>
              <p
                className={`font-mono text-2xl font-bold ${
                  roomState.final.eloChange[mySlot] > 0
                    ? 'text-success'
                    : roomState.final.eloChange[mySlot] < 0
                      ? 'text-danger'
                      : 'text-ink'
                }`}
              >
                {roomState.final.eloChange[mySlot] >= 0
                  ? `+${roomState.final.eloChange[mySlot]}`
                  : roomState.final.eloChange[mySlot]}
              </p>
            </div>
          </div>

          {/* Skills mejoradas */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-wider text-secondary">
              Skills mejoradas en este duelo
            </p>
            {roomState.final.improvedSkills[mySlot].length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {roomState.final.improvedSkills[mySlot].map((skillId) => {
                  const found = skills.find((s) => s.id === skillId);
                  return (
                    <span
                      key={skillId}
                      className="inline-flex items-center gap-1.5 rounded-full border border-success/60 bg-success/15 px-3 py-1 font-mono text-xs font-semibold text-success"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {found?.word ?? skillId}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-secondary">
                No subiste skills en este combate; practica en Solo o pide revancha.
              </p>
            )}
          </div>

          {/* Botones finales */}
          <div className="grid grid-cols-1 gap-2.5 pt-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={arena.leaveRoom}
              className="min-h-[44px] w-full rounded-xl border border-surface px-4 py-2.5 text-xs font-semibold text-secondary transition hover:border-secondary hover:text-ink sm:w-auto"
            >
              VOLVER AL LOBBY
            </button>
            <button
              type="button"
              disabled={arena.busyAction === 'rematch'}
              onClick={() => void arena.rematch()}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-secondary/60 bg-surface/45 px-5 py-2.5 font-display text-xs font-bold tracking-wider text-ink transition hover:border-accent hover:text-accent disabled:opacity-50 sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              REVANCHA
            </button>
            <button
              type="button"
              onClick={() =>
                onGoToTreeWithSkill(roomState.final?.improvedSkills[mySlot][0])
              }
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110 sm:w-auto"
            >
              <GitBranch className="h-4 w-4" />
              VER LEVEL UP EN EL ÁRBOL
            </button>
          </div>
        </div>
      )}
    </motion.section>
  );
}

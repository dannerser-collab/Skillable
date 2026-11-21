/**
 * Verificación rápida de la demo contra un servidor ya levantado.
 *
 *   npm run verify --prefix server            (usa http://localhost:3001)
 *   VERIFY_URL=http://192.168.1.20:3001 npm run verify --prefix server
 *
 * 1. GET  /api/skills          → 15 skills con el esquema completo.
 * 2. POST /api/judge           → caso Anti-Calzador (rechazado) + caso con contexto (aprobado).
 * 3. Socket.IO (si socket.io-client está instalado en /client):
 *    duelo completo vs Bot (tiempos 5–9 s), recarga en sala de espera y a mitad de ronda.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { JudgeResponse, RoomState, Skill } from '../../shared/types.ts';

const BASE = (process.env.VERIFY_URL ?? 'http://localhost:3001').replace(/\/$/, '');
let failures = 0;

function check(ok: boolean, label: string, detail = ''): void {
  if (!ok) failures++;
  console.log(`${ok ? '  ✔' : '  ✘'} ${label}${detail ? `  — ${detail}` : ''}`);
}

async function judge(skillId: string, sentence: string, targetLevel: 1 | 2 | 3) {
  const res = await fetch(`${BASE}/api/judge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillId, sentence, targetLevel }),
  });
  return { status: res.status, body: (await res.json()) as JudgeResponse };
}

/* ── REST ─────────────────────────────────────────────────────────────────── */

async function verifyRest(): Promise<void> {
  console.log(`\n[REST] ${BASE}`);
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json() as Promise<{ referee: string }>);
  check(true, 'GET /api/health', `árbitro activo: ${health.referee}`);

  const res = await fetch(`${BASE}/api/skills`);
  const skills = (await res.json()) as Skill[];
  const keys: (keyof Skill)[] = ['id', 'word', 'branch', 'tier', 'parentIds', 'posX', 'posY', 'definition', 'contextTip', 'examples', 'tabooWords', 'scenarios', 'forcedConnections'];
  check(res.status === 200 && skills.length === 15, 'GET /api/skills → 15 skills', `status ${res.status}, ${skills.length} skills`);
  check(skills.every((s) => keys.every((k) => k in s)), 'Cada skill cumple el esquema');
  check(['narrativa', 'retorica', 'estrategia'].every((b) => skills.filter((s) => s.branch === b).length === 5), '3 ramas × 5 skills');

  const vague: [string, string][] = [
    ['mitologia', 'Me gusta mucho la mitología'],
    ['mitologia', 'Me gusta la mitología'],
    ['paradigma', 'Ayer leí sobre paradigma'],
    ['sinergia', 'Es importante la sinergia'],
  ];
  for (const [id, sentence] of vague) {
    const { status, body } = await judge(id, sentence, 1);
    const r = body.result;
    check(
      status === 200 && r.antiCalzadorTriggered && !r.passed && r.contextScore <= 20 && r.totalScore <= 35,
      `Anti-Calzador: «${sentence}»`,
      `${r.totalScore} pts · ${r.feedback}`,
    );
  }

  const good =
    'Llegué tarde porque el bus pasó frente al viejo garaje donde nació la startup, y su mitología fundacional me obligó a detenerme para rendir culto al origen de todo.';
  const ok = await judge('mitologia', good, 1);
  check(ok.status === 200 && ok.body.result.passed && !ok.body.result.antiCalzadorTriggered, 'Frase con contexto real → APROBADA', `${ok.body.result.totalScore} pts (${ok.body.source}) · ${ok.body.result.feedback}`);

  const taboo = await judge('mitologia', 'La mitología griega está llena de dioses caprichosos que castigan a los humanos por pura soberbia y celos.', 2);
  check(!taboo.body.result.passed && taboo.body.result.constraintScore <= 20, 'Modo Tabú: «dioses» infringe el tabú', taboo.body.result.feedback);

  const empty = await fetch(`${BASE}/api/judge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"skillId":"mitologia","targetLevel":1,"sentence":"  "}' });
  check(empty.status === 400, 'Frase vacía → 400');
  const broken = await fetch(`${BASE}/api/judge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  check(broken.status === 400, 'JSON roto → 400 (el servidor sigue vivo)');
}

/* ── Socket.IO ────────────────────────────────────────────────────────────── */

type IoFactory = (url: string, opts?: Record<string, unknown>) => any;

function loadIo(): IoFactory | null {
  try {
    const req = createRequire(resolve(import.meta.dirname, '../../client/package.json'));
    return req('socket.io-client').io as IoFactory;
  } catch {
    return null;
  }
}

function emitAck<T>(sock: any, event: string, ...args: unknown[]): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`${event}: sin ack`)), 5000);
    sock.emit(event, ...args, (r: { ok: boolean; data: T; error?: string }) => {
      clearTimeout(t);
      r.ok ? res(r.data) : rej(new Error(r.error));
    });
  });
}

function waitFor<T>(sock: any, event: string, pred: (x: T) => boolean = () => true, ms = 20_000): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => {
      sock.off(event, h);
      rej(new Error(`timeout esperando ${event}`));
    }, ms);
    const h = (x: T) => {
      if (!pred(x)) return;
      clearTimeout(t);
      sock.off(event, h);
      res(x);
    };
    sock.on(event, h);
  });
}

async function connect(io: IoFactory): Promise<any> {
  const s = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
  await waitFor(s, 'connect', () => true, 5000);
  return s;
}

const me = { nickname: `Verifier_${Math.floor(Math.random() * 1e4)}`, elo: 1000 };

async function verifyBotDuel(io: IoFactory, difficulty: 'novato' | 'maestro'): Promise<void> {
  console.log(`\n[ARENA] Duelo completo vs Bot ${difficulty}`);
  const s = await connect(io);
  try {
    const joined = await emitAck<{ code: string }>(s, 'duel:quickBot', { ...me, difficulty });
    check(/^[A-Z0-9]{4}$/.test(joined.code), 'duel:quickBot crea sala', joined.code);

    for (let i = 1; i <= 3; i++) {
      const round = await waitFor<any>(s, 'duel:roundStart', () => true, 10_000);
      const t0 = Date.now();
      const botDone = waitFor<any>(s, 'duel:opponentActivity', (a) => a.slot === 'player2' && a.activity === 'submitted', 15_000);
      const skill = round.challenge.targetWord.toLowerCase();
      const extra = round.challenge.requiredWords?.[0] ? ` junto a ${round.challenge.requiredWords[0]}` : '';
      await emitAck(s, 'duel:submit', { text: `Cuando el proyecto se atascó, usar la ${skill}${extra} nos obligó a replantear el plan y cambió el resultado final del semestre.` });
      await botDone;
      const secs = (Date.now() - t0) / 1000;
      check(secs >= 4.5 && secs <= 9.8, `Ronda ${i} (${round.challenge.mode}): el bot respondió en ${secs.toFixed(1)} s`);
      const result = await waitFor<any>(s, 'duel:roundResult', () => true, 15_000);
      check(!!result.result?.comparativeVerdict, `Ronda ${i}: veredicto`, `${result.result.winner} · ${result.result.comparativeVerdict}`);
      console.log(`       bot: «${result.submissions.player2?.text}» → ${result.result.player2.totalScore}${result.result.player2.antiCalzadorTriggered ? ' [ANTI-CALZADOR]' : ''}`);
      s.emit('duel:nextRound');
    }
    const final = await waitFor<any>(s, 'duel:finished', () => true, 10_000);
    check(!!final, 'Duelo terminado', `ganador ${final.winner}, ELO ${JSON.stringify(final.eloChange)}`);
  } finally {
    s.disconnect();
  }
}

async function verifyReconnects(io: IoFactory): Promise<void> {
  console.log('\n[ARENA] Desconexiones / recargas');

  // a) Creador recarga en la sala de espera: la sala sobrevive y recupera su slot.
  const a = await connect(io);
  const created = await emitAck<{ code: string }>(a, 'room:create', me);
  a.disconnect();
  await new Promise((r) => setTimeout(r, 300));
  const a2 = await connect(io);
  const back = await emitAck<{ slot: string; state: RoomState }>(a2, 'room:join', { ...me, code: created.code });
  check(back.slot === 'player1' && back.state.players.player1?.connected === true, `Recarga en sala de espera ${created.code} → recupera player1`);

  // b) Un rival entra, se va a lo bruto, y otro jugador puede ocupar su lugar.
  const b = await connect(io);
  await emitAck(b, 'room:join', { nickname: 'Rival_A', elo: 1000, code: created.code });
  b.disconnect();
  await waitFor<RoomState>(a2, 'room:state', (st) => st.phase === 'waiting' && !st.players.player2, 3000);
  const c = await connect(io);
  const cJoin = await emitAck<{ slot: string }>(c, 'room:join', { nickname: 'Rival_B', elo: 1000, code: created.code });
  check(cJoin.slot === 'player2', 'Rival se desconecta en espera → otro jugador ocupa el slot');
  c.disconnect();
  a2.disconnect();

  // c) Recarga a mitad de ronda contra el bot: se recupera la ronda en curso.
  const d = await connect(io);
  const quick = await emitAck<{ code: string }>(d, 'duel:quickBot', { ...me, difficulty: 'novato' });
  const r1 = await waitFor<any>(d, 'duel:roundStart', () => true, 10_000);
  d.disconnect();
  await new Promise((r) => setTimeout(r, 500));
  const d2 = await connect(io);
  const rejoin = await emitAck<{ slot: string; state: RoomState }>(d2, 'room:join', { ...me, code: quick.code });
  const sameRound = rejoin.state.rounds[rejoin.state.currentRoundIndex]?.startedAt === r1.startedAt;
  check(rejoin.slot === 'player1' && rejoin.state.phase === 'round' && sameRound, 'Recarga a mitad de ronda → vuelve a la misma ronda');
  d2.emit('room:leave');
  d2.disconnect();

  // d) Eventos basura / sin ack no tumban el servidor.
  const e = await connect(io);
  e.emit('duel:submit', { text: 'hola' }); // sin ack y sin sala
  e.emit('room:join', null, () => {});
  e.emit('duel:typing', 'x');
  await new Promise((r) => setTimeout(r, 300));
  e.disconnect();
  const health = await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false);
  check(health, 'Payloads inválidos / sin ack → el servidor sigue vivo');
}

/* ── main ─────────────────────────────────────────────────────────────────── */

try {
  await verifyRest();
  const io = loadIo();
  if (!io) console.log('\n[ARENA] socket.io-client no encontrado en /client: se omiten las pruebas de sockets.');
  else {
    await verifyReconnects(io);
    await verifyBotDuel(io, process.argv.includes('--maestro') ? 'maestro' : 'novato');
  }
} catch (err) {
  failures++;
  console.error(`\n  ✘ ${(err as Error).message}`);
  if ((err as { cause?: { code?: string } }).cause?.code === 'ECONNREFUSED') console.error(`    ¿Está levantado el servidor en ${BASE}?  →  npm run dev`);
}

console.log(failures ? `\n✘ ${failures} verificación(es) fallaron` : '\n✔ Todo OK');
process.exit(failures ? 1 : 0);

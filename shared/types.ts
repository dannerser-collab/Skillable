/**
 * SKILLABLE — Contrato de tipos compartido entre /server y /client.
 *
 * Reglas:
 *  - Este archivo es la ÚNICA fuente de verdad para las formas de datos que viajan
 *    por REST (`/api/*`) y por Socket.IO.
 *  - Solo tipos + constantes de dominio inmutables (sin lógica, sin imports).
 *  - Cualquier cambio aquí debe compilar en ambos lados (`npm run typecheck`).
 */

/* ════════════════════════════════════════════════════════════════════════════
 * 1. CATÁLOGO DE SKILLS (dataset estático, GET /api/skills)
 * ════════════════════════════════════════════════════════════════════════════ */

export type Branch = 'narrativa' | 'retorica' | 'estrategia';

/** Profundidad del nodo en su rama (1 = raíz). */
export type SkillTier = 1 | 2 | 3;

/** 0 = Bloqueada/No aprendida · 1 = Aprendida (Bronce) · 2 = Afilada (Plata) · 3 = Maestría (Oro). */
export type SkillLevel = 0 | 1 | 2 | 3;

export interface Skill {
  /** Slug sin tildes, en minúsculas. Ej: "mitologia". */
  id: string;
  /** Forma visible con tildes. Ej: "Mitología". */
  word: string;
  branch: Branch;
  tier: SkillTier;
  /** IDs de los nodos padre. Vacío en Tier 1. */
  parentIds: string[];
  /** Coordenadas en % (0-100) dentro del lienzo del árbol. */
  posX: number;
  posY: number;
  definition: string;
  contextTip: string;
  /** Exactamente 2 ejemplos. */
  examples: string[];
  /** Palabras prohibidas para el Modo Tabú (comparación sin tildes/mayúsculas). */
  tabooWords: string[];
  /** Escenarios obligados (Nv.1 / Ronda 1). */
  scenarios: string[];
  /** Palabras absurdas para Conexión Forzada (Nv.3 en Tier 1 / Ronda 3). */
  forcedConnections: string[];
}

export interface BranchMeta {
  id: Branch;
  label: string;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 2. PROGRESO DEL JUGADOR (persistido en el cliente, localStorage)
 * ════════════════════════════════════════════════════════════════════════════ */

export interface UserSkill {
  skillId: string;
  level: SkillLevel;
  /** "Oxidada": requiere re-entrenamiento (repetición espaciada). */
  rusty: boolean;
  /** Epoch ms de la última práctica exitosa (null si nunca). */
  lastPracticedAt: number | null;
  /** "Tu Mejor Frase": oración con mayor puntaje registrada. */
  bestSentence: string | null;
  bestScore: number | null;
  attempts: number;
}

export interface UserProfile {
  nickname: string;
  elo: number;
  /** Indexado por skillId. Las skills ausentes se consideran Nv.0. */
  skills: Record<string, UserSkill>;
}

/** Estado visual derivado de un nodo del árbol. */
export type SkillNodeStatus = 'locked' | 'available' | 'learned' | 'rusty';

/* ════════════════════════════════════════════════════════════════════════════
 * 3. RETOS (Prove Skill / Upgrade / Rondas de duelo)
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * - escenario: Escenario Obligado (Nv.1 · Ronda 1)
 * - tabu:      Modo Tabú (Nv.2 · Ronda 2)
 * - sinergia:  palabra + palabra padre (Nv.3 en Tier 2/3)
 * - conexion:  Conexión Forzada con palabra absurda (Nv.3 en Tier 1 · Ronda 3)
 */
export type ChallengeMode = 'escenario' | 'tabu' | 'sinergia' | 'conexion';

export interface Challenge {
  mode: ChallengeMode;
  skillId: string;
  /** Palabra objetivo visible (con tildes). */
  targetWord: string;
  /** Nivel que se desbloquea al aprobar (solo modo Solo). */
  targetLevel: Exclude<SkillLevel, 0>;
  /** Instrucción mostrada al jugador. */
  prompt: string;
  /** Presente en modo 'tabu'. */
  tabooWords?: string[];
  /** Palabras que además deben aparecer (padre en 'sinergia', absurda en 'conexion'). */
  requiredWords?: string[];
  /** Límite de tiempo en segundos (Nv.3 = 45, duelo = 40). */
  timeLimitSec?: number;
  /** Puntaje mínimo para aprobar. */
  minScore: number;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 4. ÁRBITRO IA
 * ════════════════════════════════════════════════════════════════════════════ */

export type RefereeSource = 'gemini' | 'local';

/** Evaluación de una sola respuesta (común a Solo y Duelo). */
export interface JudgeScores {
  antiCalzadorTriggered: boolean;
  /** 0-100 · peso 40% */
  precisionScore: number;
  /** 0-100 · peso 35% (≤ 20 si antiCalzadorTriggered) */
  contextScore: number;
  /** 0-100 · peso 25% */
  constraintScore: number;
  /** round(p*0.4 + c*0.35 + k*0.25) · ≤ 35 si antiCalzadorTriggered */
  totalScore: number;
  /** Feedback crítico, máx. 2 líneas. */
  feedback: string;
}

/** Esquema estricto del Árbitro en modo Solo. */
export interface JudgeResult extends JudgeScores {
  passed: boolean;
}

export type PlayerSlot = 'player1' | 'player2';
export type RoundWinner = PlayerSlot | 'tie';

/** Esquema estricto del Árbitro en modo Duelo 1v1. */
export interface DuelResult {
  winner: RoundWinner;
  comparativeVerdict: string;
  player1: JudgeScores;
  player2: JudgeScores;
}

/* ── REST: POST /api/judge ─────────────────────────────────────────────────── */

export interface JudgeRequest {
  skillId: string;
  sentence: string;
  /** Nivel al que se intenta subir; determina el modo de reto. */
  targetLevel: Exclude<SkillLevel, 0>;
  /** Para retos con palabra absurda elegida por el cliente (conexion). */
  requiredWords?: string[];
}

export interface JudgeResponse {
  result: JudgeResult;
  challenge: Challenge;
  source: RefereeSource;
}

export interface ApiError {
  error: string;
  code?: string;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 5. ARENA 1v1 — ESTADO DE SALA
 * ════════════════════════════════════════════════════════════════════════════ */

/** Código de sala: 4 caracteres [A-Z0-9]. Ej: "K7X2". */
export type RoomCode = string;

export type BotDifficulty = 'novato' | 'maestro';

export type RoomPhase =
  | 'waiting' //   esperando al segundo jugador
  | 'ready' //     ambos conectados, cuenta regresiva de inicio
  | 'round' //     ronda en curso (40 s)
  | 'judging' //   árbitro evaluando la ronda
  | 'verdict' //   pantalla Cara a Cara
  | 'finished'; // pantalla final del duelo

export type OpponentActivity = 'idle' | 'typing' | 'submitted' | 'disconnected';

export interface RoomPlayer {
  slot: PlayerSlot;
  /** socket.id del jugador, o "bot:<code>" para el bot. */
  id: string;
  nickname: string;
  elo: number;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  connected: boolean;
  ready: boolean;
  activity: OpponentActivity;
}

export interface RoundSubmission {
  text: string;
  /** Epoch ms. */
  submittedAt: number;
}

export interface DuelRound {
  /** 1, 2 o 3. */
  index: 1 | 2 | 3;
  challenge: Challenge;
  /** Epoch ms del servidor en que inició / termina la ronda. */
  startedAt: number;
  endsAt: number;
  submissions: Partial<Record<PlayerSlot, RoundSubmission>>;
  result: DuelResult | null;
  source: RefereeSource | null;
}

export interface DuelFinal {
  winner: RoundWinner;
  /** Rondas ganadas por cada jugador. */
  roundsWon: Record<PlayerSlot, number>;
  /** Suma de totalScore de las 3 rondas. */
  totalPoints: Record<PlayerSlot, number>;
  /** Ej: { player1: +25, player2: -10 } */
  eloChange: Record<PlayerSlot, number>;
  /** skillIds que cada jugador puede subir de nivel tras el duelo. */
  improvedSkills: Record<PlayerSlot, string[]>;
}

export interface RoomState {
  code: RoomCode;
  phase: RoomPhase;
  players: Partial<Record<PlayerSlot, RoomPlayer>>;
  /** Rondas jugadas/en curso (máx. 3). */
  rounds: DuelRound[];
  /** Índice 0-based de la ronda actual, -1 antes de empezar. */
  currentRoundIndex: number;
  /** Skill fijada para la Ronda 1 (desde Expedición o "Mejorar en duelo"). */
  fixedSkillId: string | null;
  final: DuelFinal | null;
  /** Epoch ms del servidor; el cliente lo usa para corregir el desfase de reloj. */
  serverNow: number;
  createdAt: number;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 6. SOCKET.IO — EVENTOS TIPADOS
 *    Uso:
 *      server: new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>()
 *      client: io() as Socket<ServerToClientEvents, ClientToServerEvents>
 * ════════════════════════════════════════════════════════════════════════════ */

export type AckResponse<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: SocketErrorCode };

export type Ack<T = undefined> = (res: AckResponse<T>) => void;

export type SocketErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'INVALID_PHASE'
  | 'NOT_IN_ROOM'
  | 'INVALID_PAYLOAD'
  | 'ALREADY_SUBMITTED';

export interface PlayerIdentity {
  nickname: string;
  elo: number;
}

export interface CreateRoomPayload extends PlayerIdentity {
  fixedSkillId?: string;
}

export interface JoinRoomPayload extends PlayerIdentity {
  code: RoomCode;
}

export interface QuickBotPayload extends PlayerIdentity {
  difficulty: BotDifficulty;
  fixedSkillId?: string;
}

export interface JoinedRoom {
  code: RoomCode;
  slot: PlayerSlot;
  state: RoomState;
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload, ack: Ack<JoinedRoom>) => void;
  'room:join': (payload: JoinRoomPayload, ack: Ack<JoinedRoom>) => void;
  'room:leave': () => void;
  /** Sala de espera: rellena el slot vacío con un bot. */
  'room:addBot': (payload: { difficulty: BotDifficulty }, ack: Ack<RoomState>) => void;
  /** "LISTO PARA PELEAR". */
  'room:ready': () => void;
  /** Crea sala + bot y arranca inmediatamente. */
  'duel:quickBot': (payload: QuickBotPayload, ack: Ack<JoinedRoom>) => void;
  'duel:typing': (isTyping: boolean) => void;
  'duel:submit': (payload: { text: string }, ack: Ack) => void;
  /** Saltar la cuenta regresiva de 8 s del veredicto. */
  'duel:nextRound': () => void;
  'duel:rematch': (ack: Ack<RoomState>) => void;
}

export interface ServerToClientEvents {
  /** Snapshot completo; se emite ante cualquier cambio de la sala. */
  'room:state': (state: RoomState) => void;
  'room:error': (error: { message: string; code?: SocketErrorCode }) => void;
  'duel:roundStart': (round: DuelRound) => void;
  'duel:opponentActivity': (payload: { slot: PlayerSlot; activity: OpponentActivity }) => void;
  'duel:roundResult': (round: DuelRound) => void;
  'duel:finished': (final: DuelFinal) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  roomCode?: RoomCode;
  slot?: PlayerSlot;
  nickname?: string;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 7. CONSTANTES DE DOMINIO (inmutables, compartidas)
 * ════════════════════════════════════════════════════════════════════════════ */

export const SCORE_WEIGHTS = { precision: 0.4, context: 0.35, constraint: 0.25 } as const;

/** Puntaje mínimo para alcanzar cada nivel en modo Solo. */
export const PASS_THRESHOLDS: Record<Exclude<SkillLevel, 0>, number> = { 1: 70, 2: 75, 3: 85 };

/** Topes del filtro Anti-Calzador. */
export const ANTI_CALZADOR_CAPS = { context: 20, total: 35 } as const;

export const MAX_SKILL_LEVEL: SkillLevel = 3;
export const SOLO_MASTERY_TIME_SEC = 45;
export const DUEL_ROUNDS = 3;
export const DUEL_ROUND_SEC = 40;
export const VERDICT_AUTOADVANCE_SEC = 8;
export const READY_COUNTDOWN_SEC = 3;
export const INITIAL_ELO = 1000;
export const ELO_DELTA = { win: 25, loss: -10, tie: 0 } as const;
export const REFEREE_TIMEOUT_MS = 8000;

/** Modo de reto de cada ronda del duelo (índice 1-based). */
export const DUEL_ROUND_MODES: Record<1 | 2 | 3, ChallengeMode> = {
  1: 'escenario',
  2: 'tabu',
  3: 'conexion',
};

/** Paleta obligatoria (CLAUDE.md). */
export const PALETTE = {
  bg: '#14151a',
  surface: '#3c4048', //   Superficies/Tarjetas · Nv.0
  secondary: '#7b8794', // Conexiones · Nv.1
  text: '#f7f2ec', //      Texto principal · Nv.2
  accent: '#f49c3b', //    Energía · Nv.3
  danger: '#e05263', //    Anti-Calzador / Tabú
  success: '#4ade80', //   Aprobado
} as const;

export const LEVEL_COLORS: Record<SkillLevel, string> = {
  0: PALETTE.surface,
  1: PALETTE.secondary,
  2: PALETTE.text,
  3: PALETTE.accent,
};

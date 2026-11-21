import 'dotenv/config';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import type {
  ApiError,
  Challenge,
  ClientToServerEvents,
  InterServerEvents,
  JudgeRequest,
  JudgeResponse,
  ServerToClientEvents,
  SkillLevel,
  SocketData,
} from '../../shared/types.ts';
import { BRANCHES, SKILLS, getSkill } from './data/skills.ts';
import { ArenaManager } from './rooms/ArenaManager.ts';
import { buildSoloChallenge } from './services/challenges.ts';
import { GEMINI_MODEL, isGeminiAvailable, isGeminiConfigured } from './services/gemini.ts';
import { judgeSolo } from './services/referee.ts';

const PORT = Number(process.env.PORT) || 3001;
const MAX_SENTENCE_CHARS = 600;

const app = express();
app.use(cors());
app.use(express.json({ limit: '16kb' }));

function fail(res: Response, status: number, error: string, code?: string): void {
  const body: ApiError = code ? { error, code } : { error };
  res.status(status).json(body);
}

function parseLevel(value: unknown): Exclude<SkillLevel, 0> | null {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 ? n : null;
}

function parseWords(value: unknown): string[] | undefined {
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  if (Array.isArray(value)) {
    const words = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim());
    return words.length ? words : undefined;
  }
  return undefined;
}

/* ── REST ─────────────────────────────────────────────────────────────────── */

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    referee: isGeminiAvailable() ? 'gemini' : 'local',
    geminiConfigured: isGeminiConfigured(),
    model: GEMINI_MODEL,
    rooms: arena.roomCount,
    uptimeSec: Math.round(process.uptime()),
  });
});

app.get('/api/skills', (_req, res) => {
  res.json(SKILLS);
});

app.get('/api/branches', (_req, res) => {
  res.json(BRANCHES);
});

app.get('/api/skills/:id', (req, res) => {
  const skill = getSkill(req.params.id);
  if (!skill) return fail(res, 404, 'Skill no encontrada.', 'SKILL_NOT_FOUND');
  res.json(skill);
});

/**
 * Reto Solo para mostrar ANTES de que el jugador escriba.
 * GET /api/challenge/:skillId/:level[?requiredWord=...]
 * El cliente debe reenviar `requiredWords` (y opcionalmente `scenario`) en POST /api/judge
 * para que el árbitro evalúe exactamente el mismo reto.
 */
app.get('/api/challenge/:skillId/:level', (req, res) => {
  const skill = getSkill(req.params.skillId);
  if (!skill) return fail(res, 404, 'Skill no encontrada.', 'SKILL_NOT_FOUND');
  const level = parseLevel(req.params.level);
  if (!level) return fail(res, 400, 'Nivel objetivo inválido (1, 2 o 3).', 'INVALID_LEVEL');
  const challenge: Challenge = buildSoloChallenge(skill, level, { requiredWords: parseWords(req.query.requiredWord) });
  res.json(challenge);
});

/** Prove Skill / Upgrade (modo Solo). Body: JudgeRequest (validado campo a campo). */
app.post('/api/judge', async (req, res) => {
  const body = (req.body ?? {}) as { [K in keyof JudgeRequest]?: unknown };
  const skill = typeof body.skillId === 'string' ? getSkill(body.skillId) : undefined;
  if (!skill) return fail(res, 404, 'Skill no encontrada.', 'SKILL_NOT_FOUND');
  const level = parseLevel(body.targetLevel);
  if (!level) return fail(res, 400, 'targetLevel debe ser 1, 2 o 3.', 'INVALID_LEVEL');
  const sentence = typeof body.sentence === 'string' ? body.sentence.trim().replace(/\s+/g, ' ') : '';
  if (!sentence) return fail(res, 400, 'Escribe una frase antes de enviarla al árbitro.', 'EMPTY_SENTENCE');
  if (sentence.length > MAX_SENTENCE_CHARS)
    return fail(res, 400, `La frase supera ${MAX_SENTENCE_CHARS} caracteres.`, 'SENTENCE_TOO_LONG');

  const challenge = buildSoloChallenge(skill, level, {
    requiredWords: parseWords(body.requiredWords),
    scenario: typeof body.scenario === 'string' ? body.scenario : undefined,
  });
  const { result, source } = await judgeSolo(challenge, sentence);
  const response: JudgeResponse = { result, challenge, source };
  res.json(response);
});

app.use('/api', (_req, res) => fail(res, 404, 'Endpoint no encontrado.', 'NOT_FOUND'));

/* ── Cliente compilado (opcional: `npm run build` → un solo puerto) ───────── */

const clientDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/socket.io')) return next();
    res.sendFile(resolve(clientDist, 'index.html'));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number }).status;
  if (status === 400) return fail(res, 400, 'JSON inválido.', 'INVALID_JSON');
  console.error('[server]', err);
  fail(res, 500, 'Error interno del servidor.', 'INTERNAL');
});

/* ── HTTP + Socket.IO ─────────────────────────────────────────────────────── */

const httpServer = createServer(app);

export const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: { origin: '*' },
});

const arena = new ArenaManager(io);

// Red de seguridad para la demo en vivo: un error inesperado se registra, no tumba el servidor.
process.on('unhandledRejection', (reason) => console.error('[skillable] promesa rechazada sin manejar:', reason));
process.on('uncaughtException', (err) => console.error('[skillable] excepción no capturada:', err));

httpServer.listen(PORT, () => {
  console.log(`[skillable] server listo en http://localhost:${PORT}`);
  console.log(
    `[skillable] árbitro: ${isGeminiConfigured() ? `Gemini (${GEMINI_MODEL}) + fallback local` : 'Heurístico Local (sin GEMINI_API_KEY)'}`,
  );
});

import {
  ANTI_CALZADOR_CAPS,
  SCORE_WEIGHTS,
  type Challenge,
  type JudgeRequest,
  type JudgeResponse,
  type JudgeResult,
  type Skill,
} from '../../../shared/types.ts';
import { FALLBACK_SKILLS } from '../data/fallbackSkills.ts';
import { normalizeText, validateSentence } from '../utils/textValidation.ts';

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchSkills(): Promise<{
  skills: Skill[];
  source: 'server' | 'fallback';
}> {
  try {
    const response = await fetchWithTimeout('/api/skills', { method: 'GET' }, 4000);
    if (!response.ok) {
      return { skills: FALLBACK_SKILLS, source: 'fallback' };
    }
    const payload: unknown = await response.json();
    const list = Array.isArray(payload)
      ? payload
      : typeof payload === 'object' &&
          payload !== null &&
          'skills' in payload &&
          Array.isArray((payload as { skills: unknown }).skills)
        ? (payload as { skills: Skill[] }).skills
        : null;

    if (list && list.length > 0) {
      return { skills: list as Skill[], source: 'server' };
    }
    return { skills: FALLBACK_SKILLS, source: 'fallback' };
  } catch {
    return { skills: FALLBACK_SKILLS, source: 'fallback' };
  }
}

const ANTI_CALZADOR_PATTERNS = [
  /\bme gusta\b/,
  /\bme encanta\b/,
  /\bestudie\b/,
  /\baprendi\b/,
  /\blei un libro\b/,
  /\blei sobre\b/,
  /\bes una palabra\b/,
  /\bsignifica\b/,
  /\bno se que es\b/,
  /\bpalabra muy\b/,
  /\bhoy vi\b/,
  /\buse la palabra\b/,
];

/**
 * Fallback local determinista mientras /server no exponga POST /api/judge
 * o en caso de fallo de red durante una demo.
 */
function evaluateLocally(sentence: string, challenge: Challenge): JudgeResult {
  const validation = validateSentence(sentence, challenge);
  const norm = normalizeText(sentence).trim();

  if (!validation.hasTargetWord) {
    return {
      passed: false,
      antiCalzadorTriggered: false,
      precisionScore: 18,
      contextScore: 30,
      constraintScore: 0,
      totalScore: 18,
      feedback: `Falta incluir "${challenge.targetWord}" (o una flexión válida) en tu frase.`,
    };
  }

  const hitsCalzadorPattern = ANTI_CALZADOR_PATTERNS.some((rx) => rx.test(norm));
  const isTooShort = validation.wordCount < 7;
  const antiCalzadorTriggered = hitsCalzadorPattern || isTooShort;

  if (antiCalzadorTriggered) {
    const precisionScore = 58;
    const contextScore = Math.min(ANTI_CALZADOR_CAPS.context, isTooShort ? 14 : 18);
    const constraintScore = validation.violatedTabooWords.length > 0 ? 15 : 42;
    const totalScore = Math.min(
      ANTI_CALZADOR_CAPS.total,
      Math.round(
        precisionScore * SCORE_WEIGHTS.precision +
          contextScore * SCORE_WEIGHTS.context +
          constraintScore * SCORE_WEIGHTS.constraint,
      ),
    );
    return {
      passed: false,
      antiCalzadorTriggered: true,
      precisionScore,
      contextScore,
      constraintScore,
      totalScore,
      feedback:
        'Filtro Anti-Calzador: podrías cambiar la palabra por cualquier otra y la frase seguiría igual. Aporta una situación concreta.',
    };
  }

  if (validation.violatedTabooWords.length > 0) {
    return {
      passed: false,
      antiCalzadorTriggered: false,
      precisionScore: 76,
      contextScore: 72,
      constraintScore: 10,
      totalScore: Math.round(
        76 * SCORE_WEIGHTS.precision + 72 * SCORE_WEIGHTS.context + 10 * SCORE_WEIGHTS.constraint,
      ),
      feedback: `Infringiste el Modo Tabú al usar: ${validation.violatedTabooWords.join(', ')}.`,
    };
  }

  if (validation.missingRequiredWords.length > 0) {
    return {
      passed: false,
      antiCalzadorTriggered: false,
      precisionScore: 78,
      contextScore: 74,
      constraintScore: 15,
      totalScore: Math.round(
        78 * SCORE_WEIGHTS.precision + 74 * SCORE_WEIGHTS.context + 15 * SCORE_WEIGHTS.constraint,
      ),
      feedback: `Te faltó integrar la palabra obligatoria: ${validation.missingRequiredWords.join(', ')}.`,
    };
  }

  const richnessBonus = Math.min(18, Math.max(0, validation.wordCount - 8) * 2);
  const precisionScore = Math.min(94, 78 + Math.floor(richnessBonus * 0.7));
  const contextScore = Math.min(95, 76 + richnessBonus);
  const constraintScore = Math.min(94, 82 + Math.floor(richnessBonus * 0.6));
  const totalScore = Math.round(
    precisionScore * SCORE_WEIGHTS.precision +
      contextScore * SCORE_WEIGHTS.context +
      constraintScore * SCORE_WEIGHTS.constraint,
  );
  const passed = totalScore >= challenge.minScore;

  return {
    passed,
    antiCalzadorTriggered: false,
    precisionScore,
    contextScore,
    constraintScore,
    totalScore,
    feedback: passed
      ? `Uso sólido de "${challenge.targetWord}" con contexto específico y cumpliendo todas las restricciones.`
      : `Buen intento, pero necesita mayor densidad contextual para superar el mínimo de ${challenge.minScore} puntos.`,
  };
}

export interface SoloJudgeSubmitInput extends JudgeRequest {
  scenario?: string;
}

export async function submitSoloJudge(
  req: SoloJudgeSubmitInput,
  challenge: Challenge,
): Promise<JudgeResponse> {
  try {
    const response = await fetchWithTimeout(
      '/api/judge',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      },
      10000,
    );

    if (response.ok) {
      const data = (await response.json()) as JudgeResponse;
      if (data && data.result && typeof data.result.totalScore === 'number') {
        return data;
      }
    }
  } catch {
    // Fallback local determinista si el backend no está disponible todavía
  }

  return {
    result: evaluateLocally(req.sentence, challenge),
    challenge,
    source: 'local',
  };
}

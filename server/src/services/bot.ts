import type { BotDifficulty, Challenge, Skill } from '../../../shared/types.ts';
import { BOT_CONEXION_TEMPLATES, getSkill } from '../data/skills.ts';
import { capitalize, containsTerm, pick } from '../lib/text.ts';
import { generateText, isGeminiAvailable } from './gemini.ts';
import { passesHardRules } from './referee.ts';

/** Retraso "humano" del bot: 6–14 s. */
export const BOT_MIN_DELAY_MS = 6_000;
export const BOT_MAX_DELAY_MS = 14_000;
const BOT_GEMINI_TIMEOUT_MS = 5_000;

export const BOT_PROFILES: Record<BotDifficulty, { nickname: string; elo: number }> = {
  novato: { nickname: 'Bot Novato · LEXI-01', elo: 950 },
  maestro: { nickname: 'Bot Maestro · Ω-9000', elo: 1250 },
};

export interface BotPlan {
  /** Ms desde el inicio de la ronda hasta que el bot "empieza a escribir". */
  typingAfterMs: number;
  /** Ms desde el inicio de la ronda hasta que el bot envía. */
  submitAfterMs: number;
  /** Texto de la respuesta (puede resolverse antes o después del retraso). */
  text: Promise<string>;
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

/* ── Fallback: respuestas pre-generadas ──────────────────────────────────── */

function lower(skill: Skill): string {
  return skill.word.toLowerCase();
}

function maestroFallback(skill: Skill, challenge: Challenge): string {
  const candidates: string[] = [];
  if (challenge.mode === 'conexion' || challenge.mode === 'sinergia') {
    const required = challenge.requiredWords?.[0] ?? '';
    if (challenge.mode === 'conexion') {
      candidates.push(BOT_CONEXION_TEMPLATES[skill.id]!.replace('{X}', required));
    } else {
      candidates.push(
        `Sin ${required.toLowerCase()} no hay ${lower(skill)}: ${skill.examples[0]!.charAt(0).toLowerCase()}${skill.examples[0]!.slice(1)}`,
      );
    }
  } else {
    candidates.push(...skill.examples);
  }
  const valid = candidates.filter((c) => passesHardRules(challenge, c));
  return valid.length ? pick(valid) : candidates[0]!;
}

function novatoFallback(skill: Skill, challenge: Challenge): string {
  const w = lower(skill);
  const W = capitalize(w);
  const required = challenge.requiredWords?.[0];
  const roll = Math.random();

  // 45 %: frase calzador (cae en el filtro).
  if (roll < 0.45) {
    const lines = [
      `Me gusta mucho la palabra ${w}.`,
      `Ayer estudié sobre ${w} en clase.`,
      `${W} es una palabra muy interesante.`,
      required ? `${W} y ${required} son cosas que existen.` : `Creo que ${w} es importante.`,
    ];
    if (challenge.mode === 'tabu' && challenge.tabooWords?.length) {
      lines.push(`${W} tiene que ver con ${challenge.tabooWords[0]} y cosas así.`);
    }
    return pick(lines);
  }

  // 35 %: correcta pero plana.
  if (roll < 0.8) {
    const base = pick([
      `Creo que ${w} tiene mucho que ver con la forma en que la gente piensa en general.`,
      `En mi trabajo siempre aparece ${w} cuando hablamos de cosas importantes del día.`,
      `Mi profesor dice que ${w} es clave en muchas situaciones de la vida.`,
    ]);
    return required ? `${base.slice(0, -1)}, incluso con ${required}.` : base;
  }

  // 20 %: decente (el novato también tiene suerte).
  return maestroFallback(skill, challenge);
}

/* ── Gemini ──────────────────────────────────────────────────────────────── */

const BOT_SYSTEM = `Eres un jugador rival en SKILLABLE, un duelo de vocabulario activo en español. Respondes al reto con UNA sola frase en español, sin comillas, sin explicaciones, sin emojis.`;

const PERSONA: Record<BotDifficulty, string> = {
  maestro:
    'Eres un MAESTRO: escribe una frase brillante de 15 a 35 palabras, con un contexto concreto y sorprendente, humor sutil y uso preciso y matizado de la palabra. Cumple todas las restricciones del reto.',
  novato:
    'Eres un NOVATO: escribe una frase de 7 a 14 palabras, gramaticalmente correcta pero bastante genérica y plana, como alguien que conoce la palabra solo de oídas. A veces el contexto es pobre.',
};

async function geminiAnswer(skill: Skill, challenge: Challenge, difficulty: BotDifficulty): Promise<string> {
  const raw = await generateText({
    system: `${BOT_SYSTEM}\n${PERSONA[difficulty]}`,
    timeoutMs: BOT_GEMINI_TIMEOUT_MS,
    temperature: 1,
    prompt: [
      `Palabra objetivo: ${skill.word} (${skill.definition})`,
      `Reto: ${challenge.prompt}`,
      challenge.tabooWords?.length ? `Prohibido usar: ${challenge.tabooWords.join(', ')}` : '',
      challenge.requiredWords?.length ? `Debes incluir también: ${challenge.requiredWords.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });
  const text = raw
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
    ?.replace(/^["'«“]+|["'»”]+$/g, '')
    .trim();
  if (!text || !containsTerm(text, skill.word)) throw new Error('Respuesta del bot inválida');
  if (difficulty === 'maestro' && !passesHardRules(challenge, text)) throw new Error('El bot maestro rompió una regla');
  return text.slice(0, 300);
}

/**
 * Planifica la respuesta del bot para una ronda: cuándo empieza a "escribir",
 * cuándo envía (6–14 s) y qué texto envía (Gemini o fallback pre-generado).
 */
export function planBotAnswer(challenge: Challenge, difficulty: BotDifficulty): BotPlan {
  const skill = getSkill(challenge.skillId);
  if (!skill) throw new Error(`Skill desconocida: ${challenge.skillId}`);

  const submitAfterMs =
    difficulty === 'maestro'
      ? randomBetween(9_000, BOT_MAX_DELAY_MS)
      : randomBetween(BOT_MIN_DELAY_MS, 11_000);
  const typingAfterMs = randomBetween(1_200, 3_000);

  const fallback = () => (difficulty === 'maestro' ? maestroFallback(skill, challenge) : novatoFallback(skill, challenge));
  const text = isGeminiAvailable()
    ? geminiAnswer(skill, challenge, difficulty).catch((err: Error) => {
        console.warn('[bot] Gemini falló, usando respuesta pre-generada:', err.message);
        return fallback();
      })
    : Promise.resolve(fallback());

  return { typingAfterMs, submitAfterMs, text };
}

import type { BotDifficulty, Challenge, Skill } from '../../../shared/types.ts';
import { BOT_CONEXION_TEMPLATES, getSkill } from '../data/skills.ts';
import { capitalize, containsTerm, normalize, pick } from '../lib/text.ts';
import { generateText, isGeminiAvailable } from './gemini.ts';
import { passesHardRules } from './referee.ts';

/**
 * Bot Rival. Objetivos para la demo en vivo:
 *  - Envía SIEMPRE entre 5 y 9 s después de iniciar la ronda (no aburre, no se cuelga).
 *  - Gemini tiene un presupuesto de 3.5 s; si no llega, se usa la respuesta pre-generada.
 *  - `text` nunca rechaza: en el peor caso devuelve una frase de emergencia.
 */
export const BOT_MIN_DELAY_MS = 5_000;
export const BOT_MAX_DELAY_MS = 9_000;
const BOT_GEMINI_TIMEOUT_MS = 3_500;

export const BOT_PROFILES: Record<BotDifficulty, { nickname: string; elo: number }> = {
  novato: { nickname: 'Bot Novato · LEXI-01', elo: 950 },
  maestro: { nickname: 'Bot Maestro · Ω-9000', elo: 1250 },
};

export interface BotPlan {
  /** Ms desde el inicio de la ronda hasta que el bot "empieza a escribir". */
  typingAfterMs: number;
  /** Ms desde el inicio de la ronda hasta que el bot envía (5–9 s). */
  submitAfterMs: number;
  /** Texto de la respuesta. Nunca rechaza y siempre resuelve antes de `submitAfterMs`. */
  text: Promise<string>;
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

/* ── Frases pre-generadas del Maestro (una por escenario, sin palabras tabú) ── */

const MAESTRO_LINES: Record<string, [string, string]> = {
  mitologia: [
    'Jefe, llegué tarde porque el bus pasó por el garaje donde nació la empresa y, por respeto a nuestra mitología fundacional, el conductor hizo un minuto de silencio ritual.',
    'Titular: la mitología de la manzana mordida resiste; aunque el fundador ya no está, cada lanzamiento se celebra como un ritual sagrado de su culto tecnológico.',
  ],
  arquetipo: [
    'Martín es el arquetipo del sabio de la última fila: nunca toma apuntes, pero cuando el profe se traba, todos giran a mirarlo como al mentor de la tribu.',
    'La película se siente predecible porque cada héroe calca un arquetipo eterno: el huérfano elegido, el mentor que muere en el segundo acto y el villano que quería salvar el planeta.',
  ],
  alegoria: [
    'Tu serie no va de zombis: es una alegoría del consumismo, porque los muertos vivientes representan a gente que sigue comprando sin saber por qué.',
    'Esta reunión es una alegoría perfecta de la burocracia: seis personas aprobando una idea que nadie entiende para luego agendar otra reunión que la critique.',
  ],
  cosmovision: [
    'Discuto con mis padres porque nuestra cosmovisión choca: para ellos el sentido de la vida es un puesto fijo hasta jubilarse, para mí es cambiar de rumbo cuando el trabajo deja de enseñarme algo.',
    'Nuestra app no organiza tareas: propone otra cosmovisión del tiempo, donde el día se interpreta por energía y prioridades vitales, no por una lista infinita de pendientes.',
  ],
  catarsis: [
    'Al entregar el último examen, todo el salón gritó al mismo tiempo: fue una catarsis colectiva que soltó tres semanas de tensión acumulada en diez segundos.',
    'Cuando sonó el último coro y miles de personas lloraban abrazadas, el concierto se convirtió en una catarsis que purificó todo el estrés del año.',
  ],
  falacia: [
    'Decir que los videojuegos vuelven violentos a los jóvenes porque un agresor jugaba mucho es una falacia: también desayunaba cereal y nadie culpa a la avena.',
    'Perdiste porque tu argumento era una falacia de manual: que todos tus amigos tengan celular no prueba que tú lo necesites a los nueve años.',
  ],
  sofisma: [
    'Esa crema que rejuvenece diez años en una noche vende un sofisma brillante: premisas con bata de laboratorio que te persuaden de que envejecer es opcional.',
    'Mi sofisma para la mensualidad fue impecable: si invierten en mi felicidad hoy, ahorran en terapia mañana, así que subirme el dinero es en realidad un recorte de gastos.',
  ],
  dialectica: [
    'Resolvimos el conflicto con pura dialéctica: Ana defendía hacerlo rápido, Luis hacerlo perfecto, y de ese choque salió una síntesis que ninguno habría propuesto solo.',
    'Su relación funciona como una dialéctica: ella es caos y él es orden, y cada choque entre posturas opuestas termina en una versión mejor de los dos.',
  ],
  hegemonia: [
    'Todos usan el mismo celular por la hegemonía de una marca que convirtió su logo en consenso: quien llega con otro queda fuera del grupo sin que nadie lo decida en voz alta.',
    'En las fiestas la hegemonía del reguetón no se vota: el que maneja el parlante impone su cultura musical y el resto la acepta como algo natural.',
  ],
  pragmatismo: [
    'Cenar cereal tres noches seguidas fue pragmatismo puro: cero platos que lavar, cinco minutos de preparación y el único resultado que importaba, no morir de hambre.',
    'Necesitamos pragmatismo: menos teoría sobre el lanzamiento ideal y más soluciones concretas, porque una versión imperfecta en el mercado vale más que diez planes perfectos en una carpeta.',
  ],
  paradigma: [
    'Profe, los orales rompen el paradigma de memorizar para vomitar en papel: obligan a razonar en vivo, que es justo lo que el trabajo real nos va a pedir.',
    'No hacemos buses más bonitos: derribamos el paradigma de horarios fijos y rutas rígidas para que el transporte público llegue a ti como un servicio a demanda.',
  ],
  heuristica: [
    'Mi heurística para elegir serie el domingo es simple: si en diez minutos nadie ha muerto ni se ha enamorado, la quito sin culpa, aunque me pierda alguna obra maestra.',
    'Usa una heurística sencilla en la entrevista: antes de responder, piensa qué problema concreto del puesto resolverías tú; no es infalible, pero decide rápido y suele acertar.',
  ],
  sinergia: [
    'Las papas fritas con helado tienen una sinergia injusta: por separado son normales, pero combinadas multiplican el antojo de cualquiera.',
    'Jefe, déjeme trabajar con Marketing: mi análisis de datos y su creatividad generarían una sinergia donde el resultado conjunto supera lo que cada área logra por separado.',
  ],
  resiliencia: [
    'Mi peor semana del año probó mi resiliencia: perdí el celular, reprobé un parcial y me dejaron, pero me adapté tan rápido que el viernes ya ayudaba a otros a recuperarse.',
    'Nuestra infraestructura tiene resiliencia real: si un servidor cae a las tres de la mañana, el sistema se recupera solo y ningún usuario nota la crisis.',
  ],
  escalabilidad: [
    'Mis postres caseros no tienen escalabilidad: cada torta depende de mi horno y de mi abuela, y con diez sucursales necesitaríamos clonar a las dos.',
    'El sistema de inscripciones tiene cero escalabilidad: aguanta a veinte usuarios, pero cuando entran cinco mil a la vez el servidor colapsa y todos terminamos haciendo fila.',
  ],
};

function lower(skill: Skill): string {
  return skill.word.toLowerCase();
}

function maestroFallback(skill: Skill, challenge: Challenge): string {
  const required = challenge.requiredWords?.[0] ?? '';
  const lines = MAESTRO_LINES[skill.id] ?? [skill.examples[0]!, skill.examples[1]!];
  const candidates: string[] = [];

  if (challenge.mode === 'conexion') {
    const tpl = BOT_CONEXION_TEMPLATES[skill.id];
    if (tpl) candidates.push(tpl.replace('{X}', required));
  } else if (challenge.mode === 'sinergia') {
    candidates.push(`Sin ${required.toLowerCase()} no hay ${lower(skill)}: ${lines[0].charAt(0).toLowerCase()}${lines[0].slice(1)}`);
  } else if (challenge.mode === 'escenario') {
    // La frase que responde EXACTAMENTE al escenario mostrado.
    const idx = skill.scenarios.findIndex((s) => normalize(s) === normalize(challenge.prompt));
    candidates.push(idx >= 0 ? lines[idx as 0 | 1] : pick(lines));
  } else {
    candidates.push(...lines);
  }
  candidates.push(...skill.examples);

  const valid = candidates.filter((c) => passesHardRules(challenge, c));
  return valid[0] ?? candidates[0]!;
}

function novatoFallback(skill: Skill, challenge: Challenge): string {
  const w = lower(skill);
  const W = capitalize(w);
  const required = challenge.requiredWords?.[0];
  const roll = Math.random();

  // 40 %: frase calzador con gracia (cae en el filtro y da show en la demo).
  if (roll < 0.4) {
    const lines = [
      `Me gusta mucho la palabra ${w}, suena elegante.`,
      `Ayer leí sobre ${w} en un post de LinkedIn.`,
      `${W} es importante, lo dijo mi tío en Navidad.`,
      `Mi profesor habló de ${w} pero yo estaba dormido.`,
      required ? `${W} y ${required} son dos cosas que existen.` : `Creo que ${w} es algo muy importante en la vida.`,
    ];
    if (challenge.mode === 'tabu' && challenge.tabooWords?.length) {
      lines.push(`${W} tiene que ver con ${challenge.tabooWords[0]} y cosas así, creo.`);
    }
    return pick(lines);
  }

  // 35 %: correcta pero plana.
  if (roll < 0.75) {
    const base = pick([
      `Creo que ${w} tiene mucho que ver con la forma en que la gente piensa en general.`,
      `En mi trabajo siempre aparece ${w} cuando hablamos de cosas del día a día.`,
      `Mi profesor dice que ${w} es clave en muchas situaciones de la vida.`,
    ]);
    return required ? `${base.slice(0, -1)}, incluso con ${required}.` : base;
  }

  // 25 %: decente (el novato también tiene suerte).
  return maestroFallback(skill, challenge);
}

function fallbackAnswer(skill: Skill, challenge: Challenge, difficulty: BotDifficulty): string {
  try {
    return difficulty === 'maestro' ? maestroFallback(skill, challenge) : novatoFallback(skill, challenge);
  } catch (err) {
    console.warn('[bot] fallback falló:', (err as Error).message);
    return skill.examples[0] ?? `Uso ${lower(skill)} con todo el contexto que me cabe en cuarenta segundos.`;
  }
}

/* ── Gemini ──────────────────────────────────────────────────────────────── */

const BOT_SYSTEM = `Eres un jugador rival en SKILLABLE, un duelo de vocabulario activo en español. Respondes al reto con UNA sola frase en español, sin comillas, sin explicaciones, sin emojis. Responde rápido: nada de rodeos.`;

const PERSONA: Record<BotDifficulty, string> = {
  maestro:
    'Eres un MAESTRO creativo: escribe una frase de 15 a 35 palabras que responda EXACTAMENTE al escenario, con una situación concreta (personas, causa, consecuencia), un giro inesperado o humor sutil y un uso preciso y matizado de la palabra. Cumple todas las restricciones del reto.',
  novato:
    'Eres un NOVATO simpático: escribe una frase de 7 a 14 palabras, gramaticalmente correcta pero genérica, como alguien que conoce la palabra solo de oídas. A veces solo la mencionas sin contexto real (por ejemplo "leí sobre X" o "X es importante"), con un toque de humor involuntario.',
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

/** Resuelve con Gemini si llega a tiempo; si no, con el fallback. Nunca rechaza. */
function resolveAnswer(skill: Skill, challenge: Challenge, difficulty: BotDifficulty, deadlineMs: number): Promise<string> {
  const fallback = () => fallbackAnswer(skill, challenge, difficulty);
  if (!isGeminiAvailable()) return Promise.resolve(fallback());

  return new Promise<string>((resolve) => {
    let settled = false;
    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(text);
    };
    const timer = setTimeout(() => {
      console.warn('[bot] Gemini no respondió a tiempo, usando respuesta pre-generada');
      finish(fallback());
    }, deadlineMs);
    geminiAnswer(skill, challenge, difficulty).then(finish, (err: Error) => {
      console.warn('[bot] Gemini falló, usando respuesta pre-generada:', err.message);
      finish(fallback());
    });
  });
}

/**
 * Planifica la respuesta del bot para una ronda: cuándo empieza a "escribir",
 * cuándo envía (5–9 s; el Maestro "piensa" un poco más) y qué texto envía.
 */
export function planBotAnswer(challenge: Challenge, difficulty: BotDifficulty): BotPlan {
  const submitAfterMs =
    difficulty === 'maestro' ? randomBetween(6_500, BOT_MAX_DELAY_MS) : randomBetween(BOT_MIN_DELAY_MS, 7_500);
  const typingAfterMs = randomBetween(1_000, 2_500);

  const skill = getSkill(challenge.skillId);
  const text = skill
    ? resolveAnswer(skill, challenge, difficulty, Math.min(BOT_GEMINI_TIMEOUT_MS + 300, submitAfterMs - 500))
    : Promise.resolve(`Respondo con «${challenge.targetWord}» y que el árbitro decida.`);

  return { typingAfterMs, submitAfterMs, text };
}

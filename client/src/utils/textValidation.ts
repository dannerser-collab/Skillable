import {
  PASS_THRESHOLDS,
  SOLO_MASTERY_TIME_SEC,
  type Challenge,
  type Skill,
  type SkillLevel,
  type SkillNodeStatus,
  type UserSkill,
} from '../../../shared/types.ts';

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Comprueba si una palabra o una flexión simple (plural/género) aparece
 * respetando fronteras de palabra, ignorando tildes y mayúsculas.
 */
export function containsWordVariant(sentence: string, word: string): boolean {
  const normSentence = normalizeText(sentence).trim();
  const normWord = normalizeText(word).trim();
  if (!normSentence || !normWord) return false;

  const variants = new Set<string>([normWord]);
  if (normWord.endsWith('o') || normWord.endsWith('a')) {
    const stem = normWord.slice(0, -1);
    variants.add(`${stem}o`);
    variants.add(`${stem}a`);
    variants.add(`${stem}os`);
    variants.add(`${stem}as`);
  } else {
    variants.add(`${normWord}s`);
    variants.add(`${normWord}es`);
  }

  for (const variant of variants) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(variant)}([^a-z0-9]|$)`, 'i');
    if (pattern.test(normSentence)) return true;
  }
  return false;
}

export interface LiveValidationResult {
  hasTargetWord: boolean;
  violatedTabooWords: string[];
  matchedRequiredWords: string[];
  missingRequiredWords: string[];
  wordCount: number;
  charCount: number;
}

export function validateSentence(
  sentence: string,
  challenge: Pick<Challenge, 'targetWord' | 'tabooWords' | 'requiredWords'>,
): LiveValidationResult {
  const trimmed = sentence.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const hasTargetWord = containsWordVariant(sentence, challenge.targetWord);

  const violatedTabooWords = (challenge.tabooWords ?? []).filter((taboo) =>
    containsWordVariant(sentence, taboo),
  );

  const required = challenge.requiredWords ?? [];
  const matchedRequiredWords: string[] = [];
  const missingRequiredWords: string[] = [];

  for (const req of required) {
    if (containsWordVariant(sentence, req)) matchedRequiredWords.push(req);
    else missingRequiredWords.push(req);
  }

  return {
    hasTargetWord,
    violatedTabooWords,
    matchedRequiredWords,
    missingRequiredWords,
    wordCount: words.length,
    charCount: sentence.length,
  };
}

export interface DerivedSkillStatus {
  status: SkillNodeStatus;
  level: SkillLevel;
  rusty: boolean;
  missingParents: Skill[];
}

export function getSkillNodeStatus(
  skill: Skill,
  userSkills: Record<string, UserSkill>,
  allSkills: Skill[],
): DerivedSkillStatus {
  const record = userSkills[skill.id];
  const level: SkillLevel = record?.level ?? 0;
  const rusty = Boolean(record?.rusty && level >= 1);

  if (level >= 1) {
    return {
      status: rusty ? 'rusty' : 'learned',
      level,
      rusty,
      missingParents: [],
    };
  }

  const missingParents = skill.parentIds
    .map((pid) => allSkills.find((s) => s.id === pid))
    .filter((parent): parent is Skill => {
      if (!parent) return false;
      return (userSkills[parent.id]?.level ?? 0) < 1;
    });

  return {
    status: missingParents.length === 0 ? 'available' : 'locked',
    level: 0,
    rusty: false,
    missingParents,
  };
}

export function getNextSoloTargetLevel(
  currentLevel: SkillLevel,
  rusty: boolean,
): Exclude<SkillLevel, 0> {
  if (rusty && currentLevel >= 1) {
    return currentLevel as Exclude<SkillLevel, 0>;
  }
  if (currentLevel === 0) return 1;
  if (currentLevel === 1) return 2;
  return 3;
}

export function buildSoloChallenge(
  skill: Skill,
  targetLevel: Exclude<SkillLevel, 0>,
  allSkills: Skill[],
): Challenge {
  if (targetLevel === 1) {
    const scenario =
      skill.scenarios[Math.floor(Math.random() * skill.scenarios.length)] ??
      `Escribe una oración original donde "${skill.word}" aporte sentido real al contexto.`;
    return {
      mode: 'escenario',
      skillId: skill.id,
      targetWord: skill.word,
      targetLevel: 1,
      prompt: scenario,
      minScore: PASS_THRESHOLDS[1],
    };
  }

  if (targetLevel === 2) {
    return {
      mode: 'tabu',
      skillId: skill.id,
      targetWord: skill.word,
      targetLevel: 2,
      prompt: `Demuestra dominio de "${skill.word}" en una escena concreta sin utilizar ninguna de las palabras prohibidas.`,
      tabooWords: skill.tabooWords,
      minScore: PASS_THRESHOLDS[2],
    };
  }

  if (skill.parentIds.length > 0) {
    const parentId = skill.parentIds[0];
    const parentSkill = allSkills.find((s) => s.id === parentId);
    const parentWord = parentSkill?.word ?? parentId;
    return {
      mode: 'sinergia',
      skillId: skill.id,
      targetWord: skill.word,
      targetLevel: 3,
      prompt: `Reto de Sinergia: teje "${skill.word}" junto con su skill raíz "${parentWord}" en una sola oración natural y memorable.`,
      requiredWords: [parentWord],
      timeLimitSec: SOLO_MASTERY_TIME_SEC,
      minScore: PASS_THRESHOLDS[3],
    };
  }

  const forcedWord =
    skill.forcedConnections[Math.floor(Math.random() * skill.forcedConnections.length)] ??
    'algoritmo';

  return {
    mode: 'conexion',
    skillId: skill.id,
    targetWord: skill.word,
    targetLevel: 3,
    prompt: `Conexión Forzada: integra "${skill.word}" y la palabra inesperada "${forcedWord}" en una misma frase con sentido ingenioso.`,
    requiredWords: [forcedWord],
    timeLimitSec: SOLO_MASTERY_TIME_SEC,
    minScore: PASS_THRESHOLDS[3],
  };
}

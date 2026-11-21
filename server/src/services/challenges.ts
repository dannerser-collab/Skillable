import {
  DUEL_ROUND_MODES,
  DUEL_ROUND_SEC,
  PASS_THRESHOLDS,
  SOLO_MASTERY_TIME_SEC,
  type Challenge,
  type ChallengeMode,
  type Skill,
  type SkillLevel,
} from '../../../shared/types.ts';
import { getSkill } from '../data/skills.ts';
import { normalize, pick } from '../lib/text.ts';

type TargetLevel = Exclude<SkillLevel, 0>;

export interface ChallengeOptions {
  /** Palabras obligatorias propuestas por el cliente (se validan contra el catálogo). */
  requiredWords?: string[];
  /** Escenario concreto mostrado al jugador (se valida contra skill.scenarios). */
  scenario?: string;
}

const MODE_LEVEL: Record<ChallengeMode, TargetLevel> = {
  escenario: 1,
  tabu: 2,
  sinergia: 3,
  conexion: 3,
};

function matchOne(candidates: string[], proposed?: string[]): string | undefined {
  if (!proposed?.length) return undefined;
  const wanted = new Set(proposed.map(normalize));
  return candidates.find((c) => wanted.has(normalize(c)));
}

function scenarioChallenge(skill: Skill, level: TargetLevel, opts: ChallengeOptions): Challenge {
  const valid = opts.scenario && skill.scenarios.find((s) => normalize(s) === normalize(opts.scenario!));
  return {
    mode: 'escenario',
    skillId: skill.id,
    targetWord: skill.word,
    targetLevel: level,
    prompt: valid || pick(skill.scenarios),
    minScore: PASS_THRESHOLDS[level],
  };
}

function tabooChallenge(skill: Skill, level: TargetLevel): Challenge {
  return {
    mode: 'tabu',
    skillId: skill.id,
    targetWord: skill.word,
    targetLevel: level,
    prompt: `Modo Tabú: usa «${skill.word}» en una frase con contexto real SIN decir ${skill.tabooWords
      .map((w) => `«${w}»`)
      .join(', ')}.`,
    tabooWords: [...skill.tabooWords],
    minScore: PASS_THRESHOLDS[level],
  };
}

function connectionChallenge(skill: Skill, level: TargetLevel, opts: ChallengeOptions, timeLimitSec: number): Challenge {
  const absurd = matchOne(skill.forcedConnections, opts.requiredWords) ?? pick(skill.forcedConnections);
  return {
    mode: 'conexion',
    skillId: skill.id,
    targetWord: skill.word,
    targetLevel: level,
    prompt: `Conexión Forzada: usa «${skill.word}» y «${absurd}» en la misma frase, con sentido y contexto.`,
    requiredWords: [absurd],
    timeLimitSec,
    minScore: PASS_THRESHOLDS[level],
  };
}

function synergyChallenge(skill: Skill, level: TargetLevel, opts: ChallengeOptions): Challenge {
  const parents = skill.parentIds.map((id) => getSkill(id)!.word);
  const parent = matchOne(parents, opts.requiredWords) ?? pick(parents);
  return {
    mode: 'sinergia',
    skillId: skill.id,
    targetWord: skill.word,
    targetLevel: level,
    prompt: `Reto de Sinergia: usa «${skill.word}» junto a su skill padre «${parent}» en la misma frase, demostrando cómo se relacionan.`,
    requiredWords: [parent],
    timeLimitSec: SOLO_MASTERY_TIME_SEC,
    minScore: PASS_THRESHOLDS[level],
  };
}

/** Reto de Prove Skill / Upgrade (modo Solo) según el nivel objetivo. */
export function buildSoloChallenge(skill: Skill, targetLevel: TargetLevel, opts: ChallengeOptions = {}): Challenge {
  switch (targetLevel) {
    case 1:
      return scenarioChallenge(skill, 1, opts);
    case 2:
      return tabooChallenge(skill, 2);
    case 3:
      return skill.tier === 1
        ? connectionChallenge(skill, 3, opts, SOLO_MASTERY_TIME_SEC)
        : synergyChallenge(skill, 3, opts);
  }
}

/** Reto de una ronda del duelo 1v1 (1: Escenario · 2: Tabú · 3: Conexión Forzada). */
export function buildDuelChallenge(skill: Skill, roundIndex: 1 | 2 | 3): Challenge {
  const mode = DUEL_ROUND_MODES[roundIndex];
  const level = MODE_LEVEL[mode];
  let challenge: Challenge;
  if (mode === 'escenario') challenge = scenarioChallenge(skill, level, {});
  else if (mode === 'tabu') challenge = tabooChallenge(skill, level);
  else if (mode === 'sinergia') challenge = synergyChallenge(skill, level, {});
  else challenge = connectionChallenge(skill, level, {}, DUEL_ROUND_SEC);
  return { ...challenge, timeLimitSec: DUEL_ROUND_SEC };
}

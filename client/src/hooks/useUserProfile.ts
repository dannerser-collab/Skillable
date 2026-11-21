import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_ELO,
  MAX_SKILL_LEVEL,
  type DuelFinal,
  type DuelRound,
  type JudgeResult,
  type PlayerSlot,
  type SkillLevel,
  type UserProfile,
  type UserSkill,
} from '../../../shared/types.ts';

const PROFILE_STORAGE_KEY = 'skillable_profile_v1';
const CUSTOM_NICKNAME_KEY = 'skillable_nickname_custom_v1';

export type DemoPresetId = 'pitch' | 'starter_rusty' | 'reset' | 'toggle_rusty';

function createDefaultNickname(): string {
  const num = Math.floor(10 + Math.random() * 90);
  return `LexiRunner_${num}`;
}

function createStarterSkills(): Record<string, UserSkill> {
  const fourDaysAgo = Date.now() - 4 * 24 * 60 * 60 * 1000;
  return {
    paradigma: {
      skillId: 'paradigma',
      level: 1,
      rusty: true,
      lastPracticedAt: fourDaysAgo,
      bestSentence:
        'El trabajo remoto rompió el paradigma de medir el rendimiento por horas frente a una pantalla.',
      bestScore: 78,
      attempts: 1,
    },
  };
}

function createPitchDemoSkills(): Record<string, UserSkill> {
  const now = Date.now();
  return {
    mitologia: {
      skillId: 'mitologia',
      level: 2,
      rusty: false,
      lastPracticedAt: now - 3600_000,
      bestSentence:
        'La startup construyó toda una mitología alrededor de su primer garaje para inspirar al equipo.',
      bestScore: 91,
      attempts: 2,
    },
    arquetipo: {
      skillId: 'arquetipo',
      level: 1,
      rusty: false,
      lastPracticedAt: now - 7200_000,
      bestSentence:
        'Con su pizarra llena de flechas, encarnaba el arquetipo del estratega obsesionado con cada detalle.',
      bestScore: 84,
      attempts: 1,
    },
    falacia: {
      skillId: 'falacia',
      level: 3,
      rusty: false,
      lastPracticedAt: now - 1800_000,
      bestSentence:
        'Asegurar que la pizza enfría el código por una caída del servidor es una falacia digna de meme.',
      bestScore: 94,
      attempts: 3,
    },
    paradigma: {
      skillId: 'paradigma',
      level: 1,
      rusty: true,
      lastPracticedAt: now - 5 * 24 * 60 * 60 * 1000,
      bestSentence:
        'El trabajo remoto rompió el paradigma de medir el rendimiento por horas frente a una pantalla.',
      bestScore: 78,
      attempts: 1,
    },
  };
}

function loadInitialProfile(): UserProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      if (parsed && typeof parsed.nickname === 'string' && typeof parsed.elo === 'number') {
        return {
          nickname: parsed.nickname.trim() || createDefaultNickname(),
          elo: parsed.elo,
          skills: parsed.skills && typeof parsed.skills === 'object' ? parsed.skills : {},
        };
      }
    }
  } catch {
    // Ignorar errores de almacenamiento corrupto
  }

  return {
    nickname: createDefaultNickname(),
    elo: INITIAL_ELO,
    skills: createStarterSkills(),
  };
}

function loadCustomNicknameFlag(): boolean {
  try {
    return window.localStorage.getItem(CUSTOM_NICKNAME_KEY) === '1';
  } catch {
    return false;
  }
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(loadInitialProfile);
  const [hasCustomNickname, setHasCustomNickname] = useState<boolean>(loadCustomNicknameFlag);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignorar errores de cuota
    }
  }, [profile]);

  const setNickname = useCallback((nextName: string) => {
    const cleaned = nextName.replace(/\s+/g, ' ').trim().slice(0, 20);
    if (cleaned.length < 2) return;
    setProfile((prev) => ({ ...prev, nickname: cleaned }));
    setHasCustomNickname(true);
    try {
      window.localStorage.setItem(CUSTOM_NICKNAME_KEY, '1');
    } catch {
      // Ignorar
    }
  }, []);

  const recordSoloResult = useCallback(
    (
      skillId: string,
      targetLevel: Exclude<SkillLevel, 0>,
      sentence: string,
      result: JudgeResult,
    ) => {
      setProfile((prev) => {
        const existing = prev.skills[skillId];
        const attempts = (existing?.attempts ?? 0) + 1;

        if (!result.passed) {
          if (!existing) {
            return {
              ...prev,
              skills: {
                ...prev.skills,
                [skillId]: {
                  skillId,
                  level: 0,
                  rusty: false,
                  lastPracticedAt: null,
                  bestSentence: null,
                  bestScore: null,
                  attempts,
                },
              },
            };
          }
          return {
            ...prev,
            skills: {
              ...prev.skills,
              [skillId]: { ...existing, attempts },
            },
          };
        }

        const nextLevel = Math.max(existing?.level ?? 0, targetLevel) as SkillLevel;
        const shouldReplaceBest =
          existing?.bestScore == null || result.totalScore >= existing.bestScore;

        return {
          ...prev,
          skills: {
            ...prev.skills,
            [skillId]: {
              skillId,
              level: nextLevel,
              rusty: false,
              lastPracticedAt: Date.now(),
              bestSentence: shouldReplaceBest ? sentence.trim() : existing?.bestSentence ?? sentence.trim(),
              bestScore: shouldReplaceBest ? result.totalScore : existing?.bestScore ?? result.totalScore,
              attempts,
            },
          },
        };
      });
    },
    [],
  );

  const applyDuelFinal = useCallback(
    (final: DuelFinal, mySlot: PlayerSlot, rounds: DuelRound[]) => {
      setProfile((prev) => {
        const nextElo = Math.max(100, prev.elo + (final.eloChange[mySlot] ?? 0));
        const nextSkills = { ...prev.skills };
        const improved = final.improvedSkills[mySlot] ?? [];

        for (const skillId of improved) {
          const existing = nextSkills[skillId];
          const prevLevel = existing?.level ?? 0;
          const nextLevel = Math.min(MAX_SKILL_LEVEL, prevLevel + 1) as SkillLevel;
          const matchingRound = rounds.find((r) => r.challenge.skillId === skillId);
          const roundSubmission = matchingRound?.submissions[mySlot]?.text ?? null;
          const roundScore = matchingRound?.result?.[mySlot]?.totalScore ?? null;
          const isBetter =
            roundScore !== null &&
            (existing?.bestScore == null || roundScore >= existing.bestScore);

          nextSkills[skillId] = {
            skillId,
            level: nextLevel,
            rusty: false,
            lastPracticedAt: Date.now(),
            bestSentence: isBetter && roundSubmission ? roundSubmission : existing?.bestSentence ?? roundSubmission,
            bestScore: isBetter ? roundScore : existing?.bestScore ?? roundScore,
            attempts: (existing?.attempts ?? 0) + 1,
          };
        }

        return {
          ...prev,
          elo: nextElo,
          skills: nextSkills,
        };
      });
    },
    [],
  );

  const applyDemoPreset = useCallback((preset: DemoPresetId) => {
    setProfile((prev) => {
      if (preset === 'pitch') {
        return { ...prev, elo: 1085, skills: createPitchDemoSkills() };
      }
      if (preset === 'starter_rusty') {
        return { ...prev, elo: INITIAL_ELO, skills: createStarterSkills() };
      }
      if (preset === 'reset') {
        return { ...prev, elo: INITIAL_ELO, skills: {} };
      }
      // toggle_rusty sobre 'paradigma'
      const current = prev.skills.paradigma;
      if (!current || current.level === 0) {
        return {
          ...prev,
          skills: { ...prev.skills, ...createStarterSkills() },
        };
      }
      return {
        ...prev,
        skills: {
          ...prev.skills,
          paradigma: {
            ...current,
            rusty: !current.rusty,
          },
        },
      };
    });
  }, []);

  const unlockedCount = useMemo(
    () => Object.values(profile.skills).filter((s) => s.level >= 1).length,
    [profile.skills],
  );

  const masteredCount = useMemo(
    () => Object.values(profile.skills).filter((s) => s.level === 3).length,
    [profile.skills],
  );

  return {
    profile,
    unlockedCount,
    masteredCount,
    hasCustomNickname,
    setNickname,
    recordSoloResult,
    applyDuelFinal,
    applyDemoPreset,
  };
}

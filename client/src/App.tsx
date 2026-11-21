import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { MAX_SKILL_LEVEL, type JudgeResponse, type Skill, type SkillLevel } from '../../shared/types.ts';
import { InteractiveBackground } from './components/InteractiveBackground.tsx';
import { Navbar, type AppView } from './components/Navbar.tsx';
import { ProveSkillModal } from './components/ProveSkillModal.tsx';
import { FALLBACK_SKILLS } from './data/fallbackSkills.ts';
import { useUserProfile } from './hooks/useUserProfile.ts';
import { fetchSkills } from './services/api.ts';
import { ArenaView } from './views/ArenaView.tsx';
import { ExpeditionView } from './views/ExpeditionView.tsx';
import { HomeView } from './views/HomeView.tsx';
import { SkillTreeView, type TreeFilter } from './views/SkillTreeView.tsx';

function getInitialRoute(): { view: AppView; pendingRoomCode: string | null } {
  if (typeof window === 'undefined') {
    return { view: 'inicio', pendingRoomCode: null };
  }
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room')?.trim().toUpperCase() ?? null;
  if (roomParam && /^[A-Z0-9]{4}$/.test(roomParam)) {
    return { view: 'arena', pendingRoomCode: roomParam };
  }

  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash === 'arbol' || hash === 'expedicion' || hash === 'arena' || hash === 'inicio') {
    return { view: hash, pendingRoomCode: null };
  }
  return { view: 'inicio', pendingRoomCode: null };
}

function pickRandomSkill(skills: Skill[], excludeId?: string): Skill {
  const pool = excludeId && skills.length > 1 ? skills.filter((s) => s.id !== excludeId) : skills;
  return pool[Math.floor(Math.random() * pool.length)] ?? skills[0];
}

function fireMasteryConfetti() {
  const colors = ['#f49c3b', '#f7f2ec', '#7b8794', '#4ade80'];
  window.setTimeout(() => {
    confetti({
      particleCount: 42,
      angle: 60,
      spread: 55,
      origin: { x: 0.12, y: 0.65 },
      scalar: 0.9,
      zIndex: 60,
      colors,
    });
    confetti({
      particleCount: 42,
      angle: 120,
      spread: 55,
      origin: { x: 0.88, y: 0.65 },
      scalar: 0.9,
      zIndex: 60,
      colors,
    });
  }, 220);
}

export default function App() {
  const initialRoute = useState(getInitialRoute)[0];
  const [activeView, setActiveView] = useState<AppView>(initialRoute.view);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(
    initialRoute.pendingRoomCode,
  );

  const [skills, setSkills] = useState<Skill[]>(FALLBACK_SKILLS);
  const [treeFilter, setTreeFilter] = useState<TreeFilter>('all');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [recentlyUpgradedSkillId, setRecentlyUpgradedSkillId] = useState<string | null>(null);
  const [recentlyUpgradedLevel, setRecentlyUpgradedLevel] = useState<SkillLevel | null>(null);
  const upgradeTimerRef = useRef<number | null>(null);

  // Estado de Expedición Aleatoria
  const [expeditionSkillId, setExpeditionSkillId] = useState<string>(
    () => pickRandomSkill(FALLBACK_SKILLS).id,
  );
  const [expeditionRollKey, setExpeditionRollKey] = useState<number>(1);

  // Estado de Prove Skill Modal
  const [proveTarget, setProveTarget] = useState<{
    skill: Skill;
    targetLevel: Exclude<SkillLevel, 0>;
    isRepair: boolean;
  } | null>(null);

  // Palabra fijada para Ronda 1 al ir a Arena 1v1 desde Árbol o Expedición
  const [duelFixedSkillId, setDuelFixedSkillId] = useState<string | null>(null);

  const {
    profile,
    unlockedCount,
    hasCustomNickname,
    setNickname,
    recordSoloResult,
    applyDuelFinal,
    applyDemoPreset,
  } = useUserProfile();

  useEffect(() => {
    let active = true;
    void fetchSkills().then(({ skills: loaded }) => {
      if (!active || loaded.length === 0) return;
      setSkills(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const navigateTo = useCallback((view: AppView) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      const nextUrl =
        view === 'arena' && window.location.search
          ? `${window.location.pathname}${window.location.search}#${view}`
          : `${window.location.pathname}#${view}`;
      window.history.replaceState(null, '', nextUrl);
    }
  }, []);

  const handleOpenRandomExpedition = useCallback(() => {
    const picked = pickRandomSkill(skills, expeditionSkillId);
    setExpeditionSkillId(picked.id);
    setExpeditionRollKey((k) => k + 1);
    navigateTo('expedicion');
  }, [expeditionSkillId, navigateTo, skills]);

  const handleOpenProveSkill = useCallback(
    (skill: Skill, targetLevel: Exclude<SkillLevel, 0>) => {
      const existing = profile.skills[skill.id];
      const isRepair = Boolean(existing?.rusty) || existing?.level === 3;
      setProveTarget({ skill, targetLevel, isRepair });
    },
    [profile.skills],
  );

  const handleStartDuelWithSkill = useCallback(
    (skillId: string) => {
      setDuelFixedSkillId(skillId);
      navigateTo('arena');
    },
    [navigateTo],
  );

  const handleSoloResultRecorded = useCallback(
    (
      skillId: string,
      targetLevel: Exclude<SkillLevel, 0>,
      sentence: string,
      response: JudgeResponse,
    ) => {
      recordSoloResult(skillId, targetLevel, sentence, response.result);
    },
    [recordSoloResult],
  );

  const triggerUpgradedHighlight = useCallback((skillId: string, level: SkillLevel) => {
    if (upgradeTimerRef.current !== null) {
      window.clearTimeout(upgradeTimerRef.current);
    }
    setRecentlyUpgradedSkillId(skillId);
    setRecentlyUpgradedLevel(level);
    if (level === MAX_SKILL_LEVEL) {
      fireMasteryConfetti();
    }
    upgradeTimerRef.current = window.setTimeout(() => {
      setRecentlyUpgradedSkillId(null);
      setRecentlyUpgradedLevel(null);
      upgradeTimerRef.current = null;
    }, 3800);
  }, []);

  const handleClaimLevelUp = useCallback(
    (skill: Skill, achievedLevel: Exclude<SkillLevel, 0>) => {
      setProveTarget(null);
      setTreeFilter(skill.branch);
      setSelectedSkillId(skill.id);
      navigateTo('arbol');
      triggerUpgradedHighlight(skill.id, achievedLevel);
    },
    [navigateTo, triggerUpgradedHighlight],
  );

  const handleGoToTreeFromDuel = useCallback(
    (skillId?: string) => {
      if (skillId) {
        const found = skills.find((s) => s.id === skillId);
        if (found) {
          const nextLevel = Math.min(
            MAX_SKILL_LEVEL,
            profile.skills[found.id]?.level ?? 0,
          ) as SkillLevel;
          setTreeFilter(found.branch);
          setSelectedSkillId(found.id);
          triggerUpgradedHighlight(found.id, nextLevel || 1);
        }
      }
      navigateTo('arbol');
    },
    [navigateTo, profile.skills, skills, triggerUpgradedHighlight],
  );

  const currentExpeditionSkill =
    skills.find((s) => s.id === expeditionSkillId) ?? skills[0];

  return (
    <div className="relative min-h-screen bg-base text-ink selection:bg-accent selection:text-base">
      <InteractiveBackground />

      <Navbar
        activeView={activeView}
        onNavigate={navigateTo}
        nickname={profile.nickname}
        onChangeNickname={setNickname}
        elo={profile.elo}
        unlockedCount={unlockedCount}
        totalSkills={skills.length}
        onApplyPreset={applyDemoPreset}
      />

      <main className="relative z-10 min-h-screen">
        <AnimatePresence mode="wait">
          {activeView === 'inicio' && (
            <HomeView
              key="inicio"
              nickname={profile.nickname}
              onChangeNickname={setNickname}
              elo={profile.elo}
              unlockedCount={unlockedCount}
              totalSkills={skills.length}
              onExploreTree={() => navigateTo('arbol')}
              onRandomExpedition={handleOpenRandomExpedition}
              onEnterArena={() => navigateTo('arena')}
            />
          )}

          {activeView === 'arbol' && (
            <SkillTreeView
              key="arbol"
              skills={skills}
              userSkills={profile.skills}
              activeFilter={treeFilter}
              onChangeFilter={setTreeFilter}
              selectedSkillId={selectedSkillId}
              onSelectSkill={setSelectedSkillId}
              recentlyUpgradedSkillId={recentlyUpgradedSkillId}
              recentlyUpgradedLevel={recentlyUpgradedLevel}
              onProveSkill={handleOpenProveSkill}
              onStartDuelWithSkill={handleStartDuelWithSkill}
            />
          )}

          {activeView === 'expedicion' && currentExpeditionSkill && (
            <ExpeditionView
              key="expedicion"
              skills={skills}
              currentSkill={currentExpeditionSkill}
              rollKey={expeditionRollKey}
              userSkills={profile.skills}
              onRollNewSkill={handleOpenRandomExpedition}
              onProveSkill={handleOpenProveSkill}
              onDuelWithSkill={handleStartDuelWithSkill}
            />
          )}

          {activeView === 'arena' && (
            <ArenaView
              key="arena"
              profile={profile}
              skills={skills}
              fixedSkillId={duelFixedSkillId}
              onClearFixedSkill={() => setDuelFixedSkillId(null)}
              pendingRoomCode={pendingRoomCode}
              onClearPendingRoom={() => {
                setPendingRoomCode(null);
                if (typeof window !== 'undefined' && window.location.search) {
                  window.history.replaceState(null, '', `${window.location.pathname}#arena`);
                }
              }}
              hasCustomNickname={hasCustomNickname}
              onSetNickname={setNickname}
              onApplyDuelFinal={applyDuelFinal}
              onGoToTreeWithSkill={handleGoToTreeFromDuel}
            />
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {proveTarget && (
          <ProveSkillModal
            skill={proveTarget.skill}
            targetLevel={proveTarget.targetLevel}
            isRepair={proveTarget.isRepair}
            allSkills={skills}
            onClose={() => setProveTarget(null)}
            onResultRecorded={handleSoloResultRecorded}
            onClaimLevelUp={handleClaimLevelUp}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

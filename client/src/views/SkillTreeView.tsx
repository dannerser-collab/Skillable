import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Cpu,
  Lock,
  MessageSquareQuote,
  Scale,
  Sparkles,
  Star,
  Swords,
  Wrench,
  X,
} from 'lucide-react';
import {
  LEVEL_COLORS,
  PALETTE,
  type Branch,
  type Skill,
  type SkillLevel,
  type UserSkill,
} from '../../../shared/types.ts';
import { BRANCH_META } from '../data/fallbackSkills.ts';
import { ScrambleText } from '../components/ScrambleText.tsx';
import { getNextSoloTargetLevel, getSkillNodeStatus } from '../utils/textValidation.ts';

export type TreeFilter = 'all' | Branch;

const BRANCH_ICONS: Record<Branch, typeof BookOpen> = {
  narrativa: BookOpen,
  retorica: Scale,
  estrategia: Cpu,
};

const LEVEL_NAMES: Record<SkillLevel, string> = {
  0: 'Nv.0 Bloqueada',
  1: 'Nv.1 Aprendida',
  2: 'Nv.2 Afilada',
  3: 'Nv.3 Maestría',
};

function getNodePosition(skill: Skill, filter: TreeFilter): { x: number; y: number } {
  if (filter !== 'all') {
    return { x: skill.posX, y: skill.posY };
  }
  const branchIndex = BRANCH_META.findIndex((b) => b.id === skill.branch);
  const col = branchIndex >= 0 ? branchIndex : 0;
  return {
    x: col * 33.333 + (skill.posX / 100) * 33.333,
    y: skill.posY,
  };
}

export function SkillTreeView({
  skills,
  userSkills,
  activeFilter,
  onChangeFilter,
  selectedSkillId,
  onSelectSkill,
  recentlyUpgradedSkillId,
  onProveSkill,
  onStartDuelWithSkill,
}: {
  skills: Skill[];
  userSkills: Record<string, UserSkill>;
  activeFilter: TreeFilter;
  onChangeFilter: (filter: TreeFilter) => void;
  selectedSkillId: string | null;
  onSelectSkill: (skillId: string | null) => void;
  recentlyUpgradedSkillId: string | null;
  onProveSkill: (skill: Skill, targetLevel: Exclude<SkillLevel, 0>) => void;
  onStartDuelWithSkill: (skillId: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const visibleSkills = useMemo(
    () => (activeFilter === 'all' ? skills : skills.filter((s) => s.branch === activeFilter)),
    [activeFilter, skills],
  );

  const selectedSkill = useMemo(
    () => skills.find((s) => s.id === selectedSkillId) ?? null,
    [selectedSkillId, skills],
  );

  const progress = useMemo(() => {
    const total = visibleSkills.length;
    const unlocked = visibleSkills.filter((s) => (userSkills[s.id]?.level ?? 0) >= 1).length;
    const levelSum = visibleSkills.reduce((acc, s) => acc + (userSkills[s.id]?.level ?? 0), 0);
    const maxSum = Math.max(1, total * 3);
    return {
      total,
      unlocked,
      masteryPct: Math.round((levelSum / maxSum) * 100),
    };
  }, [userSkills, visibleSkills]);

  const edges = useMemo(() => {
    const map = new Map(visibleSkills.map((s) => [s.id, s]));
    const list: Array<{
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
      parentUnlocked: boolean;
      childUnlocked: boolean;
      parentLevel: SkillLevel;
      highlighted: boolean;
    }> = [];

    for (const child of visibleSkills) {
      const childPos = getNodePosition(child, activeFilter);
      const childLevel = userSkills[child.id]?.level ?? 0;

      for (const parentId of child.parentIds) {
        const parent = map.get(parentId);
        if (!parent) continue;
        const parentPos = getNodePosition(parent, activeFilter);
        const parentLevel = userSkills[parent.id]?.level ?? 0;
        const highlighted =
          hoveredId === child.id ||
          hoveredId === parent.id ||
          selectedSkillId === child.id ||
          selectedSkillId === parent.id;

        list.push({
          id: `${parent.id}->${child.id}`,
          from: parentPos,
          to: childPos,
          parentUnlocked: parentLevel >= 1,
          childUnlocked: childLevel >= 1,
          parentLevel,
          highlighted,
        });
      }
    }
    return list;
  }, [activeFilter, hoveredId, selectedSkillId, userSkills, visibleSkills]);

  const selectedDerived = selectedSkill
    ? getSkillNodeStatus(selectedSkill, userSkills, skills)
    : null;
  const selectedRecord = selectedSkill ? userSkills[selectedSkill.id] : undefined;

  return (
    <motion.section
      key="tree-view"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 md:pt-24"
    >
      {/* Cabecera de controles */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeFilter('all')}
            className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              activeFilter === 'all'
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-surface bg-surface/35 text-secondary hover:border-secondary hover:text-ink'
            }`}
          >
            Todas ({skills.filter((s) => (userSkills[s.id]?.level ?? 0) >= 1).length}/{skills.length})
          </button>

          {BRANCH_META.map((branch) => {
            const Icon = BRANCH_ICONS[branch.id];
            const branchSkills = skills.filter((s) => s.branch === branch.id);
            const branchUnlocked = branchSkills.filter(
              (s) => (userSkills[s.id]?.level ?? 0) >= 1,
            ).length;
            const active = activeFilter === branch.id;

            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => onChangeFilter(branch.id)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-surface bg-surface/35 text-secondary hover:border-secondary hover:text-ink'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{branch.label}</span>
                <span className="font-mono text-[11px] opacity-80">
                  {branchUnlocked}/{branchSkills.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Barra de progreso y leyenda */}
        <div className="glass-panel flex flex-wrap items-center gap-4 rounded-xl px-4 py-2.5">
          <div className="min-w-[165px]">
            <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
              <span className="text-secondary">
                {progress.unlocked}/{progress.total} desbloqueadas
              </span>
              <span className="font-semibold text-accent">{progress.masteryPct}% maestría</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${progress.masteryPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-surface" /> Nv.0
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-secondary" /> Nv.1
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ink" /> Nv.2
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Nv.3
            </span>
            <span className="inline-flex items-center gap-1.5 text-danger">
              <span className="h-2.5 w-2.5 rounded-full bg-danger" /> Oxidada
            </span>
          </div>
        </div>
      </div>

      {/* Lienzo + Drawer lateral */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div
          className={`glass-panel relative overflow-x-auto rounded-2xl p-4 sm:p-5 ${
            selectedSkill ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'
          }`}
        >
          <div
            className={`relative h-[520px] sm:h-[560px] ${
              activeFilter === 'all' ? 'min-w-[740px]' : 'min-w-[320px]'
            }`}
          >
            {/* Cabeceras de columnas en vista Todas */}
            {activeFilter === 'all' && (
              <div className="pointer-events-none absolute inset-x-0 top-1 z-10 grid grid-cols-3 text-center">
                {BRANCH_META.map((branch) => (
                  <span
                    key={branch.id}
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary"
                  >
                    {branch.label}
                  </span>
                ))}
              </div>
            )}

            {/* Conectores SVG reactivos */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {edges.map((edge) => {
                const midY = (edge.from.y + edge.to.y) / 2;
                const d = `M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${midY}, ${edge.to.x} ${midY}, ${edge.to.x} ${edge.to.y}`;

                if (!edge.parentUnlocked) {
                  return (
                    <path
                      key={edge.id}
                      d={d}
                      fill="none"
                      stroke={PALETTE.surface}
                      strokeWidth={edge.highlighted ? 0.65 : 0.45}
                      strokeDasharray="1.4 1.4"
                      opacity={0.78}
                    />
                  );
                }

                const activeStroke =
                  edge.childUnlocked || edge.parentLevel === 3
                    ? PALETTE.accent
                    : edge.parentLevel === 2
                      ? PALETTE.text
                      : PALETTE.secondary;

                return (
                  <g key={edge.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke={activeStroke}
                      strokeWidth={edge.highlighted ? 0.9 : 0.6}
                      opacity={0.35}
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke={activeStroke}
                      strokeWidth={edge.highlighted ? 0.7 : 0.45}
                      strokeDasharray="2.2 1.8"
                      className="animate-dash-flow"
                      opacity={0.95}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Nodos */}
            {visibleSkills.map((skill) => {
              const pos = getNodePosition(skill, activeFilter);
              const derived = getSkillNodeStatus(skill, userSkills, skills);
              const isSelected = selectedSkillId === skill.id;
              const isRecentlyUpgraded = recentlyUpgradedSkillId === skill.id;
              const levelColor = LEVEL_COLORS[derived.level];

              const borderClass =
                derived.status === 'rusty'
                  ? 'border-danger/85 bg-base/95 shadow-[0_0_22px_rgba(224,82,99,0.28)]'
                  : derived.level === 3
                    ? 'border-accent bg-base/95 shadow-[0_0_24px_rgba(244,156,59,0.3)]'
                    : derived.level === 2
                      ? 'border-ink/85 bg-base/95 shadow-[0_0_16px_rgba(247,242,236,0.16)]'
                      : derived.level === 1
                        ? 'border-secondary bg-base/95'
                        : derived.status === 'available'
                          ? 'border-dashed border-secondary/80 bg-base/90 hover:border-accent'
                          : 'border-surface/90 bg-base/80 opacity-75';

              return (
                <div
                  key={skill.id}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                >
                  {isRecentlyUpgraded && (
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0.9 }}
                      animate={{ scale: 2.1, opacity: 0 }}
                      transition={{ duration: 1.1, repeat: 2 }}
                      className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-accent"
                    />
                  )}

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onMouseEnter={() => setHoveredId(skill.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onSelectSkill(skill.id)}
                    className={`relative flex min-w-[126px] flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 text-center transition ${borderClass} ${
                      isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-base' : ''
                    }`}
                  >
                    {/* Badge Oxidada */}
                    {derived.rusty && (
                      <span className="absolute -top-2.5 right-2 inline-flex items-center gap-1 rounded-full border border-danger/70 bg-base px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-danger">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Oxidada
                      </span>
                    )}

                    {/* Indicador de estado / estrellas */}
                    <div className="flex items-center gap-1">
                      {derived.status === 'locked' && (
                        <Lock className="h-3.5 w-3.5 text-secondary" />
                      )}
                      {derived.status === 'available' && (
                        <Sparkles className="h-3.5 w-3.5 text-accent" />
                      )}
                      {derived.level >= 1 && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((idx) => (
                            <Star
                              key={idx}
                              className="h-3 w-3"
                              style={{
                                color: idx <= derived.level ? levelColor : PALETTE.surface,
                                fill: idx <= derived.level ? levelColor : 'transparent',
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <span className="font-mono text-[10px] text-secondary">T{skill.tier}</span>
                    </div>

                    <span className="font-display text-sm font-bold tracking-wide text-ink">
                      {skill.word}
                    </span>

                    <span
                      className="font-mono text-[10px]"
                      style={{
                        color:
                          derived.status === 'rusty'
                            ? PALETTE.danger
                            : derived.level >= 1
                              ? levelColor
                              : PALETTE.secondary,
                      }}
                    >
                      {derived.status === 'available'
                        ? 'Disponible'
                        : derived.status === 'locked'
                          ? 'Bloqueada'
                          : `Nv.${derived.level}`}
                    </span>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Lateral (Drawer) */}
        <AnimatePresence mode="wait">
          {selectedSkill && selectedDerived && (
            <motion.aside
              key={selectedSkill.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.2 }}
              className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-5 lg:col-span-5 xl:col-span-4"
            >
              <div className="space-y-4">
                {/* Cabecera del nodo */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-surface bg-surface/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-secondary">
                        {BRANCH_META.find((b) => b.id === selectedSkill.branch)?.label} · Tier{' '}
                        {selectedSkill.tier}
                      </span>
                      {selectedDerived.rusty && (
                        <span className="rounded-md border border-danger/60 bg-danger/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-danger">
                          Oxidada
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-2xl font-bold tracking-wide text-ink">
                      <ScrambleText text={selectedSkill.word} triggerKey={selectedSkill.id} />
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectSkill(null)}
                    aria-label="Cerrar panel de skill"
                    className="rounded-lg border border-surface p-1.5 text-secondary transition hover:border-secondary hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Barra de maestría */}
                <div className="rounded-xl border border-surface/80 bg-base/60 p-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span
                      className="font-mono font-semibold"
                      style={{ color: LEVEL_COLORS[selectedDerived.level] }}
                    >
                      {LEVEL_NAMES[selectedDerived.level]}
                    </span>
                    <span className="font-mono text-secondary">{selectedDerived.level}/3</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className="h-1.5 rounded-full transition-colors"
                        style={{
                          backgroundColor:
                            step <= selectedDerived.level
                              ? LEVEL_COLORS[selectedDerived.level]
                              : PALETTE.surface,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Definición & Tip */}
                <div className="space-y-2.5 text-sm">
                  <div>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-secondary">
                      Definición
                    </p>
                    <p className="leading-relaxed text-ink/95">{selectedSkill.definition}</p>
                  </div>

                  <div className="rounded-xl border border-surface/80 bg-surface/25 p-3">
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-accent">
                      Tip de Contexto
                    </p>
                    <p className="text-xs leading-relaxed text-ink/85">{selectedSkill.contextTip}</p>
                  </div>

                  <div>
                    <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-secondary">
                      Ejemplos de uso vivo
                    </p>
                    <ul className="space-y-1.5 text-xs leading-relaxed text-secondary">
                      {selectedSkill.examples.map((ex) => (
                        <li key={ex} className="rounded-lg border border-surface/60 bg-base/50 p-2.5 text-ink/85">
                          “{ex}”
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tu Mejor Frase (cuando level >= 1) */}
                {selectedDerived.level >= 1 && (
                  <div className="rounded-xl border border-accent/45 bg-accent/10 p-3.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                        <MessageSquareQuote className="h-3.5 w-3.5" />
                        Tu Mejor Frase
                      </span>
                      {selectedRecord?.bestScore != null && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-base/75 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink">
                          <Award className="h-3 w-3 text-accent" />
                          {selectedRecord.bestScore}/100
                        </span>
                      )}
                    </div>
                    <p className="text-xs italic leading-relaxed text-ink">
                      “{selectedRecord?.bestSentence || selectedSkill.examples[0]}”
                    </p>
                  </div>
                )}
              </div>

              {/* Botones según estado */}
              <div className="space-y-2 border-t border-surface/80 pt-3">
                {selectedDerived.status === 'locked' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled
                      className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-surface bg-surface/40 px-4 py-2.5 text-xs font-semibold text-secondary"
                    >
                      <Lock className="h-4 w-4" />
                      <span>
                        Desbloquea primero:{' '}
                        {selectedDerived.missingParents.map((p) => p.word).join(', ')}
                      </span>
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDerived.missingParents.map((parent) => (
                        <button
                          key={parent.id}
                          type="button"
                          onClick={() => onSelectSkill(parent.id)}
                          className="rounded-lg border border-secondary/50 px-2.5 py-1 font-mono text-[11px] text-ink transition hover:border-accent hover:text-accent"
                        >
                          Ir a {parent.word} →
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDerived.status === 'available' && (
                  <button
                    type="button"
                    onClick={() => onProveSkill(selectedSkill, 1)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110"
                  >
                    <Sparkles className="h-4 w-4" />
                    PROVE SKILL — DESBLOQUEAR NV. 1
                  </button>
                )}

                {(selectedDerived.level === 1 || selectedDerived.level === 2) &&
                  !selectedDerived.rusty && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          onProveSkill(
                            selectedSkill,
                            getNextSoloTargetLevel(selectedDerived.level, false),
                          )
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110"
                      >
                        <Sparkles className="h-4 w-4" />
                        UPGRADE SKILL (SOLO) · NV. {selectedDerived.level + 1}
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartDuelWithSkill(selectedSkill.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-secondary/60 bg-surface/35 px-4 py-2.5 font-display text-xs font-bold tracking-wider text-ink transition hover:border-accent hover:text-accent"
                      >
                        <Swords className="h-4 w-4" />
                        MEJORAR EN DUELO 1v1
                      </button>
                    </>
                  )}

                {(selectedDerived.rusty || selectedDerived.level === 3) && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onProveSkill(
                          selectedSkill,
                          getNextSoloTargetLevel(selectedDerived.level, selectedDerived.rusty),
                        )
                      }
                      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-display text-xs font-bold tracking-wider transition ${
                        selectedDerived.rusty
                          ? 'bg-danger text-ink hover:brightness-110'
                          : 'border border-accent/60 bg-accent/15 text-accent hover:bg-accent/25'
                      }`}
                    >
                      <Wrench className="h-4 w-4" />
                      REPARAR / RE-ENTRENAR SKILL
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartDuelWithSkill(selectedSkill.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-secondary/60 bg-surface/35 px-4 py-2 font-display text-xs font-bold tracking-wider text-ink transition hover:border-accent hover:text-accent"
                    >
                      <Swords className="h-4 w-4" />
                      LLEVAR A DUELO 1v1
                    </button>
                  </>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

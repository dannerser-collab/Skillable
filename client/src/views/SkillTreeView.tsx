import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Combine,
  Compass,
  Cpu,
  Crown,
  Drama,
  Feather,
  Flame,
  Ghost,
  Globe,
  Hammer,
  Landmark,
  Lightbulb,
  Lock,
  MessageSquareQuote,
  MessagesSquare,
  Scale,
  Shield,
  Shuffle,
  Sparkles,
  Swords,
  TrendingUp,
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
import { STUDIO_EASE, VIEW_TRANSITION, VIEW_VARIANTS } from '../utils/motion.ts';
import {
  BRANCH_LABEL_TOP,
  buildBranchLayout,
  buildFullLayout,
  LABEL_SIDES,
  labelGap,
  type LabelSide,
  type Pt,
  type TreeLayout,
} from '../utils/skillTreeLayout.ts';
import {
  getNextSoloTargetLevel,
  getSkillNodeStatus,
  type DerivedSkillStatus,
} from '../utils/textValidation.ts';

export type TreeFilter = 'all' | Branch;

type IconType = typeof BookOpen;

const BRANCH_ICONS: Record<Branch, IconType> = {
  narrativa: BookOpen,
  retorica: Scale,
  estrategia: Cpu,
};

const SKILL_ICONS: Record<string, IconType> = {
  mitologia: Landmark,
  arquetipo: Drama,
  alegoria: Feather,
  cosmovision: Globe,
  catarsis: Flame,
  falacia: Shuffle,
  sofisma: Ghost,
  dialectica: MessagesSquare,
  hegemonia: Crown,
  pragmatismo: Hammer,
  paradigma: Lightbulb,
  heuristica: Compass,
  sinergia: Combine,
  resiliencia: Shield,
  escalabilidad: TrendingUp,
};

const LEVEL_NAMES: Record<SkillLevel, string> = {
  0: 'Nv.0 Bloqueada',
  1: 'Nv.1 Aprendida',
  2: 'Nv.2 Afilada',
  3: 'Nv.3 Maestría',
};

/** Ancho a partir del cual "Todas" se dibuja como una sola constelación de 3 ramas. */
const FULL_LAYOUT_MIN_WIDTH = 960;
const BRANCH_STAGE_MAX_SCALE = 1.2;

const STAR = '#f7f2ec';
const LOCKED_LINE = 'rgba(247, 242, 236, 0.22)';

/* ── Utilidades ──────────────────────────────────────────────────────────── */

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 1200 : Math.max(320, window.innerWidth - 48),
  );
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Nodo + todos sus ancestros y descendientes (la "constelación" conectada). */
function connectedSet(skills: Skill[], id: string | null): Set<string> {
  const set = new Set<string>();
  if (!id) return set;
  const byId = new Map(skills.map((s) => [s.id, s]));
  const children = new Map<string, string[]>();
  for (const s of skills) {
    for (const p of s.parentIds) children.set(p, [...(children.get(p) ?? []), s.id]);
  }
  const walk = (start: string, next: (x: string) => string[]) => {
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop()!;
      if (set.has(cur) && cur !== start) continue;
      set.add(cur);
      stack.push(...next(cur).filter((n) => !set.has(n)));
    }
  };
  walk(id, (x) => byId.get(x)?.parentIds ?? []);
  walk(id, (x) => children.get(x) ?? []);
  return set;
}

const toPoints = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/* ── Vista principal ─────────────────────────────────────────────────────── */

export function SkillTreeView({
  skills,
  userSkills,
  activeFilter,
  onChangeFilter,
  selectedSkillId,
  onSelectSkill,
  recentlyUpgradedSkillId,
  recentlyUpgradedLevel,
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
  recentlyUpgradedLevel?: SkillLevel | null;
  onProveSkill: (skill: Skill, targetLevel: Exclude<SkillLevel, 0>) => void;
  onStartDuelWithSkill: (skillId: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [canvasRef, canvasWidth] = useElementWidth<HTMLDivElement>();

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
    return { total, unlocked, masteryPct: Math.round((levelSum / maxSum) * 100) };
  }, [userSkills, visibleSkills]);

  const branchIds = useMemo(() => BRANCH_META.map((b) => b.id), []);
  const useFull = activeFilter === 'all' && canvasWidth >= FULL_LAYOUT_MIN_WIDTH;

  // Escenarios a dibujar: una constelación completa, o una por rama (filtro / móvil).
  const stages = useMemo(() => {
    if (useFull) return [{ key: 'full', layout: buildFullLayout(skills, branchIds) }];
    const list = activeFilter === 'all' ? branchIds : [activeFilter];
    return list.map((b) => ({ key: b, layout: buildBranchLayout(skills, b) }));
  }, [activeFilter, branchIds, skills, useFull]);

  const focus = useMemo(() => connectedSet(skills, hoveredId), [hoveredId, skills]);

  const derivedById = useMemo(() => {
    const map: Record<string, DerivedSkillStatus> = {};
    for (const s of skills) map[s.id] = getSkillNodeStatus(s, userSkills, skills);
    return map;
  }, [skills, userSkills]);

  // Drawer en el lado opuesto al nodo seleccionado (escritorio) para no taparlo.
  const drawerSide: 'left' | 'right' = useMemo(() => {
    if (!selectedSkillId || stages.length !== 1) return 'right';
    const { layout } = stages[0];
    const p = layout.nodes[selectedSkillId];
    return p && p.x > layout.stage.width / 2 ? 'left' : 'right';
  }, [selectedSkillId, stages]);

  useEffect(() => {
    if (!selectedSkillId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelectSkill(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelectSkill, selectedSkillId]);

  return (
    <motion.section
      key="tree-view"
      variants={VIEW_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={VIEW_TRANSITION}
      className="mx-auto max-w-7xl px-4 pb-8 pt-28 sm:px-6 md:pb-6 md:pt-20"
    >
      {/* Cabecera de controles */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
            const branchUnlocked = branchSkills.filter((s) => (userSkills[s.id]?.level ?? 0) >= 1).length;
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

        {/* Progreso + leyenda de estados */}
        <div className="glass-panel flex flex-wrap items-center gap-4 rounded-xl px-4 py-2.5">
          <div className="min-w-[195px]">
            <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[11px]">
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
              <span className="h-3 w-3 rounded-full bg-accent shadow-[0_0_8px_rgba(244,156,59,0.7)]" /> Dominada
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-accent bg-base" /> Disponible
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-secondary/50 bg-base/60" /> Bloqueada
            </span>
            <span className="inline-flex items-center gap-1.5 text-danger">
              <span className="h-3 w-3 rounded-full border-2 border-danger bg-base" /> Oxidada
            </span>
          </div>
        </div>
      </div>

      {/* Lienzo de constelación */}
      <div className="relative overflow-visible border-0 bg-transparent p-3 shadow-none sm:p-5">
        <div ref={canvasRef} className="flex w-full flex-col items-center gap-6">
          {stages.map(({ key, layout }, stageIndex) => {
            const scale = useFull
              ? Math.min(1, canvasWidth / layout.stage.width)
              : Math.min(BRANCH_STAGE_MAX_SCALE, canvasWidth / layout.stage.width);
            return (
              <ConstellationStage
                key={`${key}-${activeFilter}`}
                layout={layout}
                scale={scale}
                stageIndex={stageIndex}
                skills={skills}
                userSkills={userSkills}
                derivedById={derivedById}
                focus={focus}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                selectedSkillId={selectedSkillId}
                onSelect={(id) => onSelectSkill(id)}
                recentlyUpgradedSkillId={recentlyUpgradedSkillId}
                recentlyUpgradedLevel={recentlyUpgradedLevel ?? null}
              />
            );
          })}
        </div>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <SkillDrawer
            skill={selectedSkill}
            derived={selectedSkill ? derivedById[selectedSkill.id] : null}
            record={selectedSkill ? userSkills[selectedSkill.id] : undefined}
            side={drawerSide}
            onClose={() => onSelectSkill(null)}
            onSelectSkill={onSelectSkill}
            onProveSkill={onProveSkill}
            onStartDuelWithSkill={onStartDuelWithSkill}
          />,
          document.body,
        )}
    </motion.section>
  );
}

/* ── Escenario de constelación (SVG + nodos HTML en el mismo sistema) ────── */

function ConstellationStage({
  layout,
  scale,
  stageIndex,
  skills,
  userSkills,
  derivedById,
  focus,
  hoveredId,
  onHover,
  selectedSkillId,
  onSelect,
  recentlyUpgradedSkillId,
  recentlyUpgradedLevel,
}: {
  layout: TreeLayout;
  scale: number;
  stageIndex: number;
  skills: Skill[];
  userSkills: Record<string, UserSkill>;
  derivedById: Record<string, DerivedSkillStatus>;
  focus: Set<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  selectedSkillId: string | null;
  onSelect: (id: string) => void;
  recentlyUpgradedSkillId: string | null;
  recentlyUpgradedLevel: SkillLevel | null;
}) {
  const uid = useId().replace(/:/g, '');
  const glowId = `glow-${uid}`;
  const haloId = `halo-${uid}`;
  const { stage } = layout;

  const stageSkills = useMemo(() => skills.filter((s) => layout.nodes[s.id]), [layout.nodes, skills]);
  const level = (id: string) => userSkills[id]?.level ?? 0;
  const hasFocus = focus.size > 0;
  const hoveredBranch = hoveredId ? skills.find((s) => s.id === hoveredId)?.branch : undefined;
  const baseDelay = 0.12 + stageIndex * 0.12;
  const tierDelay = (tier: number) => baseDelay + 0.18 + (tier - 1) * 0.16;

  const edgeState = (e: TreeLayout['edges'][number]) => {
    let active: boolean;
    let inFocus: boolean;
    if (e.parentId && e.childId) {
      active = level(e.parentId) >= 1;
      inFocus = focus.has(e.parentId) && focus.has(e.childId);
    } else if (e.childId) {
      active = level(e.childId) >= 1;
      inFocus = focus.has(e.childId);
    } else {
      active = stageSkills.some((s) => s.branch === e.branch && level(s.id) >= 1);
      inFocus = hoveredBranch === e.branch;
    }
    return { active, inFocus, dim: hasFocus && !inFocus };
  };

  const childTier = (e: TreeLayout['edges'][number]) =>
    e.childId ? (skills.find((s) => s.id === e.childId)?.tier ?? 1) : 0;

  return (
    <div className="relative" style={{ width: stage.width * scale, height: stage.height * scale }}>
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: stage.width, height: stage.height, transform: `scale(${scale})` }}
      >
        <svg
          width={stage.width}
          height={stage.height}
          viewBox={`0 0 ${stage.width} ${stage.height}`}
          className="pointer-events-none absolute inset-0 z-0 overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id={haloId}>
              <stop offset="0%" stopColor={STAR} stopOpacity="0.9" />
              <stop offset="35%" stopColor={STAR} stopOpacity="0.28" />
              <stop offset="100%" stopColor={STAR} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Tronco común */}
          {layout.trunk && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: baseDelay, duration: 0.4 }}>
              <line
                x1={layout.trunk.bottom.x}
                y1={layout.trunk.bottom.y}
                x2={layout.trunk.fork.x}
                y2={layout.trunk.fork.y}
                stroke={stageSkills.some((s) => level(s.id) >= 1) ? STAR : LOCKED_LINE}
                strokeWidth={1.6}
                filter={stageSkills.some((s) => level(s.id) >= 1) ? `url(#${glowId})` : undefined}
              />
              <StarGlint p={layout.trunk.bottom} haloId={haloId} size={12} bright />
              <StarGlint p={layout.trunk.fork} haloId={haloId} size={9} bright delay={0.6} />
            </motion.g>
          )}

          {/* Rutas */}
          {layout.edges.map((edge, i) => {
            const { active, inFocus, dim } = edgeState(edge);
            const pts = toPoints(edge.points);
            const delay = edge.childId ? tierDelay(childTier(edge)) - 0.08 : baseDelay + 0.05;
            return (
              <g
                key={edge.id}
                style={{ opacity: dim ? 0.32 : 1, transition: 'opacity 260ms ease-out' }}
              >
                {active ? (
                  <>
                    <motion.polyline
                      points={pts}
                      fill="none"
                      stroke={PALETTE.accent}
                      strokeWidth={inFocus ? 5 : 3.6}
                      strokeOpacity={inFocus ? 0.6 : 0.32}
                      strokeLinejoin="miter"
                      filter={`url(#${glowId})`}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay, duration: 0.6, ease: STUDIO_EASE }}
                    />
                    <motion.polyline
                      points={pts}
                      fill="none"
                      stroke={STAR}
                      strokeWidth={inFocus ? 2 : 1.5}
                      strokeLinejoin="miter"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay, duration: 0.6, ease: STUDIO_EASE }}
                    />
                    <polyline
                      points={pts}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="3 97"
                      className="animate-star-travel"
                      style={{ animationDelay: `${(i % 7) * 0.45}s` }}
                      filter={`url(#${glowId})`}
                    />
                  </>
                ) : (
                  <motion.polyline
                    points={pts}
                    fill="none"
                    stroke={inFocus ? 'rgba(247, 242, 236, 0.6)' : LOCKED_LINE}
                    strokeWidth={inFocus ? 1.4 : 1}
                    strokeLinejoin="miter"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay, duration: 0.55, ease: STUDIO_EASE }}
                  />
                )}
              </g>
            );
          })}

          {/* Destellos en vértices intermedios */}
          {layout.vertices.map((v, i) => (
            <motion.g
              key={`v-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: hasFocus ? 0.5 : 1 }}
              transition={{ delay: baseDelay + 0.5 + (i % 6) * 0.04, duration: 0.4 }}
            >
              <circle cx={v.x} cy={v.y} r={6} fill={`url(#${haloId})`} opacity={0.55} />
              <circle
                cx={v.x}
                cy={v.y}
                r={1.6}
                fill={STAR}
                className="animate-star-twinkle"
                style={{ animationDelay: `${(i * 0.37) % 2.8}s` }}
              />
            </motion.g>
          ))}

          {/* Bases de rama */}
          {layout.anchors.map((a) => (
            <g key={`base-${a.branch}`}>
              <circle cx={a.base.x} cy={a.base.y} r={7} fill="none" stroke="rgba(247,242,236,0.35)" strokeWidth={1} />
              <StarGlint p={a.base} haloId={haloId} size={11} bright delay={0.3} />
            </g>
          ))}

          {/* Destellos de cada nodo (esquina superior derecha) */}
          {stageSkills.map((s, i) => {
            const p = layout.nodes[s.id];
            const r = (s.tier === 2 ? stage.nodeSm : stage.nodeLg) / 2;
            const lit = level(s.id) >= 1 || derivedById[s.id]?.status === 'available';
            return (
              <StarGlint
                key={`g-${s.id}`}
                p={{ x: p.x + r * 0.74, y: p.y - r * 0.74 }}
                haloId={haloId}
                size={lit ? 9 : 6}
                bright={lit}
                delay={(i * 0.41) % 2.8}
              />
            );
          })}
        </svg>

        {/* Etiquetas de rama + contador grande en la base */}
        {layout.anchors.map((a) => {
          const meta = BRANCH_META.find((b) => b.id === a.branch);
          const Icon = BRANCH_ICONS[a.branch];
          const branchSkills = skills.filter((s) => s.branch === a.branch);
          const unlocked = branchSkills.filter((s) => level(s.id) >= 1).length;
          const points = branchSkills.reduce((acc, s) => acc + level(s.id), 0);
          const at = a.labelAt;
          const pos =
            a.labelSide === 'left'
              ? { right: stage.width - at.x + 22, top: at.y + BRANCH_LABEL_TOP, textAlign: 'right' as const }
              : a.labelSide === 'right'
                ? { left: at.x + 22, top: at.y + BRANCH_LABEL_TOP, textAlign: 'left' as const }
                : { left: at.x, top: at.y + 16, transform: 'translateX(-50%)', textAlign: 'center' as const };
          return (
            <motion.div
              key={`label-${a.branch}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: baseDelay + 0.1, duration: 0.4, ease: STUDIO_EASE }}
              className="pointer-events-none absolute z-10 whitespace-nowrap bg-transparent px-1 [filter:drop-shadow(0_1px_2px_rgba(20,21,26,0.95))_drop-shadow(0_0_10px_rgba(20,21,26,0.85))]"
              style={{ ...pos }}
            >
              <div
                className={`flex items-center gap-1.5 font-mono font-semibold uppercase tracking-[0.16em] text-secondary ${
                  a.labelSide === 'below' ? 'text-[13px]' : 'text-[11px]'
                } ${
                  a.labelSide === 'left' ? 'justify-end' : a.labelSide === 'below' ? 'justify-center' : ''
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-accent" />
                {meta?.label}
              </div>
              <div
                className={`font-display font-bold leading-none text-ink ${a.labelSide === 'below' ? 'text-[38px]' : 'text-[30px]'}`}
              >
                <span className="text-accent">{unlocked}</span>
                <span className="text-secondary">/{branchSkills.length}</span>
              </div>
              <div className={`mt-0.5 font-mono text-secondary ${a.labelSide === 'below' ? 'text-[12px]' : 'text-[10px]'}`}>{points}/{branchSkills.length * 3} pts maestría</div>
            </motion.div>
          );
        })}

        {/* Nodos */}
        {stageSkills.map((skill) => {
          const p = layout.nodes[skill.id];
          const derived = derivedById[skill.id];
          return (
            <SkillNode
              key={skill.id}
              skill={skill}
              pos={p}
              size={skill.tier === 2 ? stage.nodeSm : stage.nodeLg}
              labelPx={stage.labelPx}
              labelSide={layout.labels[skill.id] ?? 'below'}
              derived={derived}
              delay={tierDelay(skill.tier) + (skill.posX / 100) * 0.08}
              dimmed={hasFocus && !focus.has(skill.id)}
              hovered={hoveredId === skill.id}
              selected={selectedSkillId === skill.id}
              recentlyUpgraded={recentlyUpgradedSkillId === skill.id}
              recentlyUpgradedLevel={recentlyUpgradedLevel}
              newlyUnlocked={
                Boolean(recentlyUpgradedSkillId) &&
                derived.status === 'available' &&
                skill.parentIds.includes(recentlyUpgradedSkillId!)
              }
              onHover={onHover}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Estrella con halo radial + micro cruz de brillo. */
function StarGlint({
  p,
  haloId,
  size,
  bright = false,
  delay = 0,
}: {
  p: Pt;
  haloId: string;
  size: number;
  bright?: boolean;
  delay?: number;
}) {
  const arm = size / 2;
  return (
    <g className="animate-star-twinkle" style={{ animationDelay: `${delay}s`, opacity: bright ? 1 : 0.45 }}>
      <circle cx={p.x} cy={p.y} r={size * 0.75} fill={`url(#${haloId})`} opacity={bright ? 0.8 : 0.4} />
      <line x1={p.x - arm} y1={p.y} x2={p.x + arm} y2={p.y} stroke={STAR} strokeWidth={0.9} strokeLinecap="round" />
      <line x1={p.x} y1={p.y - arm} x2={p.x} y2={p.y + arm} stroke={STAR} strokeWidth={0.9} strokeLinecap="round" />
      <circle cx={p.x} cy={p.y} r={1.5} fill={STAR} />
    </g>
  );
}

/* ── Nodo circular ───────────────────────────────────────────────────────── */

function SkillNode({
  skill,
  pos,
  size,
  labelPx,
  labelSide,
  derived,
  delay,
  dimmed,
  hovered,
  selected,
  recentlyUpgraded,
  recentlyUpgradedLevel,
  newlyUnlocked,
  onHover,
  onSelect,
}: {
  skill: Skill;
  pos: Pt;
  size: number;
  labelPx: number;
  labelSide: LabelSide;
  derived: DerivedSkillStatus;
  delay: number;
  dimmed: boolean;
  hovered: boolean;
  selected: boolean;
  recentlyUpgraded: boolean;
  recentlyUpgradedLevel: SkillLevel | null;
  newlyUnlocked: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const Icon = SKILL_ICONS[skill.id] ?? BRANCH_ICONS[skill.branch];
  const major = skill.tier !== 2;
  const { status, level } = derived;
  const learned = status === 'learned';
  const rusty = status === 'rusty';
  const available = status === 'available';
  const locked = status === 'locked';

  const circleStyle: CSSProperties = learned
    ? {
        background: 'radial-gradient(circle at 34% 30%, #ffd9a8 0%, #f49c3b 52%, #c9731f 100%)',
        boxShadow:
          level === 3
            ? '0 0 0 1px rgba(247,242,236,0.7), 0 0 26px rgba(244,156,59,0.75), 0 0 60px rgba(244,156,59,0.35)'
            : '0 0 0 1px rgba(247,242,236,0.45), 0 0 20px rgba(244,156,59,0.55), 0 0 44px rgba(244,156,59,0.22)',
        color: PALETTE.bg,
      }
    : available
      ? { background: 'rgba(20,21,26,0.92)', border: `2px solid ${PALETTE.accent}`, color: PALETTE.accent }
      : rusty
        ? { background: 'rgba(20,21,26,0.9)', border: `2px solid ${PALETTE.danger}`, color: PALETTE.danger }
        : {
            background: 'rgba(20,21,26,0.55)',
            border: '1px solid rgba(123,135,148,0.45)',
            color: 'rgba(123,135,148,0.85)',
          };

  const upgradedBadgeLabel =
    (recentlyUpgradedLevel ?? level) === 3 ? '★ MAESTRÍA NV.3' : `¡LEVEL UP! NV.${recentlyUpgradedLevel ?? level}`;
  const iconSize = Math.round(size * 0.4);
  const side = LABEL_SIDES[labelSide];
  const labelDist = size / 2 + labelGap(skill.tier, labelSide);
  const labelStyle: CSSProperties = {
    left: size / 2 + side.ux * labelDist,
    top: size / 2 + side.uy * labelDist,
    transform: `translate(${side.tx * 100}%, ${side.ty * 100}%)`,
    textAlign: side.tx === 0 ? 'left' : side.tx === -1 ? 'right' : 'center',
  };
  const stateLabel = locked
    ? 'Bloqueada'
    : available
      ? 'Disponible'
      : rusty
        ? `Oxidada · Nv.${level}`
        : `Nv.${level}`;

  return (
    <div
      className="absolute"
      style={{ left: pos.x, top: pos.y, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, zIndex: hovered ? 20 : 10 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.45 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.45, ease: STUDIO_EASE }}
        className="relative h-full w-full transition-opacity duration-300"
        style={{ opacity: dimmed ? 0.42 : 1 }}
      >
        {/* Doble anillo exterior en T1 / T3 */}
        {major && (
          <>
            <span
              className="pointer-events-none absolute rounded-full"
              style={{ inset: -6, border: `1px solid ${learned ? 'rgba(244,156,59,0.55)' : 'rgba(247,242,236,0.16)'}` }}
            />
            <span
              className="pointer-events-none absolute rounded-full"
              style={{ inset: -12, border: `1px solid ${learned ? 'rgba(244,156,59,0.25)' : 'rgba(247,242,236,0.07)'}` }}
            />
          </>
        )}

        {recentlyUpgraded && (
          <>
            <motion.span
              initial={{ scale: 0.8, opacity: 0.95 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 1.15, repeat: 2 }}
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent"
            />
            <motion.span
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#14151a] shadow-[0_0_16px_rgba(244,156,59,0.65)]"
              style={{ bottom: `calc(100% + ${major ? 18 : 10}px)` }}
            >
              {upgradedBadgeLabel}
            </motion.span>
          </>
        )}

        {newlyUnlocked && !recentlyUpgraded && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-accent/80 bg-base/95 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_12px_rgba(244,156,59,0.35)]"
            style={{ bottom: `calc(100% + ${major ? 18 : 10}px)` }}
          >
            Desbloqueada
          </motion.span>
        )}

        <button
          type="button"
          onMouseEnter={() => onHover(skill.id)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(skill.id)}
          onBlur={() => onHover(null)}
          onClick={() => onSelect(skill.id)}
          aria-label={`${skill.word} · ${stateLabel}`}
          className={`relative flex h-full w-full items-center justify-center rounded-full transition-transform duration-200 hover:scale-[1.07] active:scale-95 ${
            available ? 'animate-node-pulse' : ''
          } ${rusty ? 'animate-rust-flicker' : ''} ${recentlyUpgraded ? 'level-up-amber-glow' : ''} ${
            selected ? 'outline-2 outline-offset-4 outline-ink/80' : ''
          }`}
          style={circleStyle}
        >
          <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={learned ? 2.2 : 1.8} />
        </button>

        {/* Badges */}
        {locked && (
          <span
            className="pointer-events-none absolute flex items-center justify-center rounded-full border border-secondary/60 bg-base"
            style={{ width: 20, height: 20, right: -3, bottom: -3 }}
          >
            <Lock className="h-2.5 w-2.5 text-secondary" />
          </span>
        )}

        {available && (
          <span className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-accent/70 bg-base px-1.5 font-mono text-[9px] font-bold leading-[14px] text-accent">
            T{skill.tier}
          </span>
        )}

        {(learned || rusty) && (
          <span
            className={`pointer-events-none absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-[3px] rounded-full border bg-base px-1.5 py-[3px] ${
              rusty ? 'border-danger/70' : 'border-accent/70'
            }`}
          >
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className="h-[5px] w-[5px] rounded-full"
                style={{
                  background: n <= level ? (rusty ? PALETTE.danger : LEVEL_COLORS[3]) : PALETTE.surface,
                }}
              />
            ))}
          </span>
        )}

        {rusty && (
          <span
            className="pointer-events-none absolute flex items-center justify-center rounded-full border border-danger/70 bg-base"
            style={{ width: 20, height: 20, right: -4, top: -4 }}
          >
            <AlertTriangle className="h-2.5 w-2.5 text-danger" />
          </span>
        )}

        {/* Nombre: velo sutil en el lado libre de rutas (calculado en skillTreeLayout) */}
        <div
          className="pointer-events-none absolute whitespace-nowrap rounded-lg bg-[#14151a]/55 px-2 py-0.5 backdrop-blur-xs [filter:drop-shadow(0_1px_2px_rgba(20,21,26,0.9))]"
          style={labelStyle}
        >
          <div
            className={`font-display font-bold leading-tight tracking-wide ${locked ? 'text-secondary' : 'text-ink'}`}
            style={{ fontSize: labelPx }}
          >
            {skill.word}
          </div>
          <div
            className="font-mono"
            style={{ fontSize: Math.round(labelPx * 0.76), color: rusty ? PALETTE.danger : learned ? PALETTE.accent : PALETTE.secondary }}
          >
            {stateLabel}
          </div>
        </div>

        {/* Tooltip de requisito (bloqueada) */}
        <AnimatePresence>
          {hovered && locked && derived.missingParents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16 }}
              className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-lg border border-surface bg-base/95 px-2.5 py-1.5 text-[11px] text-ink shadow-xl backdrop-blur-md"
              style={{ bottom: `calc(100% + ${major ? 18 : 10}px)` }}
            >
              <span className="mr-1 inline-flex items-center gap-1 text-secondary">
                <Lock className="h-3 w-3" /> Requiere:
              </span>
              <span className="font-semibold text-accent">
                {derived.missingParents.map((m) => m.word).join(' + ')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ── Drawer lateral (portal, no empuja el lienzo) ────────────────────────── */

function SkillDrawer({
  skill,
  derived,
  record,
  side,
  onClose,
  onSelectSkill,
  onProveSkill,
  onStartDuelWithSkill,
}: {
  skill: Skill | null;
  derived: DerivedSkillStatus | null;
  record: UserSkill | undefined;
  side: 'left' | 'right';
  onClose: () => void;
  onSelectSkill: (skillId: string | null) => void;
  onProveSkill: (skill: Skill, targetLevel: Exclude<SkillLevel, 0>) => void;
  onStartDuelWithSkill: (skillId: string) => void;
}) {
  return (
    <AnimatePresence>
      {skill && derived && (
        <>
          {/* Scrim sólo en móvil/tablet */}
          <motion.button
            key="drawer-scrim"
            type="button"
            aria-label="Cerrar panel de skill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[43] bg-base/60 backdrop-blur-[2px] lg:hidden"
          />
          <motion.aside
            key={`drawer-${skill.id}`}
            initial={{ opacity: 0, x: side === 'right' ? 24 : -24, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: side === 'right' ? 24 : -24 }}
            transition={{ duration: 0.26, ease: STUDIO_EASE }}
            className={`glass-panel fixed inset-x-3 bottom-3 z-[44] flex max-h-[78dvh] flex-col justify-between gap-4 overflow-y-auto rounded-2xl p-5 shadow-2xl lg:inset-x-auto lg:bottom-4 lg:top-20 lg:max-h-none lg:w-[400px] ${
              side === 'right' ? 'lg:right-4' : 'lg:left-4'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-surface bg-surface/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-secondary">
                      {BRANCH_META.find((b) => b.id === skill.branch)?.label} · Tier {skill.tier}
                    </span>
                    {derived.rusty && (
                      <span className="rounded-md border border-danger/60 bg-danger/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-danger">
                        Oxidada
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-wide text-ink">
                    <ScrambleText text={skill.word} triggerKey={skill.id} />
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar panel de skill"
                  className="rounded-lg border border-surface p-1.5 text-secondary transition hover:border-secondary hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Barra de maestría */}
              <div className="rounded-xl border border-surface/80 bg-base/60 p-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold" style={{ color: LEVEL_COLORS[derived.level] }}>
                    {LEVEL_NAMES[derived.level]}
                  </span>
                  <span className="font-mono text-secondary">{derived.level}/3</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className="h-1.5 rounded-full transition-colors"
                      style={{
                        backgroundColor: step <= derived.level ? LEVEL_COLORS[derived.level] : PALETTE.surface,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Definición & Tip */}
              <div className="space-y-2.5 text-sm">
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-secondary">Definición</p>
                  <p className="leading-relaxed text-ink/95">{skill.definition}</p>
                </div>
                <div className="rounded-xl border border-surface/80 bg-surface/25 p-3">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-accent">Tip de Contexto</p>
                  <p className="text-xs leading-relaxed text-ink/85">{skill.contextTip}</p>
                </div>
                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-secondary">
                    Ejemplos de uso vivo
                  </p>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-secondary">
                    {skill.examples.map((ex) => (
                      <li key={ex} className="rounded-lg border border-surface/60 bg-base/50 p-2.5 text-ink/85">
                        “{ex}”
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tu Mejor Frase */}
              {derived.level >= 1 && (
                <div className="rounded-xl border border-accent/45 bg-accent/10 p-3.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                      <MessageSquareQuote className="h-3.5 w-3.5" />
                      Tu Mejor Frase
                    </span>
                    {record?.bestScore != null && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-base/75 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink">
                        <Award className="h-3 w-3 text-accent" />
                        {record.bestScore}/100
                      </span>
                    )}
                  </div>
                  <p className="text-xs italic leading-relaxed text-ink">
                    “{record?.bestSentence || skill.examples[0]}”
                  </p>
                </div>
              )}
            </div>

            {/* Botones según estado */}
            <div className="space-y-2 border-t border-surface/80 pt-3">
              {derived.status === 'locked' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-surface bg-surface/40 px-4 py-2.5 text-xs font-semibold text-ink/80"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Desbloquea primero: {derived.missingParents.map((p) => p.word).join(', ')}</span>
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {derived.missingParents.map((parent) => (
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

              {derived.status === 'available' && (
                <button
                  type="button"
                  onClick={() => onProveSkill(skill, 1)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110"
                >
                  <Sparkles className="h-4 w-4" />
                  PROVE SKILL — DESBLOQUEAR NV. 1
                </button>
              )}

              {(derived.level === 1 || derived.level === 2) && !derived.rusty && (
                <>
                  <button
                    type="button"
                    onClick={() => onProveSkill(skill, getNextSoloTargetLevel(derived.level, false))}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110"
                  >
                    <Sparkles className="h-4 w-4" />
                    UPGRADE SKILL (SOLO) · NV. {derived.level + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartDuelWithSkill(skill.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-secondary/60 bg-surface/35 px-4 py-2.5 font-display text-xs font-bold tracking-wider text-ink transition hover:border-accent hover:text-accent"
                  >
                    <Swords className="h-4 w-4" />
                    MEJORAR EN DUELO 1v1
                  </button>
                </>
              )}

              {(derived.rusty || derived.level === 3) && (
                <>
                  <button
                    type="button"
                    onClick={() => onProveSkill(skill, getNextSoloTargetLevel(derived.level, derived.rusty))}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-display text-xs font-bold tracking-wider transition ${
                      derived.rusty
                        ? 'bg-danger text-ink hover:brightness-110'
                        : 'border border-accent/60 bg-accent/15 text-accent hover:bg-accent/25'
                    }`}
                  >
                    <Wrench className="h-4 w-4" />
                    REPARAR / RE-ENTRENAR SKILL
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartDuelWithSkill(skill.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-secondary/60 bg-surface/35 px-4 py-2 font-display text-xs font-bold tracking-wider text-ink transition hover:border-accent hover:text-accent"
                  >
                    <Swords className="h-4 w-4" />
                    LLEVAR A DUELO 1v1
                  </button>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

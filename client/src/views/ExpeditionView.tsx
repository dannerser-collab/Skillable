import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { Compass, Dices, Sparkles, Swords } from 'lucide-react';
import { LEVEL_COLORS, type Skill, type SkillLevel, type UserSkill } from '../../../shared/types.ts';
import { BRANCH_META } from '../data/fallbackSkills.ts';
import { ScrambleText } from '../components/ScrambleText.tsx';
import { VIEW_TRANSITION, VIEW_VARIANTS } from '../utils/motion.ts';
import { getNextSoloTargetLevel, getSkillNodeStatus } from '../utils/textValidation.ts';

export function ExpeditionView({
  skills,
  currentSkill,
  rollKey,
  userSkills,
  onRollNewSkill,
  onProveSkill,
  onDuelWithSkill,
}: {
  skills: Skill[];
  currentSkill: Skill;
  rollKey: number;
  userSkills: Record<string, UserSkill>;
  onRollNewSkill: () => void;
  onProveSkill: (skill: Skill, targetLevel: Exclude<SkillLevel, 0>) => void;
  onDuelWithSkill: (skillId: string) => void;
}) {
  const tiltXRaw = useMotionValue(0);
  const tiltYRaw = useMotionValue(0);
  const glowXRaw = useMotionValue(50);
  const glowYRaw = useMotionValue(50);

  const rotateX = useSpring(tiltXRaw, { stiffness: 220, damping: 24, mass: 0.6 });
  const rotateY = useSpring(tiltYRaw, { stiffness: 220, damping: 24, mass: 0.6 });
  const glowX = useSpring(glowXRaw, { stiffness: 200, damping: 26 });
  const glowY = useSpring(glowYRaw, { stiffness: 200, damping: 26 });
  const specularBg = useMotionTemplate`radial-gradient(460px circle at ${glowX}% ${glowY}%, rgba(244, 156, 59, 0.11), rgba(247, 242, 236, 0.04) 38%, transparent 70%)`;

  const derived = getSkillNodeStatus(currentSkill, userSkills, skills);
  const branchLabel =
    BRANCH_META.find((b) => b.id === currentSkill.branch)?.label ?? currentSkill.branch;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    tiltXRaw.set(-py * 5.5);
    tiltYRaw.set(px * 5.5);
    glowXRaw.set((px + 0.5) * 100);
    glowYRaw.set((py + 0.5) * 100);
  };

  const handleMouseLeave = () => {
    tiltXRaw.set(0);
    tiltYRaw.set(0);
    glowXRaw.set(50);
    glowYRaw.set(50);
  };

  return (
    <motion.section
      key="expedition-view"
      variants={VIEW_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={VIEW_TRANSITION}
      className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center px-4 pb-8 pt-28 sm:px-6 md:pt-20"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-secondary">
          <Compass className="h-4 w-4 text-accent" />
          Expedición Aleatoria · Descubrimiento
        </div>
        <span className="font-mono text-xs text-secondary">{skills.length} palabras activas</span>
      </div>

      {/* Tarjeta holográfica central */}
      <motion.div
        key={rollKey}
        initial={{ opacity: 0.45, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformPerspective: 1000,
          transformStyle: 'preserve-3d',
        }}
        className="glass-panel relative overflow-hidden rounded-3xl border border-accent/40 p-6 shadow-[0_0_45px_rgba(244,156,59,0.12)] sm:p-7"
      >
        {/* Reflejo especular reactivo al cursor */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: specularBg }}
        />

        {/* Reflejo holográfico sutil */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-holo-sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-ink/5 to-transparent" />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Meta superior */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-secondary/45 bg-surface/40 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ink">
                {branchLabel}
              </span>
              <span className="rounded-lg border border-surface bg-base/75 px-2.5 py-1 font-mono text-[11px] text-secondary">
                Tier {currentSkill.tier}
              </span>
            </div>

            <span
              className="rounded-full border px-3 py-1 font-mono text-xs font-semibold"
              style={{
                borderColor: derived.rusty ? '#e05263' : LEVEL_COLORS[derived.level],
                color: derived.rusty ? '#e05263' : LEVEL_COLORS[derived.level],
              }}
            >
              {derived.rusty
                ? `Nv.${derived.level} · Oxidada`
                : derived.level >= 1
                  ? `Nv.${derived.level} Desbloqueada`
                  : 'Nv.0 Por descubrir'}
            </span>
          </div>

          {/* Palabra protagonista */}
          <div className="border-y border-surface/80 py-5">
            <h2 className="font-display text-4xl font-bold tracking-wide text-ink sm:text-5xl">
              <ScrambleText text={currentSkill.word} triggerKey={rollKey} durationMs={700} />
            </h2>
            <p className="mt-3 text-[1rem] leading-relaxed text-ink/90">{currentSkill.definition}</p>
          </div>

          {/* Tip y Ejemplos */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-surface/80 bg-base/60 p-4">
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-accent">
                Tip de Uso
              </p>
              <p className="text-xs leading-relaxed text-ink/90">{currentSkill.contextTip}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {currentSkill.tabooWords.map((taboo) => (
                  <span
                    key={taboo}
                    className="rounded-md border border-danger/35 bg-danger/10 px-2 py-0.5 font-mono text-[10px] text-danger"
                  >
                    Tabú: {taboo}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-surface/80 bg-base/60 p-4">
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-secondary">
                Ejemplos
              </p>
              <ul className="space-y-2 text-xs leading-relaxed text-ink/85">
                {currentSkill.examples.map((ex) => (
                  <li key={ex} className="border-l-2 border-accent/60 pl-2.5">
                    “{ex}”
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={onRollNewSkill}
              className="flex items-center justify-center gap-2 rounded-xl border border-secondary/60 bg-surface/40 px-4 py-3 font-display text-xs font-bold tracking-wider text-ink transition hover:border-ink hover:bg-surface/70"
            >
              <Dices className="h-4 w-4 text-accent" />
              NUEVA PALABRA RANDOM
            </button>

            <button
              type="button"
              onClick={() =>
                onProveSkill(
                  currentSkill,
                  getNextSoloTargetLevel(derived.level, derived.rusty),
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" />
              PROVE SKILL
            </button>

            <button
              type="button"
              onClick={() => onDuelWithSkill(currentSkill.id)}
              className="flex items-center justify-center gap-2 rounded-xl border border-accent/60 bg-accent/15 px-4 py-3 font-display text-xs font-bold tracking-wider text-ink transition hover:bg-accent/25"
            >
              <Swords className="h-4 w-4 text-accent" />
              LLEVAR A DUELO 1v1
            </button>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}

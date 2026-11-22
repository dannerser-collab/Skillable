import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronRight,
  Compass,
  GitBranch,
  Minimize2,
  Pencil,
  RotateCcw,
  Sparkles,
  Swords,
  Wrench,
} from 'lucide-react';
import {
  CentralSphere,
  type CentralSphereHandle,
  type SphereAccent,
} from '../components/CentralSphere.tsx';
import { KineticTitle } from '../components/KineticTitle.tsx';
import { UserAvatar } from '../components/UserAvatar.tsx';
import type { DemoPresetId } from '../hooks/useUserProfile.ts';
import { STUDIO_EASE, STUDIO_SPRING } from '../utils/motion.ts';

export function HomeView({
  expanded,
  onExpand,
  onCollapse,
  nickname,
  onChangeNickname,
  elo,
  unlockedCount,
  totalSkills,
  onApplyPreset,
  onExploreTree,
  onRandomExpedition,
  onEnterArena,
}: {
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  nickname: string;
  onChangeNickname: (nextName: string) => void;
  elo: number;
  unlockedCount: number;
  totalSkills: number;
  onApplyPreset: (preset: DemoPresetId) => void;
  onExploreTree: () => void;
  onRandomExpedition: () => void;
  onEnterArena: () => void;
}) {
  const [sphereHovered, setSphereHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredCta, setHoveredCta] = useState<SphereAccent>('default');
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState(nickname);
  const [savedPing, setSavedPing] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const sphereControlRef = useRef<CentralSphereHandle | null>(null);
  const pointerStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    exceeded: boolean;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    exceeded: false,
  });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    setNickInput(nickname);
  }, [nickname]);

  useEffect(() => {
    if (!expanded) {
      setSphereHovered(false);
      setIsDragging(false);
      setHoveredCta('default');
      setEditingNick(false);
      setPresetOpen(false);
    } else {
      setIsDragging(false);
      pointerStateRef.current.active = false;
      sphereControlRef.current?.setDragging(false);
    }
  }, [expanded]);

  useEffect(() => {
    if (!presetOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPresetOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [presetOpen]);

  useEffect(() => {
    if (!expanded) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (presetOpen) {
        setPresetOpen(false);
        return;
      }
      if (!editingNick) {
        onCollapse();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editingNick, expanded, onCollapse, presetOpen]);

  const commitNickname = () => {
    const cleaned = nickInput.trim();
    if (cleaned.length >= 2 && cleaned !== nickname) {
      onChangeNickname(cleaned);
      setSavedPing(true);
      window.setTimeout(() => setSavedPing(false), 1600);
    } else {
      setNickInput(nickname);
    }
    setEditingNick(false);
  };

  const triggerPreset = (preset: DemoPresetId, label: string) => {
    onApplyPreset(preset);
    setPresetOpen(false);
    setPresetFeedback(label);
    window.setTimeout(() => setPresetFeedback(null), 2200);
  };

  const handleSpherePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      exceeded: false,
    };
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    sphereControlRef.current?.setDragging(true);
  };

  const handleSpherePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = pointerStateRef.current;
    if (!state.active) return;

    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;

    const totalDist = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    if (totalDist > 6 && !state.exceeded) {
      state.exceeded = true;
      setIsDragging(true);
    }
    if (state.exceeded || totalDist > 3) {
      sphereControlRef.current?.applyDrag(dx, dy);
    }
  };

  const handleSpherePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = pointerStateRef.current;
    if (!state.active) return;
    const wasDrag = state.exceeded;
    state.active = false;
    state.pointerId = null;
    setIsDragging(false);
    sphereControlRef.current?.setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (wasDrag) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 250);
    }
  };

  const handleSphereClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onExpand();
  };

  const hubButtons: Array<{
    id: Exclude<SphereAccent, 'default'>;
    title: string;
    tag: string;
    icon: typeof GitBranch;
    onClick: () => void;
    accent?: boolean;
  }> = [
    {
      id: 'tree',
      title: 'Árbol de Skills',
      tag: '01 · Grafo RPG',
      icon: GitBranch,
      onClick: onExploreTree,
    },
    {
      id: 'expedition',
      title: 'Expedición Aleatoria',
      tag: '02 · Descubrir',
      icon: Compass,
      onClick: onRandomExpedition,
    },
    {
      id: 'arena',
      title: 'Arena 1v1',
      tag: '03 · Tiempo Real',
      icon: Swords,
      onClick: onEnterArena,
      accent: true,
    },
  ];

  return (
    <motion.section
      key="home-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22, ease: STUDIO_EASE } }}
      transition={{ duration: 0.3, ease: STUDIO_EASE }}
      className="relative h-dvh w-full overflow-hidden select-none"
    >
      {/* Capa de Esfera interactiva full-viewport sin pixelarse ni cortarse */}
      <div className="pointer-events-none fixed inset-0 z-10">
        <CentralSphere
          expanded={expanded}
          hovered={sphereHovered || isDragging}
          accent={hoveredCta}
          controlRef={sphereControlRef}
        />
      </div>

      {/* Estado inicial: Esfera centrada en reposo + hit target circular */}
      <AnimatePresence>
        {!expanded && (
          <motion.div
            key="hub-idle-layer"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.28, ease: STUDIO_EASE }}
            className="relative z-20 flex h-full w-full items-center justify-center"
          >
            <button
              type="button"
              onClick={handleSphereClick}
              onPointerDown={handleSpherePointerDown}
              onPointerMove={handleSpherePointerMove}
              onPointerUp={handleSpherePointerEnd}
              onPointerCancel={handleSpherePointerEnd}
              onMouseEnter={() => setSphereHovered(true)}
              onMouseLeave={() => setSphereHovered(false)}
              onFocus={() => setSphereHovered(true)}
              onBlur={() => setSphereHovered(false)}
              aria-label="Abrir Hub de Skillable"
              className={`group relative h-[min(64vmin,380px)] w-[min(64vmin,380px)] touch-none rounded-full bg-transparent transition-transform duration-300 focus:outline-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <span className="sr-only">Abrir Hub de Skillable</span>
            </button>

            <motion.div
              animate={{
                opacity: sphereHovered || isDragging ? 1 : 0.78,
                y: sphereHovered || isDragging ? -2 : 0,
              }}
              transition={{ duration: 0.24, ease: STUDIO_EASE }}
              className="pointer-events-none fixed inset-x-0 bottom-8 flex justify-center sm:bottom-10"
            >
              <div className="inline-flex items-center gap-2.5 rounded-full border border-surface/85 bg-base/75 px-4 py-1.5 backdrop-blur-md">
                <span
                  className={`h-2 w-2 rounded-full bg-accent transition-transform duration-300 ${
                    sphereHovered || isDragging
                      ? 'scale-125 shadow-[0_0_12px_rgba(244,156,59,0.9)]'
                      : 'animate-pulse'
                  }`}
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/90">
                  {isDragging
                    ? 'Rotando núcleo'
                    : sphereHovered
                      ? 'Clic para entrar · Arrastra para rotar'
                      : 'Toca el núcleo'}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estado expandido: Perfil arriba izq + Título "Skillable" + 3 botones centrados sobre la esfera */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="hub-expanded-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: STUDIO_EASE }}
            className="relative z-20 h-full w-full"
          >
            {/* Esquina superior izquierda: Foto de perfil + Nombre de usuario */}
            <motion.div
              initial={{ opacity: 0, x: -16, y: -8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -12, y: -6 }}
              transition={{ duration: 0.36, delay: 0.08, ease: STUDIO_EASE }}
              className="glass-panel absolute left-4 top-4 z-30 flex max-w-[calc(100vw-8.75rem)] items-center gap-2.5 rounded-2xl px-2.5 py-2 sm:left-7 sm:top-7 sm:max-w-xs sm:gap-3 sm:px-3.5 sm:py-2.5"
            >
              <UserAvatar nickname={nickname} size="md" />

              <div className="min-w-0">
                {editingNick ? (
                  <div className="flex items-center gap-1 rounded-lg border border-accent/60 bg-base/90 px-2 py-0.5">
                    <input
                      type="text"
                      value={nickInput}
                      maxLength={20}
                      autoFocus
                      onChange={(e) => setNickInput(e.target.value)}
                      onBlur={commitNickname}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitNickname();
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setNickInput(nickname);
                          setEditingNick(false);
                        }
                      }}
                      aria-label="Editar nickname"
                      className="w-24 bg-transparent font-mono text-[16px] text-ink focus:outline-none sm:w-32 sm:text-xs"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={commitNickname}
                      aria-label="Guardar nickname"
                      className="text-success hover:opacity-80"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingNick(true)}
                    title="Clic para editar nombre"
                    className="group flex max-w-full items-center gap-1.5 text-left focus:outline-none"
                  >
                    <span className="max-w-[105px] truncate font-display text-sm font-bold tracking-wide text-ink transition group-hover:text-accent sm:max-w-[160px]">
                      {nickname}
                    </span>
                    <Pencil className="h-3 w-3 shrink-0 text-secondary transition group-hover:text-accent" />
                  </button>
                )}

                <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-secondary sm:text-[11px]">
                  {savedPing ? (
                    <span className="text-success">Nombre guardado</span>
                  ) : (
                    <>
                      <span>
                        ELO <strong className="text-accent">{elo}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong className="text-ink">{unlockedCount}</strong>/{totalSkills}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Esquina superior derecha: Demo Presets + Contraer esfera */}
            <motion.div
              initial={{ opacity: 0, x: 16, y: -8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 12, y: -6 }}
              transition={{ duration: 0.36, delay: 0.08, ease: STUDIO_EASE }}
              className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-7 sm:top-7"
            >
              <div className="relative" ref={popoverRef}>
                <button
                  type="button"
                  onClick={() => setPresetOpen((prev) => !prev)}
                  aria-label="Demo Presets"
                  className="glass-panel flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-secondary transition hover:border-accent/55 hover:text-ink sm:px-3"
                >
                  <Wrench className="h-3.5 w-3.5 text-accent" />
                  <span className="hidden sm:inline">Demo Presets</span>
                </button>

                {presetFeedback && (
                  <div className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-md border border-success/40 bg-base/95 px-2.5 py-1 font-mono text-[11px] text-success shadow-lg">
                    {presetFeedback}
                  </div>
                )}

                {presetOpen && (
                  <div className="glass-panel absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl p-2 shadow-2xl">
                    <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-secondary">
                      Demo Presets (1 clic)
                    </p>
                    <button
                      type="button"
                      onClick={() => triggerPreset('demo', 'Estado Demo cargado (3/15)')}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-ink transition hover:bg-surface/60"
                    >
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <div>
                        <p className="font-semibold text-ink">Cargar estado Demo</p>
                        <p className="font-mono text-[10px] text-secondary">
                          2 dominadas (Nv.3) + 1 Oxidada
                        </p>
                      </div>
                    </button>
                    <div className="my-1 border-t border-surface/80" />
                    <button
                      type="button"
                      onClick={() => triggerPreset('reset', 'Todo reseteado (0/15)')}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-danger transition hover:bg-danger/10"
                    >
                      <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-danger">Resetear todo</p>
                        <p className="font-mono text-[10px] text-secondary">
                          Reinicia skills (0/15) y ELO 1000
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onCollapse}
                aria-label="Contraer esfera"
                title="Contraer esfera (Esc)"
                className="glass-panel flex h-10 w-10 items-center justify-center rounded-xl text-secondary transition hover:border-accent/55 hover:text-ink"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </motion.div>

            {/* Centro sobre la esfera agrandada: Título "Skillable" + 3 botones */}
            <div className="relative z-20 flex h-full w-full flex-col items-center justify-center px-4 pb-6 pt-16">
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.42, delay: 0.08, ease: STUDIO_EASE }}
                className="text-center"
              >
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-surface/90 bg-base/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-secondary backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Vocabulario Activo · RPG
                </div>
                <h1 className="font-display text-4xl font-bold tracking-[0.22em] text-ink drop-shadow-[0_0_28px_rgba(244,156,59,0.22)] sm:text-5xl md:text-6xl">
                  <KineticTitle text="Skillable" />
                </h1>
              </motion.div>

              <div className="mt-5 flex w-[min(88vw,356px)] flex-col gap-3 sm:mt-6">
                {hubButtons.map((btn, index) => {
                  const Icon = btn.icon;
                  return (
                    <motion.button
                      key={btn.id}
                      type="button"
                      initial={{ opacity: 0, y: 16, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.97 }}
                      transition={{
                        duration: 0.38,
                        delay: 0.14 + index * 0.055,
                        ease: STUDIO_EASE,
                      }}
                      whileHover={{ y: -2, scale: 1.015, transition: STUDIO_SPRING }}
                      whileTap={{ scale: 0.985 }}
                      onMouseEnter={() => setHoveredCta(btn.id)}
                      onMouseLeave={() => setHoveredCta('default')}
                      onFocus={() => setHoveredCta(btn.id)}
                      onBlur={() => setHoveredCta('default')}
                      onClick={btn.onClick}
                      className={`group flex min-h-[58px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ${
                        btn.accent ? 'glass-hub-btn glass-hub-btn--accent' : 'glass-hub-btn'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                            btn.accent
                              ? 'border-accent/60 bg-accent/20 text-accent'
                              : 'border-surface bg-surface/45 text-secondary group-hover:border-secondary/60 group-hover:text-ink'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                              btn.accent ? 'text-accent' : 'text-secondary'
                            }`}
                          >
                            {btn.tag}
                          </p>
                          <p className="truncate font-display text-sm font-bold tracking-wide text-ink sm:text-[15px]">
                            {btn.title}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 ${
                          btn.accent ? 'text-accent' : 'text-secondary group-hover:text-ink'
                        }`}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

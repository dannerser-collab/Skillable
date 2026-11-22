import { motion } from 'framer-motion';
import { ArrowLeft, Compass, GitBranch, Swords } from 'lucide-react';
import { STUDIO_EASE, STUDIO_SPRING } from '../utils/motion.ts';

export type AppView = 'inicio' | 'arbol' | 'expedicion' | 'arena';

const VIEW_TABS: readonly {
  id: Exclude<AppView, 'inicio'>;
  label: string;
  mobileLabel: string;
  icon: typeof GitBranch;
}[] = [
  { id: 'arbol', label: 'Árbol de Skills', mobileLabel: 'Árbol', icon: GitBranch },
  { id: 'expedicion', label: 'Expedición', mobileLabel: 'Expedición', icon: Compass },
  { id: 'arena', label: 'Arena 1v1', mobileLabel: 'Arena 1v1', icon: Swords },
];

/**
 * Barra superior de las vistas internas: sólo "Volver al Hub" + switcher de vistas.
 * El perfil (avatar, nickname, ELO, contador) y los Demo Presets viven en el Hub;
 * el estado sigue en useUserProfile, aquí simplemente no se renderiza.
 */
export function Navbar({
  activeView,
  onNavigate,
  onReturnToHub,
}: {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onReturnToHub: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.28, ease: STUDIO_EASE }}
      className="fixed inset-x-0 top-0 z-40 border-b border-surface/80 bg-base/85 backdrop-blur-md"
    >
      <div className="relative mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-2.5">
        {/* Botón Volver al Hub */}
        <button
          type="button"
          onClick={onReturnToHub}
          className="group flex shrink-0 items-center gap-1.5 rounded-xl border border-surface bg-surface/35 px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/65 hover:bg-accent/10 hover:text-accent sm:gap-2 sm:px-3"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-accent transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Volver al Hub</span>
          <span className="sm:hidden">Hub</span>
        </button>

        {/* Switcher segmentado desktop para las 3 vistas */}
        <nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-xl border border-surface/80 bg-base/60 p-1 md:flex"
          aria-label="Navegación de vistas"
        >
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
                  active ? 'text-accent' : 'text-secondary hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="active-nav-pill"
                    transition={STUDIO_SPRING}
                    className="absolute inset-0 rounded-lg border border-accent/50 bg-accent/15"
                  />
                )}
                <Icon className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>

      </div>

      {/* Pestañas móvil (3 vistas) */}
      <nav
        className="flex items-center justify-around border-t border-surface/60 px-1.5 py-1.5 md:hidden"
        aria-label="Navegación móvil"
      >
        {VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-[11px] font-medium transition ${
                active ? 'bg-accent/15 text-accent' : 'text-secondary hover:text-ink'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{tab.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </motion.header>
  );
}

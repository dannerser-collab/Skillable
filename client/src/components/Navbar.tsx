import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Compass,
  GitBranch,
  Home,
  Pencil,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  Wrench,
} from 'lucide-react';
import type { DemoPresetId } from '../hooks/useUserProfile.ts';

export type AppView = 'inicio' | 'arbol' | 'expedicion' | 'arena';

const NAV_TABS: readonly { id: AppView; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'arbol', label: 'Árbol de Skills', icon: GitBranch },
  { id: 'expedicion', label: 'Expedición', icon: Compass },
  { id: 'arena', label: 'Arena 1v1', icon: Swords },
];

export function Navbar({
  activeView,
  onNavigate,
  nickname,
  onChangeNickname,
  elo,
  unlockedCount,
  totalSkills,
  onApplyPreset,
}: {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  nickname: string;
  onChangeNickname: (nextName: string) => void;
  elo: number;
  unlockedCount: number;
  totalSkills: number;
  onApplyPreset: (preset: DemoPresetId) => void;
}) {
  const [editingNick, setEditingNick] = useState(false);
  const [draftNick, setDraftNick] = useState(nickname);
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftNick(nickname);
  }, [nickname]);

  useEffect(() => {
    if (!presetOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPresetOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPresetOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [presetOpen]);

  const commitNickname = () => {
    if (draftNick.trim().length >= 2) {
      onChangeNickname(draftNick);
    } else {
      setDraftNick(nickname);
    }
    setEditingNick(false);
  };

  const triggerPreset = (preset: DemoPresetId, label: string) => {
    onApplyPreset(preset);
    setPresetOpen(false);
    setPresetFeedback(label);
    window.setTimeout(() => setPresetFeedback(null), 2200);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-surface/80 bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Logo */}
        <button
          type="button"
          onClick={() => onNavigate('inicio')}
          className="group flex shrink-0 items-center gap-2.5 text-left focus:outline-none"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/45 bg-accent/15 font-display text-sm font-bold text-accent transition group-hover:border-accent group-hover:bg-accent/25">
            SK
          </span>
          <span className="font-display text-[1rem] font-bold tracking-[0.18em] text-ink sm:text-lg">
            SKILLABLE
          </span>
        </button>

        {/* Pestañas desktop */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide transition ${
                  active
                    ? 'border border-accent/50 bg-accent/15 text-accent'
                    : 'border border-transparent text-secondary hover:border-surface hover:bg-surface/40 hover:text-ink'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Indicadores derecha + Demo Presets */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Nickname editable */}
          <div className="hidden items-center sm:flex">
            {editingNick ? (
              <div className="flex items-center gap-1 rounded-lg border border-accent/60 bg-base px-2 py-1">
                <input
                  type="text"
                  value={draftNick}
                  maxLength={20}
                  autoFocus
                  onChange={(e) => setDraftNick(e.target.value)}
                  onBlur={commitNickname}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNickname();
                    if (e.key === 'Escape') {
                      setDraftNick(nickname);
                      setEditingNick(false);
                    }
                  }}
                  aria-label="Editar nickname"
                  className="w-28 bg-transparent font-mono text-xs text-ink focus:outline-none"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={commitNickname}
                  className="text-success hover:opacity-80"
                  aria-label="Guardar nickname"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingNick(true)}
                title="Clic para editar nickname"
                className="flex items-center gap-1.5 rounded-lg border border-surface bg-surface/35 px-2.5 py-1 font-mono text-xs text-ink transition hover:border-secondary"
              >
                <span className="max-w-[110px] truncate">{nickname}</span>
                <Pencil className="h-3 w-3 text-secondary" />
              </button>
            )}
          </div>

          {/* ELO */}
          <div
            className="flex items-center gap-1 rounded-lg border border-surface bg-surface/35 px-2.5 py-1 font-mono text-xs"
            title="Puntaje ELO en Arena 1v1"
          >
            <Trophy className="h-3.5 w-3.5 text-accent" />
            <span className="font-semibold text-ink">{elo}</span>
            <span className="hidden text-secondary lg:inline">ELO</span>
          </div>

          {/* Contador de skills */}
          <div
            className="flex items-center gap-1 rounded-lg border border-surface bg-surface/35 px-2.5 py-1 font-mono text-xs"
            title="Skills desbloqueadas"
          >
            <span className="font-semibold text-accent">{unlockedCount}</span>
            <span className="text-secondary">/{totalSkills}</span>
          </div>

          {/* Botón Demo Presets */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setPresetOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg border border-surface bg-base/80 px-2.5 py-1 text-xs font-medium text-secondary transition hover:border-accent/50 hover:text-ink"
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
              <div className="glass-panel absolute right-0 top-full z-50 mt-2 w-64 rounded-xl p-2 shadow-2xl">
                <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-secondary">
                  Estado rápido para pitch
                </p>
                <button
                  type="button"
                  onClick={() => triggerPreset('pitch', 'Preset Pitch aplicado')}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-ink transition hover:bg-surface/60"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>Demo Pitch (4/15 + 1 Oxidada)</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerPreset('starter_rusty', 'Preset Inicial aplicado')}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-ink transition hover:bg-surface/60"
                >
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-danger" />
                  <span>Inicial (Paradigma Oxidada)</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerPreset('toggle_rusty', 'Estado Oxidada alternado')}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-ink transition hover:bg-surface/60"
                >
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-secondary" />
                  <span>Alternar Oxidada (Paradigma)</span>
                </button>
                <div className="my-1 border-t border-surface/80" />
                <button
                  type="button"
                  onClick={() => triggerPreset('reset', 'Progreso reiniciado (0/15)')}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-danger transition hover:bg-danger/10"
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                  <span>Resetear progreso (0/15)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pestañas móvil */}
      <nav
        className="flex items-center justify-around border-t border-surface/60 px-2 py-1.5 md:hidden"
        aria-label="Navegación móvil"
      >
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                active ? 'bg-accent/15 text-accent' : 'text-secondary hover:text-ink'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

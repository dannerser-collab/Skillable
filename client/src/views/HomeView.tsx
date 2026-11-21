import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Compass, GitBranch, Swords, User } from 'lucide-react';
import { CentralSphere, type SphereAccent } from '../components/CentralSphere.tsx';
import { ScrambleText } from '../components/ScrambleText.tsx';

export function HomeView({
  nickname,
  onChangeNickname,
  elo,
  unlockedCount,
  totalSkills,
  onExploreTree,
  onRandomExpedition,
  onEnterArena,
}: {
  nickname: string;
  onChangeNickname: (nextName: string) => void;
  elo: number;
  unlockedCount: number;
  totalSkills: number;
  onExploreTree: () => void;
  onRandomExpedition: () => void;
  onEnterArena: () => void;
}) {
  const [hoveredCta, setHoveredCta] = useState<SphereAccent>('default');
  const [nickInput, setNickInput] = useState(nickname);
  const [savedPing, setSavedPing] = useState(false);

  useEffect(() => {
    setNickInput(nickname);
  }, [nickname]);

  const handleNickBlurOrSubmit = () => {
    const cleaned = nickInput.trim();
    if (cleaned.length >= 2 && cleaned !== nickname) {
      onChangeNickname(cleaned);
      setSavedPing(true);
      window.setTimeout(() => setSavedPing(false), 1600);
    } else if (cleaned.length < 2) {
      setNickInput(nickname);
    }
  };

  return (
    <motion.section
      key="home-view"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 pb-8 pt-24 sm:px-6 md:pt-20"
    >
      {/* Cabecera Hero */}
      <div className="relative z-20 mx-auto max-w-3xl text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-surface bg-surface/40 px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          RPG Competitivo de Vocabulario Activo
        </div>

        <h1 className="font-display text-5xl font-bold tracking-[0.16em] text-ink drop-shadow-[0_0_24px_rgba(244,156,59,0.16)] sm:text-6xl md:text-7xl">
          <ScrambleText text="SKILLABLE" durationMs={750} scrambleOnHover />
        </h1>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-secondary sm:text-[1rem]">
          Convierte tu vocabulario pasivo en habilidades activas. Desbloquea, mejora y defiende
          cada palabra en la Arena.
        </p>
      </div>

      {/* Escenario dedicado para CentralSphere: nunca tapa ni bloquea los botones */}
      <div className="relative z-10 mx-auto my-1 h-[270px] w-full max-w-[480px] sm:h-[300px] md:h-[330px]">
        <CentralSphere accent={hoveredCta} />
        <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-2 rounded-full border border-surface/80 bg-base/75 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Arrastra el núcleo · 3D
        </div>
      </div>

      {/* Bloque inferior de Nickname y 3 Botones Principales */}
      <div className="relative z-20 mx-auto w-full max-w-3xl space-y-4">
        {/* Identidad compacta */}
        <div className="glass-panel mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5">
          <label className="flex min-w-[200px] flex-1 items-center gap-2.5">
            <User className="h-4 w-4 shrink-0 text-accent" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-secondary">
              Alias
            </span>
            <input
              type="text"
              value={nickInput}
              maxLength={20}
              onChange={(e) => setNickInput(e.target.value)}
              onBlur={handleNickBlurOrSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNickBlurOrSubmit();
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              placeholder="Tu nickname..."
              aria-label="Nickname del jugador"
              className="w-full rounded-md border border-surface bg-base/80 px-2.5 py-1 font-mono text-[16px] text-ink transition focus:border-accent focus:outline-none sm:text-xs"
            />
          </label>

          <div className="flex items-center gap-3 font-mono text-xs">
            {savedPing ? (
              <span className="inline-flex items-center gap-1 text-success">
                <Check className="h-3.5 w-3.5" />
                Guardado
              </span>
            ) : (
              <span className="text-secondary">
                Skills <strong className="text-ink">{unlockedCount}/{totalSkills}</strong> · ELO{' '}
                <strong className="text-accent">{elo}</strong>
              </span>
            )}
          </div>
        </div>

        {/* 3 Botones Principales con reacción en CentralSphere */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onExploreTree}
            onMouseEnter={() => setHoveredCta('tree')}
            onMouseLeave={() => setHoveredCta('default')}
            className="glass-panel group flex flex-col items-start justify-between gap-2 rounded-xl border border-secondary/40 px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:border-secondary hover:bg-surface/40"
          >
            <div className="flex w-full items-center justify-between">
              <GitBranch className="h-5 w-5 text-secondary transition group-hover:text-ink" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-secondary">
                01 · Grafo RPG
              </span>
            </div>
            <span className="font-display text-sm font-bold tracking-wide text-ink">
              EXPLORAR ÁRBOL DE SKILLS
            </span>
          </button>

          <button
            type="button"
            onClick={onRandomExpedition}
            onMouseEnter={() => setHoveredCta('expedition')}
            onMouseLeave={() => setHoveredCta('default')}
            className="glass-panel group flex flex-col items-start justify-between gap-2 rounded-xl border border-ink/25 px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:border-ink/70 hover:bg-surface/40"
          >
            <div className="flex w-full items-center justify-between">
              <Compass className="h-5 w-5 text-ink/85 transition group-hover:text-ink" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-secondary">
                02 · Descubrir
              </span>
            </div>
            <span className="font-display text-sm font-bold tracking-wide text-ink">
              EXPEDICIÓN ALEATORIA
            </span>
          </button>

          <button
            type="button"
            onClick={onEnterArena}
            onMouseEnter={() => setHoveredCta('arena')}
            onMouseLeave={() => setHoveredCta('default')}
            className="group flex flex-col items-start justify-between gap-2 rounded-xl border border-accent/65 bg-accent/15 px-4 py-3.5 text-left shadow-[0_0_24px_rgba(244,156,59,0.12)] transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/25"
          >
            <div className="flex w-full items-center justify-between">
              <Swords className="h-5 w-5 text-accent" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                03 · Tiempo Real
              </span>
            </div>
            <span className="font-display text-sm font-bold tracking-wide text-ink">
              ENTRAR A ARENA 1v1
            </span>
          </button>
        </div>
      </div>
    </motion.section>
  );
}

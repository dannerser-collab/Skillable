import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import type { JudgeScores } from '../../../shared/types.ts';

function getBarColorClass(score: number, forceDanger = false): string {
  if (forceDanger || score < 45) return 'bg-danger';
  if (score < 80) return 'bg-accent';
  return 'bg-success';
}

export function ScoreBars({
  scores,
  compact = false,
}: {
  scores: JudgeScores;
  compact?: boolean;
}) {
  const axes = [
    {
      label: 'Precisión Semántica',
      weight: '40%',
      value: scores.precisionScore,
      forceDanger: false,
    },
    {
      label: 'Riqueza Contextual',
      weight: '35%',
      value: scores.contextScore,
      forceDanger: scores.antiCalzadorTriggered,
    },
    {
      label: 'Ingenio y Restricción',
      weight: '25%',
      value: scores.constraintScore,
      forceDanger: false,
    },
  ];

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {axes.map((axis) => (
        <div key={axis.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-ink/90">
              {axis.label}{' '}
              <span className="font-mono text-[11px] text-secondary">({axis.weight})</span>
            </span>
            <span className="font-mono font-semibold text-ink">{axis.value}/100</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface/70">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, axis.value))}%` }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className={`h-full rounded-full ${getBarColorClass(axis.value, axis.forceDanger)}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AntiCalzadorBanner({ feedback }: { feedback?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-danger/60 bg-danger/15 p-3.5 text-sm text-ink">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-wider text-danger">
          Alerta Anti-Calzador Activada
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink/90">
          {feedback ||
            'La palabra aparece en la frase pero de forma vacía o intercambiable. Demuestra su significado con una escena concreta.'}
        </p>
      </div>
    </div>
  );
}

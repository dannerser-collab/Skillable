import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  MAX_SKILL_LEVEL,
  type Challenge,
  type JudgeResponse,
  type Skill,
  type SkillLevel,
} from '../../../shared/types.ts';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.ts';
import { submitSoloJudge } from '../services/api.ts';
import { buildSoloChallenge, validateSentence } from '../utils/textValidation.ts';
import { ScrambleText } from './ScrambleText.tsx';
import { AntiCalzadorBanner, ScoreBars } from './ScoreBars.tsx';

const MODE_LABELS: Record<Challenge['mode'], string> = {
  escenario: 'Escenario Obligado',
  tabu: 'Modo Tabú',
  sinergia: 'Reto de Sinergia',
  conexion: 'Conexión Forzada',
};

export function ProveSkillModal({
  skill,
  targetLevel,
  isRepair,
  allSkills,
  onClose,
  onResultRecorded,
  onClaimLevelUp,
}: {
  skill: Skill;
  targetLevel: Exclude<SkillLevel, 0>;
  isRepair: boolean;
  allSkills: Skill[];
  onClose: () => void;
  onResultRecorded: (
    skillId: string,
    targetLevel: Exclude<SkillLevel, 0>,
    sentence: string,
    response: JudgeResponse,
  ) => void;
  onClaimLevelUp: (skill: Skill) => void;
}) {
  const [attemptSeed, setAttemptSeed] = useState(0);
  const challenge = useMemo(
    () => buildSoloChallenge(skill, targetLevel, allSkills),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skill.id, targetLevel, attemptSeed],
  );

  const [sentence, setSentence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [judgeResponse, setJudgeResponse] = useState<JudgeResponse | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(
    challenge.timeLimitSec ?? null,
  );
  const [timeExpired, setTimeExpired] = useState(false);

  const sentenceRef = useRef(sentence);
  sentenceRef.current = sentence;
  const autoSubmittedRef = useRef(false);

  const speech = useSpeechRecognition({
    onTranscript: (chunk) => {
      setSentence((prev) => {
        const trimmed = prev.trimEnd();
        return trimmed ? `${trimmed} ${chunk}` : chunk;
      });
    },
  });

  const live = useMemo(() => validateSentence(sentence, challenge), [sentence, challenge]);

  const handleEvaluate = useCallback(
    async (textToJudge: string) => {
      const cleaned = textToJudge.trim();
      if (!cleaned || submitting) return;
      speech.stopListening();
      setSubmitting(true);
      try {
        const response = await submitSoloJudge(
          {
            skillId: skill.id,
            sentence: cleaned,
            targetLevel,
            requiredWords: challenge.requiredWords,
            scenario: challenge.mode === 'escenario' ? challenge.prompt : undefined,
          },
          challenge,
        );
        setJudgeResponse(response);
        onResultRecorded(skill.id, targetLevel, cleaned, response);
      } finally {
        setSubmitting(false);
      }
    },
    [challenge, onResultRecorded, skill.id, speech, submitting, targetLevel],
  );

  useEffect(() => {
    setRemainingSec(challenge.timeLimitSec ?? null);
    setTimeExpired(false);
    autoSubmittedRef.current = false;
  }, [challenge]);

  useEffect(() => {
    if (challenge.timeLimitSec == null || judgeResponse || submitting) return;
    const timer = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(timer);
          setTimeExpired(true);
          if (!autoSubmittedRef.current && sentenceRef.current.trim().length > 0) {
            autoSubmittedRef.current = true;
            void handleEvaluate(sentenceRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challenge.timeLimitSec, handleEvaluate, judgeResponse, submitting]);

  const handleRetry = () => {
    setJudgeResponse(null);
    setSentence('');
    setTimeExpired(false);
    setAttemptSeed((n) => n + 1);
  };

  const handleClaim = () => {
    if (targetLevel === MAX_SKILL_LEVEL) {
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#f49c3b', '#f7f2ec', '#7b8794', '#4ade80'],
      });
    }
    onClaimLevelUp(skill);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-base/90 p-4 backdrop-blur-lg"
      role="dialog"
      aria-modal="true"
      aria-label={`Prove Skill ${skill.word}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.2 }}
        className="glass-panel my-auto w-full max-w-2xl rounded-3xl border border-accent/40 p-5 shadow-2xl sm:p-7"
      >
        {/* Cabecera */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-surface/80 pb-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-accent/45 bg-accent/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-accent">
                {isRepair ? `Reparar Nv.${targetLevel}` : `Objetivo Nv.${targetLevel}`} ·{' '}
                {MODE_LABELS[challenge.mode]}
              </span>
              <span className="rounded-md border border-surface bg-base/75 px-2.5 py-0.5 font-mono text-[11px] text-secondary">
                Mínimo: {challenge.minScore} pts
              </span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-wide text-ink">
              <ScrambleText text={skill.word} triggerKey={`${skill.id}-${attemptSeed}`} />
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              speech.stopListening();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-surface bg-surface/35 px-3 py-1.5 text-xs font-medium text-secondary transition hover:border-secondary hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            VOLVER
          </button>
        </div>

        {/* Temporizador (Nv. 3 = 45s) */}
        {remainingSec !== null && challenge.timeLimitSec && !judgeResponse && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between font-mono text-xs">
              <span className="inline-flex items-center gap-1.5 text-secondary">
                <Clock className="h-3.5 w-3.5 text-accent" />
                Tiempo límite Maestría
              </span>
              <span
                className={`font-bold ${
                  remainingSec <= 10 ? 'text-danger' : 'text-accent'
                }`}
              >
                {remainingSec}s
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full transition-all duration-700 ${
                  remainingSec <= 10 ? 'bg-danger' : 'bg-accent'
                }`}
                style={{ width: `${(remainingSec / challenge.timeLimitSec) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Instrucción del reto */}
        <div className="mt-4 rounded-2xl border border-surface bg-base/65 p-4">
          <p className="text-sm leading-relaxed text-ink">{challenge.prompt}</p>

          {/* Chips Modo Tabú */}
          {challenge.tabooWords && challenge.tabooWords.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-danger">
                Palabras prohibidas:
              </span>
              {challenge.tabooWords.map((word) => {
                const violated = live.violatedTabooWords.includes(word);
                return (
                  <span
                    key={word}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold transition ${
                      violated
                        ? 'animate-pulse border-danger bg-danger text-ink'
                        : 'border-danger/50 bg-danger/15 text-danger'
                    }`}
                  >
                    {violated && <AlertTriangle className="h-3 w-3" />}
                    {word}
                  </span>
                );
              })}
            </div>
          )}

          {/* Chips Sinergia / Conexión Forzada */}
          {challenge.requiredWords && challenge.requiredWords.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                Palabra obligatoria:
              </span>
              {challenge.requiredWords.map((word) => {
                const matched = live.matchedRequiredWords.includes(word);
                return (
                  <span
                    key={word}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold transition ${
                      matched
                        ? 'border-success/70 bg-success/15 text-success'
                        : 'border-accent/60 bg-accent/15 text-accent'
                    }`}
                  >
                    {matched && <CheckCircle2 className="h-3 w-3" />}
                    {word}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulario vs Veredicto */}
        {!judgeResponse ? (
          <div className="mt-4 space-y-3">
            {timeExpired && (
              <div className="rounded-xl border border-danger/60 bg-danger/15 px-3.5 py-2.5 text-xs text-danger">
                Se acabó el tiempo de 45 segundos sin respuesta. Pulsa Reintentar para un nuevo turno.
              </div>
            )}

            <div className="relative">
              <textarea
                rows={4}
                value={sentence}
                disabled={submitting || timeExpired}
                onChange={(e) => setSentence(e.target.value)}
                placeholder={`Escribe una frase ingeniosa usando "${skill.word}" en contexto real...`}
                className={`w-full resize-none rounded-2xl border bg-base/80 p-4 text-sm leading-relaxed text-ink placeholder:text-secondary/70 focus:outline-none ${
                  live.violatedTabooWords.length > 0
                    ? 'border-danger focus:border-danger'
                    : live.hasTargetWord
                      ? 'border-success/70 focus:border-success'
                      : 'border-surface focus:border-accent'
                }`}
              />
              {speech.interimText && (
                <p className="mt-1 font-mono text-xs text-accent">
                  Escuchando: “{speech.interimText}”
                </p>
              )}
            </div>

            {/* Validador en tiempo real */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                    live.hasTargetWord
                      ? 'border-success/60 bg-success/15 text-success'
                      : 'border-surface bg-surface/40 text-secondary'
                  }`}
                >
                  {live.hasTargetWord ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  )}
                  Objetivo: {skill.word}
                </span>

                {live.violatedTabooWords.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-danger/60 bg-danger/15 px-2 py-0.5 font-mono text-[11px] text-danger">
                    <AlertTriangle className="h-3 w-3" />
                    Tabú detectada: {live.violatedTabooWords.join(', ')}
                  </span>
                )}
              </div>

              <span className="font-mono text-[11px] text-secondary">
                {live.wordCount} palabras · {live.charCount} caracteres
              </span>
            </div>

            {speech.error && <p className="text-xs text-danger">{speech.error}</p>}

            {/* Controles de envío y voz */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={!speech.isSupported || submitting || timeExpired}
                onClick={speech.toggleListening}
                title={
                  speech.isSupported
                    ? 'Dictar respuesta por voz (es-ES)'
                    : 'Dictado por voz no disponible en este navegador'
                }
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
                  !speech.isSupported
                    ? 'cursor-not-allowed border-surface bg-surface/20 text-secondary/50'
                    : speech.isListening
                      ? 'animate-pulse border-accent bg-accent/20 text-accent'
                      : 'border-secondary/50 bg-surface/35 text-ink hover:border-accent hover:text-accent'
                }`}
              >
                {speech.isSupported ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
                <span>{speech.isListening ? 'DETENER DICTADO...' : 'DICTAR POR VOZ'}</span>
              </button>

              {timeExpired ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110"
                >
                  <RotateCcw className="h-4 w-4" />
                  INTENTAR DE NUEVO
                </button>
              ) : (
                <button
                  type="button"
                  disabled={sentence.trim().length === 0 || submitting}
                  onClick={() => void handleEvaluate(sentence)}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      EVALUANDO...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      ENVIAR AL ÁRBITRO IA
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Pantalla de Veredicto Solo */
          <div className="mt-4 space-y-4">
            {judgeResponse.result.antiCalzadorTriggered && (
              <AntiCalzadorBanner feedback={judgeResponse.result.feedback} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface bg-base/75 p-4">
              <div className="flex items-center gap-3">
                {judgeResponse.result.passed ? (
                  <CheckCircle2 className="h-9 w-9 text-success" />
                ) : (
                  <XCircle className="h-9 w-9 text-danger" />
                )}
                <div>
                  <span
                    className={`font-display text-lg font-bold tracking-wide ${
                      judgeResponse.result.passed ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {judgeResponse.result.passed ? 'SKILL APROBADA' : 'INTENTO RECHAZADO'}
                  </span>
                  <p className="font-mono text-[11px] text-secondary">
                    Árbitro:{' '}
                    {judgeResponse.source === 'gemini'
                      ? 'Gemini IA'
                      : 'Evaluador Heurístico Local'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-3xl font-bold text-ink">
                  {judgeResponse.result.totalScore}
                  <span className="text-sm text-secondary">/100</span>
                </div>
                <p className="font-mono text-[10px] text-secondary">
                  Mínimo {challenge.minScore}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-surface bg-base/60 p-4">
              <ScoreBars scores={judgeResponse.result} />
            </div>

            {!judgeResponse.result.antiCalzadorTriggered && (
              <div className="rounded-xl border border-surface/80 bg-surface/25 p-3.5 text-xs leading-relaxed text-ink">
                <span className="mr-1.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                  Veredicto:
                </span>
                {judgeResponse.result.feedback}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              {judgeResponse.result.passed ? (
                <button
                  type="button"
                  onClick={handleClaim}
                  className="inline-flex items-center gap-2 rounded-xl bg-success px-5 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110"
                >
                  <Sparkles className="h-4 w-4" />
                  RECLAMAR LEVEL UP EN EL ÁRBOL
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-surface px-4 py-2.5 text-xs font-semibold text-secondary transition hover:border-secondary hover:text-ink"
                  >
                    VOLVER
                  </button>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-display text-xs font-bold tracking-wider text-base transition hover:brightness-110"
                  >
                    <RotateCcw className="h-4 w-4" />
                    INTENTAR DE NUEVO
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

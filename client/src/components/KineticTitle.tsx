import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';

/* ════════════════════════════════════════════════════════════════════════════
 * AJUSTES RÁPIDOS DEL TÍTULO
 * ════════════════════════════════════════════════════════════════════════════ */

/** Velocidad del scramble: ms entre que se fija una letra y la siguiente (menor = más rápido). */
const SCRAMBLE_SPEED = 85;
/** ms durante los que todas las letras ruedan antes de que se fije la primera. */
const SCRAMBLE_LEAD_MS = 180;
/** ms entre cambios de símbolo aleatorio en cada letra aún sin fijar. */
const GLYPH_TICK_MS = 42;
/** Escala máxima del zoom-in mientras se decodifica (1 = sin zoom). */
const ZOOM_INTENSITY = 1.12;
/** Duración del retorno elástico a scale(1) tras fijar la última letra. */
const SETTLE_MS = 620;
/** Sonido procedural (Web Audio API). false por defecto; se puede forzar por prop. */
const ENABLE_SOUND = false;

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+=<>';

/* Estilos encapsulados (prefijo .sk-title-*). 100% transparente: sin fondos. */
const STYLES = `
.sk-title-root {
  --sk-text-color: #f7f2ec;
  --sk-accent-color: #f49c3b;
  --sk-font-family: inherit;
  --sk-font-size: inherit;
  display: inline-block;
  background: transparent;
  font-family: var(--sk-font-family);
  font-size: var(--sk-font-size);
  color: var(--sk-text-color);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), filter 260ms ease;
}
.sk-title-root:hover { transform: translateY(-2px); filter: drop-shadow(0 0 14px rgba(244,156,59,0.28)); }
.sk-title-root:active { transform: translateY(0) scale(0.985); }
.sk-title-root:focus-visible { outline: 2px solid rgba(244,156,59,0.85); outline-offset: 6px; border-radius: 6px; }
.sk-title-inner {
  display: inline-flex;
  align-items: center;
  transform-origin: 50% 55%;
  will-change: transform;
}
.sk-title-inner--settle { transition: transform ${SETTLE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1); }
.sk-title-inner--pulse { animation: sk-title-pulse 680ms ease-out; }
.sk-title-char {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0.68em;
  height: 1.2em;
  line-height: 1;
}
.sk-title-sizer { visibility: hidden; }
.sk-title-glyph {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sk-text-color);
  will-change: transform, opacity;
}
.sk-title-glyph--rolling { color: var(--sk-text-color); opacity: 0.55; transform: translateY(0.02em) scale(0.94); }
.sk-title-glyph--lock { animation: sk-title-lock 460ms cubic-bezier(0.22, 1, 0.36, 1); }
@keyframes sk-title-lock {
  0%   { color: var(--sk-accent-color); opacity: 1; transform: scale(1.18); text-shadow: 0 0 18px rgba(244,156,59,0.85); }
  55%  { color: var(--sk-accent-color); transform: scale(1.02); text-shadow: 0 0 10px rgba(244,156,59,0.45); }
  100% { color: var(--sk-text-color); opacity: 1; transform: scale(1); text-shadow: 0 0 0 rgba(244,156,59,0); }
}
@keyframes sk-title-pulse {
  0%   { filter: drop-shadow(0 0 0 rgba(244,156,59,0)); }
  25%  { filter: drop-shadow(0 0 22px rgba(244,156,59,0.75)); }
  100% { filter: drop-shadow(0 0 0 rgba(244,156,59,0)); }
}
`;

/* ── Audio procedural (Web Audio API, sin archivos) ─────────────────────────── */

type AudioCtor = typeof AudioContext;

function getAudioCtor(): AudioCtor | null {
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function playTick(ctx: AudioContext) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1800 + Math.random() * 900, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.025, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.045);
}

function playChord(ctx: AudioContext) {
  const t = ctx.currentTime;
  // Triada mayor suave (La3 · Do#4 · Mi4) con ataque lento y cola larga.
  [220, 277.18, 329.63].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.045 - i * 0.008, t + 0.06 + i * 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  });
}

/* ── Componente ─────────────────────────────────────────────────────────────── */

interface KineticTitleProps {
  text?: string;
  className?: string;
  /** Activa micro-clics + tono final (requiere interacción previa del usuario). */
  enableSound?: boolean;
  /** Se dispara cuando el título terminó de asentarse (tras el retorno elástico). */
  onSettled?: () => void;
}

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '#';
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export function KineticTitle({
  text = 'Skillable',
  className = '',
  enableSound = ENABLE_SOUND,
  onSettled,
}: KineticTitleProps) {
  const letters = Array.from(text);
  const innerRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const runningRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const soundRef = useRef(enableSound);
  soundRef.current = enableSound;

  const audio = useCallback((): AudioContext | null => {
    if (!soundRef.current) return null;
    if (!audioRef.current) {
      const Ctor = getAudioCtor();
      if (!Ctor) return null;
      try {
        audioRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    if (audioRef.current.state === 'suspended') void audioRef.current.resume().catch(() => {});
    return audioRef.current.state === 'running' ? audioRef.current : null;
  }, []);

  const clearAll = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const play = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    clearAll();
    runningRef.current = true;

    const chars = Array.from(text);
    const total = chars.length;
    const duration = SCRAMBLE_LEAD_MS + (total - 1) * SCRAMBLE_SPEED;
    const locked = new Array<boolean>(total).fill(false);
    let lastTick = -Infinity;

    // Estado inicial: todas rodando, sin transición de escala.
    inner.classList.remove('sk-title-inner--settle', 'sk-title-inner--pulse');
    inner.style.transform = 'scale(1)';
    glyphRefs.current.forEach((el) => {
      if (!el) return;
      el.classList.remove('sk-title-glyph--lock');
      el.classList.add('sk-title-glyph--rolling');
      el.textContent = randomGlyph();
    });

    const start = performance.now();

    const frame = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);

      // Zoom-in progresivo sincronizado con la decodificación.
      const scale = 1 + (ZOOM_INTENSITY - 1) * easeOutCubic(progress);
      inner.style.transform = `scale(${scale.toFixed(4)})`;

      const shouldTick = now - lastTick >= GLYPH_TICK_MS;
      if (shouldTick) lastTick = now;

      for (let i = 0; i < total; i++) {
        if (locked[i]) continue;
        const el = glyphRefs.current[i];
        if (!el) continue;
        if (elapsed >= SCRAMBLE_LEAD_MS + i * SCRAMBLE_SPEED) {
          locked[i] = true;
          el.textContent = chars[i] ?? '';
          el.classList.remove('sk-title-glyph--rolling', 'sk-title-glyph--lock');
          void el.offsetWidth; // reinicia la animación de destello
          el.classList.add('sk-title-glyph--lock');
          const ctx = audio();
          if (ctx) playTick(ctx);
        } else if (shouldTick) {
          el.textContent = randomGlyph();
        }
      }

      if (locked.every(Boolean)) {
        rafRef.current = null;
        // Pulso ámbar + retorno elástico a scale(1).
        void inner.offsetWidth;
        inner.classList.add('sk-title-inner--settle', 'sk-title-inner--pulse');
        inner.style.transform = 'scale(1)';
        const ctx = audio();
        if (ctx) playChord(ctx);
        timersRef.current.push(
          window.setTimeout(() => {
            inner.classList.remove('sk-title-inner--pulse');
            runningRef.current = false;
            onSettledRef.current?.();
          }, SETTLE_MS),
        );
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
  }, [audio, clearAll, text]);

  // Arranca al ser visible (montaje al entrar al Hub) y re-arranca si vuelve a entrar en pantalla.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === 'undefined') {
      play();
      return clearAll;
    }
    let wasVisible = false;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible && !wasVisible && !runningRef.current) play();
        wasVisible = visible;
      },
      { threshold: 0.35 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      clearAll();
      runningRef.current = false;
    };
  }, [clearAll, play]);

  useEffect(
    () => () => {
      void audioRef.current?.close().catch(() => {});
      audioRef.current = null;
    },
    [],
  );

  const handleKey = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      play();
    }
  };

  return (
    <span
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-label={text}
      title="Clic para repetir"
      onClick={play}
      onKeyDown={handleKey}
      className={`sk-title-root ${className}`}
    >
      <style>{STYLES}</style>
      <span ref={innerRef} className="sk-title-inner" aria-hidden="true">
        {letters.map((char, i) => (
          <span key={i} className="sk-title-char">
            {/* El "sizer" fija el ancho con la letra final: cero layout shift al rotar símbolos. */}
            <span className="sk-title-sizer">{char}</span>
            <span
              ref={(el) => {
                glyphRefs.current[i] = el;
              }}
              className="sk-title-glyph"
            >
              {char}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

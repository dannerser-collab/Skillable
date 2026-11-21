import { useCallback, useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ΔΩ#/◈';

export function ScrambleText({
  text,
  triggerKey,
  durationMs = 650,
  scrambleOnHover = false,
  className = '',
  as: Tag = 'span',
}: {
  text: string;
  triggerKey?: string | number;
  durationMs?: number;
  scrambleOnHover?: boolean;
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
}) {
  const [display, setDisplay] = useState(text);
  const frameRef = useRef<number>(0);

  const runScramble = useCallback(() => {
    cancelAnimationFrame(frameRef.current);

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplay(text);
      return;
    }

    const start = performance.now();
    const chars = Array.from(text);

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const revealedCount = Math.floor(progress * chars.length);

      const next = chars
        .map((char, index) => {
          if (char === ' ') return ' ';
          if (index < revealedCount) return char;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join('');

      setDisplay(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [durationMs, text]);

  useEffect(() => {
    runScramble();
    return () => cancelAnimationFrame(frameRef.current);
  }, [runScramble, triggerKey]);

  return (
    <Tag
      className={className}
      onMouseEnter={scrambleOnHover ? runScramble : undefined}
      aria-label={text}
    >
      {display}
    </Tag>
  );
}

import { useRef, useState } from 'react';

/**
 * Título reactivo SOLO al hover (sin timers): en reposo todas las letras están en
 * Space Grotesk 700 / #f7f2ec. Al pasar el mouse por una letra, esa letra salta a una
 * fuente contrastante (rotando a la siguiente en cada nuevo hover), se tiñe de ámbar
 * y escala a 1.08; al salir vuelve suavemente a su estado base.
 */

const BASE_FONT = 'font-grotesk font-bold';

const HOVER_FONTS = [
  'font-playfair font-semibold italic',
  'font-orbitron font-bold',
  'font-cinzel font-bold',
  'font-jetbrains font-semibold',
  'font-syne font-extrabold',
] as const;

interface KineticTitleProps {
  text?: string;
  className?: string;
}

export function KineticTitle({ text = 'Skillable', className = '' }: KineticTitleProps) {
  const letters = Array.from(text);
  const [activeFont, setActiveFont] = useState<(number | null)[]>(() => letters.map(() => null));
  // Próxima fuente de cada letra (rota en cada hover). Arranque desfasado por posición.
  const nextFont = useRef<number[]>(letters.map((_, i) => i % HOVER_FONTS.length));

  const setLetter = (index: number, font: number | null) =>
    setActiveFont((prev) => prev.map((f, i) => (i === index ? font : f)));

  const handleEnter = (index: number) => {
    const font = nextFont.current[index] ?? 0;
    nextFont.current[index] = (font + 1) % HOVER_FONTS.length;
    setLetter(index, font);
  };

  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="sr-only">{text}</span>
      {letters.map((char, i) => {
        const font = activeFont[i];
        const active = font !== null && font !== undefined;
        return (
          <span
            key={i}
            aria-hidden
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={() => setLetter(i, null)}
            className="inline-flex h-[1.2em] min-w-[0.68em] cursor-default select-none items-center justify-center"
          >
            <span
              className={`inline-block leading-none tracking-normal transition-all duration-300 ease-out ${
                active ? HOVER_FONTS[font] : BASE_FONT
              }`}
              style={{
                color: active ? '#f49c3b' : '#f7f2ec',
                transform: active ? 'scale(1.08)' : 'scale(1)',
                textShadow: active ? '0 0 18px rgba(244,156,59,0.5)' : '0 0 0 rgba(244,156,59,0)',
              }}
            >
              {char}
            </span>
          </span>
        );
      })}
    </span>
  );
}

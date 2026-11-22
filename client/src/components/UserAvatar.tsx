import { useId, useMemo } from 'react';

function hashNickname(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getInitials(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9À-ÿ_\-\s]/g, '');
  if (!cleaned) return 'SK';
  const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  nickname,
  size = 'md',
  className = '',
}: {
  nickname: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const gradId = useId();
  const { initials, orbitRotation, nodeAngle } = useMemo(() => {
    const seed = hashNickname(nickname || 'Skillable');
    return {
      initials: getInitials(nickname),
      orbitRotation: seed % 360,
      nodeAngle: ((seed >> 4) % 360) * (Math.PI / 180),
    };
  }, [nickname]);

  const dimClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const dotClass = size === 'sm' ? 'h-2 w-2 -bottom-0.5 -right-0.5' : 'h-2.5 w-2.5 bottom-0 right-0';
  const nodeX = 24 + Math.cos(nodeAngle) * 19;
  const nodeY = 24 + Math.sin(nodeAngle) * 19;

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${dimClass} ${className}`}>
      <svg
        viewBox="0 0 48 48"
        className="h-full w-full overflow-visible drop-shadow-[0_0_10px_rgba(244,156,59,0.28)]"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={gradId} cx="35%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#3c4048" />
            <stop offset="62%" stopColor="#1d2028" />
            <stop offset="100%" stopColor="#14151a" />
          </radialGradient>
        </defs>

        {/* Anillo orbital exterior */}
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="#f49c3b"
          strokeOpacity="0.45"
          strokeWidth="1.25"
        />
        <g transform={`rotate(${orbitRotation} 24 24)`}>
          <circle
            cx="24"
            cy="24"
            r="19.5"
            fill="none"
            stroke="#7b8794"
            strokeOpacity="0.45"
            strokeWidth="0.9"
            strokeDasharray="18 8 4 8"
          />
        </g>

        {/* Disco principal */}
        <circle cx="24" cy="24" r="17" fill={`url(#${gradId})`} stroke="#f7f2ec" strokeOpacity="0.16" strokeWidth="1" />

        {/* Silueta cyber-editorial sutil de fondo */}
        <circle cx="24" cy="18.5" r="4.6" fill="#7b8794" fillOpacity="0.22" />
        <path
          d="M14.5 34.5c1.8-4.5 5.2-6.6 9.5-6.6s7.7 2.1 9.5 6.6"
          fill="none"
          stroke="#f49c3b"
          strokeOpacity="0.34"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Iniciales nítidas */}
        <text
          x="24"
          y="25.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#f7f2ec"
          fontSize="13.5"
          fontWeight="700"
          fontFamily="'Space Grotesk', system-ui, sans-serif"
          letterSpacing="0.06em"
        >
          {initials}
        </text>

        {/* Satélite orbital determinista */}
        <circle cx={nodeX} cy={nodeY} r="2.1" fill="#f49c3b" />
      </svg>

      {/* Indicador de estado en línea */}
      <span
        className={`absolute rounded-full border-2 border-[#14151a] bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.65)] ${dotClass}`}
      />
    </div>
  );
}

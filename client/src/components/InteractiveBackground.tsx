import { useEffect, useRef } from 'react';

type Particle = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
  ovx: number;
  ovy: number;
  driftPhase: number;
  driftFreq: number;
  driftAmp: number;
  radius: number;
  color: string;
  sides: number;
  angle: number;
  spin: number;
};

const MAX_OFFSET_VEL = 9;
const MAX_OFFSET = 145;
const SPRING_K = 0.012;
const MARGIN = 8;
const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * <InteractiveBackground />
 * Fondo de constelaciones en HTML5 Canvas 2D:
 * - Movimiento continuo garantizado (velocidad polar mínima + deriva sinusoidal orgánica).
 * - Repulsión elástica amortiguada tanto cuando el cursor se mueve como cuando permanece quieto.
 * - Retorno gradual al flujo natural al alejar el mouse.
 * - Strictly pointer-events-none escuchando window.mousemove / pointermove.
 */
export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rawPointer = { x: -1000, y: -1000, active: false };
    const pointer = { x: -1000, y: -1000 };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colors = ['247,242,236', '247,242,236', '123,135,148', '123,135,148', '244,156,59'];
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = performance.now();

    const drawPolygon = (particle: Particle) => {
      const size = particle.sides === 4 ? 5.6 : 5.4;
      context.beginPath();
      for (let point = 0; point < particle.sides; point += 1) {
        const angle = particle.angle + (point / particle.sides) * TAU - Math.PI / 2;
        const x = particle.x + Math.cos(angle) * size;
        const y = particle.y + Math.sin(angle) * size;
        if (point === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
    };

    const draw = (now: number) => {
      const dt = Math.min(2, Math.max(0.25, (now - lastTime) / 16.667));
      lastTime = now;

      if (rawPointer.active) {
        if (pointer.x < -500 || pointer.y < -500) {
          pointer.x = rawPointer.x;
          pointer.y = rawPointer.y;
        } else {
          const lerp = 1 - Math.pow(0.72, dt);
          pointer.x += (rawPointer.x - pointer.x) * lerp;
          pointer.y += (rawPointer.y - pointer.y) * lerp;
        }
      }

      context.clearRect(0, 0, width, height);

      const repulsionRadius = width < 640 ? 130 : 170;
      const damp = Math.pow(0.82, dt);
      const hasPointer = rawPointer.active && pointer.x > -500 && pointer.y > -500;

      if (hasPointer) {
        const cursorAura = context.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          repulsionRadius * 0.9,
        );
        cursorAura.addColorStop(0, 'rgba(244, 156, 59, 0.055)');
        cursorAura.addColorStop(0.55, 'rgba(244, 156, 59, 0.02)');
        cursorAura.addColorStop(1, 'rgba(244, 156, 59, 0)');
        context.fillStyle = cursorAura;
        context.beginPath();
        context.arc(pointer.x, pointer.y, repulsionRadius * 0.9, 0, TAU);
        context.fill();
      }

      if (!reduceMotion) {
        for (const particle of particles) {
          // 1. Flujo continuo en el espacio (nunca estático)
          particle.driftPhase += particle.driftFreq * dt;
          particle.baseX += (particle.vx + Math.cos(particle.driftPhase) * particle.driftAmp) * dt;
          particle.baseY +=
            (particle.vy + Math.sin(particle.driftPhase * 0.85) * particle.driftAmp) * dt;
          particle.angle += particle.spin * dt;

          if (particle.baseX < MARGIN) {
            particle.baseX = MARGIN;
            particle.vx = Math.abs(particle.vx);
          } else if (particle.baseX > width - MARGIN) {
            particle.baseX = width - MARGIN;
            particle.vx = -Math.abs(particle.vx);
          }

          if (particle.baseY < MARGIN) {
            particle.baseY = MARGIN;
            particle.vy = Math.abs(particle.vy);
          } else if (particle.baseY > height - MARGIN) {
            particle.baseY = height - MARGIN;
            particle.vy = -Math.abs(particle.vy);
          }

          // 2. Repulsión elástica alrededor del cursor (en movimiento o quieto)
          const currentX = clamp(particle.baseX + particle.ox, MARGIN, width - MARGIN);
          const currentY = clamp(particle.baseY + particle.oy, MARGIN, height - MARGIN);

          if (hasPointer) {
            const dx = currentX - pointer.x;
            const dy = currentY - pointer.y;
            const distance = Math.hypot(dx, dy);

            if (distance < repulsionRadius) {
              const falloff = 1 - distance / repulsionRadius;
              const push = falloff * (1.8 + 3.2 * falloff) * dt;
              if (distance > 0.5) {
                particle.ovx += (dx / distance) * push;
                particle.ovy += (dy / distance) * push;
              } else {
                particle.ovx += Math.cos(particle.driftPhase) * push;
                particle.ovy += Math.sin(particle.driftPhase) * push;
              }
            }
          }

          // 3. Fuerza restauradora elástica hacia el flujo base + amortiguación suave
          particle.ovx += -particle.ox * SPRING_K * dt;
          particle.ovy += -particle.oy * SPRING_K * dt;

          const oSpeed = Math.hypot(particle.ovx, particle.ovy);
          if (oSpeed > MAX_OFFSET_VEL) {
            const scale = MAX_OFFSET_VEL / oSpeed;
            particle.ovx *= scale;
            particle.ovy *= scale;
          }

          particle.ovx *= damp;
          particle.ovy *= damp;
          particle.ox += particle.ovx * dt;
          particle.oy += particle.ovy * dt;

          const oMag = Math.hypot(particle.ox, particle.oy);
          if (oMag > MAX_OFFSET) {
            const scale = MAX_OFFSET / oMag;
            particle.ox *= scale;
            particle.oy *= scale;
          }

          particle.x = clamp(particle.baseX + particle.ox, MARGIN, width - MARGIN);
          particle.y = clamp(particle.baseY + particle.oy, MARGIN, height - MARGIN);
        }
      }

      // Conexiones entre nodos cercanos y filamentos ámbar hacia el cursor
      const linkRadius = 135;
      const pointerLinkRadius = 210;

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        for (let next = i + 1; next < particles.length; next += 1) {
          const neighbor = particles[next];
          const distance = Math.hypot(particle.x - neighbor.x, particle.y - neighbor.y);
          if (distance < linkRadius) {
            const falloff = 1 - distance / linkRadius;
            context.strokeStyle = `rgba(123,135,148,${falloff * 0.24})`;
            context.lineWidth = 0.85;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(neighbor.x, neighbor.y);
            context.stroke();
          }
        }

        if (hasPointer) {
          const pointerDistance = Math.hypot(particle.x - pointer.x, particle.y - pointer.y);
          if (pointerDistance < pointerLinkRadius) {
            const falloff = 1 - pointerDistance / pointerLinkRadius;
            context.strokeStyle = `rgba(244,156,59,${falloff * 0.34})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(pointer.x, pointer.y);
            context.stroke();
          }
        }
      }

      // Nodos (puntos, triángulos y rombos)
      for (const particle of particles) {
        const isAccent = particle.color === '244,156,59';

        if (!particle.sides && (isAccent || particle.radius > 1.75)) {
          context.fillStyle = `rgba(${particle.color}, 0.16)`;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.radius * 3.1, 0, TAU);
          context.fill();
        }

        context.fillStyle = `rgba(${particle.color}, 0.86)`;
        context.strokeStyle = `rgba(${particle.color}, 0.84)`;
        context.lineWidth = 1.1;

        if (particle.sides) {
          drawPolygon(particle);
          context.stroke();
        } else {
          context.beginPath();
          context.arc(particle.x, particle.y, particle.radius, 0, TAU);
          context.fill();
        }
      }

      if (!reduceMotion) {
        frame = requestAnimationFrame(draw);
      }
    };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const amount = Math.max(28, Math.min(100, Math.floor((width * height) / 15500)));
      particles = Array.from({ length: amount }, () => {
        const baseX = MARGIN + Math.random() * Math.max(1, width - MARGIN * 2);
        const baseY = MARGIN + Math.random() * Math.max(1, height - MARGIN * 2);
        const angle = Math.random() * TAU;
        const speed = 0.24 + Math.random() * 0.28;
        const spinDir = Math.random() < 0.5 ? -1 : 1;

        return {
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          ox: 0,
          oy: 0,
          ovx: 0,
          ovy: 0,
          driftPhase: Math.random() * TAU,
          driftFreq: 0.014 + Math.random() * 0.016,
          driftAmp: 0.14,
          radius: Math.random() * 1.55 + 0.8,
          color: colors[Math.floor(Math.random() * colors.length)],
          sides: Math.random() < 0.22 ? (Math.random() < 0.5 ? 3 : 4) : 0,
          angle: Math.random() * TAU,
          spin: spinDir * (0.005 + Math.random() * 0.009),
        };
      });

      lastTime = performance.now();
      if (reduceMotion) draw(lastTime);
    };

    const movePointer = (event: MouseEvent | PointerEvent) => {
      rawPointer.x = event.clientX;
      rawPointer.y = event.clientY;
      rawPointer.active = true;
    };

    const hidePointer = () => {
      rawPointer.active = false;
      rawPointer.x = -1000;
      rawPointer.y = -1000;
      pointer.x = -1000;
      pointer.y = -1000;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', movePointer, { passive: true });
    window.addEventListener('pointermove', movePointer, { passive: true });
    window.addEventListener('blur', hidePointer);
    document.addEventListener('mouseleave', hidePointer);
    resize();
    if (!reduceMotion) {
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    }

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', movePointer);
      window.removeEventListener('pointermove', movePointer);
      window.removeEventListener('blur', hidePointer);
      document.removeEventListener('mouseleave', hidePointer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className="bg-tech-grid pointer-events-none fixed inset-0 z-0 h-full w-full overflow-hidden"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}

import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  sides: number;
};

/**
 * <InteractiveBackground />
 * Adaptación directa del código real en:
 *  - /references/bg-html/public/interactive-particles.html
 *  - /references/bg-react/src/App.tsx
 * Paleta SKILLABLE (CLAUDE.md):
 *  - Fondo: #14151a
 *  - Conexiones: #7b8794 (123, 135, 148)
 *  - Energía / Cursor: #f49c3b (244, 156, 59)
 *  - Nodos principales: #f7f2ec (247, 242, 236) y #7b8794 (123, 135, 148)
 */
export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const pointer = { x: -1000, y: -1000 };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colors = ['247,242,236', '247,242,236', '123,135,148', '123,135,148', '244,156,59'];
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;

    const polygon = (particle: Particle) => {
      context.beginPath();
      for (let point = 0; point < particle.sides; point += 1) {
        const angle = (point / particle.sides) * Math.PI * 2 - Math.PI / 2;
        const x = particle.x + Math.cos(angle) * 6;
        const y = particle.y + Math.sin(angle) * 6;
        if (point === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 140 && distance > 0) {
          particle.x += (dx / distance) * 1.5;
          particle.y += (dy / distance) * 1.5;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      }

      particles.forEach((particle, index) => {
        for (let next = index + 1; next < particles.length; next += 1) {
          const neighbor = particles[next];
          const distance = Math.hypot(particle.x - neighbor.x, particle.y - neighbor.y);
          if (distance < 125) {
            context.strokeStyle = `rgba(123,135,148,${(1 - distance / 125) * 0.22})`;
            context.lineWidth = 0.8;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(neighbor.x, neighbor.y);
            context.stroke();
          }
        }

        const pointerDistance = Math.hypot(particle.x - pointer.x, particle.y - pointer.y);
        if (pointerDistance < 190) {
          context.strokeStyle = `rgba(244,156,59,${(1 - pointerDistance / 190) * 0.38})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      });

      for (const particle of particles) {
        context.shadowBlur = width >= 768 ? 12 : 0;
        context.shadowColor = `rgb(${particle.color})`;
        context.fillStyle = `rgba(${particle.color},.85)`;
        context.strokeStyle = `rgba(${particle.color},.85)`;
        context.lineWidth = 1.1;

        if (particle.sides) {
          polygon(particle);
          context.stroke();
        } else {
          context.beginPath();
          context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.shadowBlur = 0;

      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const amount = Math.min(100, Math.floor((width * height) / 16000));
      particles = Array.from({ length: amount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.6 + 0.7,
        color: colors[Math.floor(Math.random() * colors.length)],
        sides: Math.random() < 0.14 ? 3 + Math.floor(Math.random() * 2) : 0,
      }));

      if (reduceMotion) draw();
    };

    const movePointer = (event: MouseEvent | PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const hidePointer = () => {
      pointer.x = -1000;
      pointer.y = -1000;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', movePointer);
    window.addEventListener('pointermove', movePointer);
    document.addEventListener('mouseleave', hidePointer);
    document.addEventListener('pointerleave', hidePointer);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', movePointer);
      window.removeEventListener('pointermove', movePointer);
      document.removeEventListener('mouseleave', hidePointer);
      document.removeEventListener('pointerleave', hidePointer);
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

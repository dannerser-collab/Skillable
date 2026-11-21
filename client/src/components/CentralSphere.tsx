import { useEffect, useRef } from 'react';

type Point3D = { x: number; y: number; z: number };

export type SphereAccent = 'default' | 'tree' | 'expedition' | 'arena';

const TAU = Math.PI * 2;

function rotate(point: Point3D, rotationX: number, rotationY: number): Point3D {
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const x1 = point.x * cosY - point.z * sinY;
  const z1 = point.x * sinY + point.z * cosY;
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);

  return {
    x: x1,
    y: point.y * cosX - z1 * sinX,
    z: point.y * sinX + z1 * cosX,
  };
}

/**
 * <CentralSphere />
 * Adaptación directa del código real en /references/sphere-react/src (1)/App.tsx
 * re-coloreado con #f49c3b (244,156,59), #f7f2ec (247,242,236), #7b8794 (123,135,148)
 * y #3c4048 (60,64,72), manteniendo su interactividad (arrastre + inclinación con cursor)
 * dentro de un contenedor acotado en el Hero para no bloquear ni tapar botones.
 */
export function CentralSphere({
  accent = 'default',
  className = '',
}: {
  accent?: SphereAccent;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentRef = useRef<SphereAccent>(accent);
  const pulseRef = useRef<number>(1);
  const pulseRgbRef = useRef<string>('244, 156, 59');

  useEffect(() => {
    accentRef.current = accent;
    if (accent !== 'default') {
      pulseRef.current = 0;
      pulseRgbRef.current =
        accent === 'tree'
          ? '123, 135, 148'
          : accent === 'expedition'
            ? '247, 242, 236'
            : '244, 156, 59';
    }
  }, [accent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let size = 0;
    let frame = 0;
    let rotationX = -0.18;
    let rotationY = 0;
    let targetX = rotationX;
    let targetY = rotationY;
    let dragging = false;
    let lastPointer = { x: 0, y: 0 };

    const stars = Array.from({ length: 120 }, (_, index) => {
      const phi = Math.acos(1 - 2 * ((index + 0.5) / 120));
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const radius = 1.38 + ((index * 47) % 29) / 75;

      return {
        x: Math.sin(phi) * Math.cos(theta) * radius,
        y: Math.cos(phi) * radius,
        z: Math.sin(phi) * Math.sin(theta) * radius,
        radius: index % 11 === 0 ? 1.7 : index % 4 === 0 ? 1.15 : 0.75,
      };
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      size = Math.min(width, height) * (width < 600 ? 0.28 : 0.26);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reducedMotion && width > 0 && height > 0) {
        render(performance.now());
      }
    };

    const project = (point: Point3D, radius = 1) => {
      const rotated = rotate(point, rotationX, rotationY);
      const perspective = 4.8 / (5.4 - rotated.z);
      return {
        x: width / 2 + rotated.x * size * radius * perspective,
        y: height / 2 + rotated.y * size * radius * perspective,
        z: rotated.z,
        scale: perspective,
      };
    };

    const drawSphere = (
      radius: number,
      color: string,
      opacity: number,
      time: number,
      wobble = 0,
    ) => {
      const longitudeCount = 18;
      const latitudeCount = 12;
      const points: ReturnType<typeof project>[][] = [];

      for (let latitude = 0; latitude <= latitudeCount; latitude += 1) {
        const phi = (latitude / latitudeCount - 0.5) * Math.PI;
        const row = [];
        for (let longitude = 0; longitude < longitudeCount; longitude += 1) {
          const theta = (longitude / longitudeCount) * TAU;
          const distortion =
            1 +
            wobble *
              (Math.sin(theta * 2.2 + time) +
                Math.sin(phi * 3.1 - time * 0.8) +
                Math.sin((theta + phi) * 2.7 + time * 0.45));
          row.push(
            project(
              {
                x: Math.cos(phi) * Math.cos(theta) * distortion,
                y: Math.sin(phi) * distortion,
                z: Math.cos(phi) * Math.sin(theta) * distortion,
              },
              radius,
            ),
          );
        }
        points.push(row);
      }

      context.lineWidth = radius > 0.9 ? 0.85 : 0.65;
      for (let latitude = 0; latitude <= latitudeCount; latitude += 1) {
        for (let longitude = 0; longitude < longitudeCount; longitude += 1) {
          const point = points[latitude][longitude];
          const nextLongitude = points[latitude][(longitude + 1) % longitudeCount];
          const nextLatitude = points[Math.min(latitude + 1, latitudeCount)][longitude];
          const depthOpacity = Math.max(0.12, (point.z + 1.4) / 2.8);
          context.strokeStyle = color.replace('ALPHA', String(opacity * depthOpacity));
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(nextLongitude.x, nextLongitude.y);
          if (latitude < latitudeCount) context.lineTo(nextLatitude.x, nextLatitude.y);
          context.stroke();
        }
      }
    };

    const drawRing = (radius: number, tiltX: number, tiltY: number, color: string) => {
      context.strokeStyle = color;
      context.lineWidth = 1;
      context.beginPath();
      for (let index = 0; index <= 180; index += 1) {
        const angle = (index / 180) * TAU;
        let point: Point3D = { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius };
        point = rotate(point, tiltX, tiltY);
        const projected = project(point);
        if (index === 0) context.moveTo(projected.x, projected.y);
        else context.lineTo(projected.x, projected.y);
      }
      context.stroke();
    };

    const render = (now: number) => {
      const activeAccent = accentRef.current;
      const time = reducedMotion ? 0 : now / 1000;
      if (!dragging && !reducedMotion) {
        targetY += activeAccent === 'default' ? 0.0018 : 0.003;
      }
      rotationX += (targetX - rotationX) * 0.075;
      rotationY += (targetY - rotationY) * 0.075;

      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(
        width / 2,
        height / 2,
        size * 0.05,
        width / 2,
        height / 2,
        size * 1.55,
      );
      glow.addColorStop(0, 'rgba(60, 64, 72, .32)');
      glow.addColorStop(
        0.55,
        activeAccent === 'arena' ? 'rgba(244, 156, 59, .09)' : 'rgba(244, 156, 59, .045)',
      );
      glow.addColorStop(1, 'rgba(20, 21, 26, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      if (pulseRef.current < 1) {
        pulseRef.current = Math.min(1, pulseRef.current + 0.025);
        const p = pulseRef.current;
        context.strokeStyle = `rgba(${pulseRgbRef.current}, ${(1 - p) * 0.5})`;
        context.lineWidth = 1.4;
        context.beginPath();
        context.arc(width / 2, height / 2, size * (0.85 + p * 1.15), 0, TAU);
        context.stroke();
      }

      drawSphere(0.72, 'rgba(60, 64, 72, ALPHA)', 0.72, time, 0);
      drawSphere(
        0.77,
        'rgba(244, 156, 59, ALPHA)',
        activeAccent === 'arena' ? 0.92 : 0.78,
        time,
        0,
      );
      drawSphere(
        1.04,
        'rgba(247, 242, 236, ALPHA)',
        activeAccent === 'expedition' ? 0.85 : 0.72,
        time,
        0.025,
      );

      drawRing(
        1.42,
        1.05,
        -0.5,
        activeAccent === 'expedition' ? 'rgba(247,242,236,.68)' : 'rgba(247,242,236,.5)',
      );
      drawRing(
        1.68,
        0.5,
        0.8,
        activeAccent === 'arena' ? 'rgba(244,156,59,.72)' : 'rgba(244,156,59,.48)',
      );
      drawRing(
        1.9,
        1.42,
        0.15,
        activeAccent === 'tree' ? 'rgba(123,135,148,.65)' : 'rgba(123,135,148,.35)',
      );

      const sortedStars = stars
        .map((star) => ({ ...project(star), radius: star.radius }))
        .sort((a, b) => a.z - b.z);

      for (const star of sortedStars) {
        const alpha = Math.max(0.22, (star.z + 2.4) / 4.8);
        context.fillStyle =
          star.radius > 1.5
            ? `rgba(244,156,59,${alpha})`
            : star.radius > 1
              ? `rgba(247,242,236,${alpha})`
              : `rgba(123,135,148,${alpha})`;
        context.shadowBlur = star.radius > 1.5 ? 10 : 5;
        context.shadowColor =
          star.radius > 1.5 ? '#f49c3b' : star.radius > 1 ? '#f7f2ec' : '#7b8794';
        context.beginPath();
        context.arc(star.x, star.y, star.radius * star.scale, 0, TAU);
        context.fill();
      }
      context.shadowBlur = 0;

      const orbiters = [
        { radius: 1.47, speed: 0.55, phase: 0, color: '#f49c3b', sides: 4 },
        { radius: 1.72, speed: -0.38, phase: 2.1, color: '#f7f2ec', sides: 3 },
        { radius: 1.9, speed: 0.26, phase: 4.2, color: '#7b8794', sides: 6 },
      ];
      for (const orbiter of orbiters) {
        const angle = time * orbiter.speed + orbiter.phase;
        const point = project({
          x: Math.cos(angle) * orbiter.radius,
          y: Math.sin(angle * 1.3 + orbiter.phase) * 0.5,
          z: Math.sin(angle) * orbiter.radius,
        });
        const orbitSize = 5 + point.scale * 3;
        context.strokeStyle = orbiter.color;
        context.lineWidth = 1.2;
        context.shadowBlur = 10;
        context.shadowColor = orbiter.color;
        context.beginPath();
        for (let side = 0; side < orbiter.sides; side += 1) {
          const sideAngle = (side / orbiter.sides) * TAU - Math.PI / 2;
          const x = point.x + Math.cos(sideAngle) * orbitSize;
          const y = point.y + Math.sin(sideAngle) * orbitSize;
          if (side === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.stroke();
      }
      context.shadowBlur = 0;

      if (!reducedMotion) frame = requestAnimationFrame(render);
    };

    const pointerDown = (event: PointerEvent) => {
      dragging = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
    };

    const pointerMove = (event: PointerEvent) => {
      if (dragging) {
        targetY += (event.clientX - lastPointer.x) * 0.008;
        targetX += (event.clientY - lastPointer.y) * 0.006;
        targetX = Math.max(-1.1, Math.min(1.1, targetX));
        lastPointer = { x: event.clientX, y: event.clientY };
        if (reducedMotion) {
          rotationX = targetX;
          rotationY = targetY;
          render(performance.now());
        }
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(width, 1) - 0.5;
      const y = (event.clientY - rect.top) / Math.max(height, 1) - 0.5;
      targetY += (x * 0.55 - (targetY - rotationY)) * 0.025;
      targetX = -0.18 + Math.max(-0.6, Math.min(0.6, y)) * 0.36;
      if (reducedMotion && width > 0 && height > 0) {
        render(performance.now());
      }
    };

    const pointerUp = () => {
      dragging = false;
      canvas.classList.remove('is-dragging');
    };

    resize();
    render(0);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
    };
  }, []);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="sphere-canvas block h-full w-full"
        aria-label="Planeta abstracto interactivo. Arrastra para rotarlo."
        role="img"
      />
    </div>
  );
}

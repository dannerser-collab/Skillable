import { useEffect, useRef, type RefObject } from 'react';

type Point3D = { x: number; y: number; z: number };

export type SphereAccent = 'default' | 'tree' | 'expedition' | 'arena';

export type CentralSphereHandle = {
  applyDrag: (dx: number, dy: number) => void;
  setDragging: (active: boolean) => void;
};

const TAU = Math.PI * 2;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

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
 * Proyección vectorial 3D full-viewport en HTML5 Canvas 2D con DPR nativo:
 * - Reposo: rotación autónoma lenta, fluida y orgánica con oscilación suave.
 * - Mouse / Arrastre: alta inercia y amortiguación (lerp 0.04 a 60 FPS) para rotar con peso.
 * - Hover: anillos orbitales que se expanden suavemente con halo exterior ámbar.
 * - Clic (expanded): expansión por spring críticamente amortiguado, sin pixelarse ni cortarse.
 */
export function CentralSphere({
  expanded = false,
  hovered = false,
  accent = 'default',
  controlRef,
  className = '',
}: {
  expanded?: boolean;
  hovered?: boolean;
  accent?: SphereAccent;
  controlRef?: RefObject<CentralSphereHandle | null>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const expandedRef = useRef<boolean>(expanded);
  const prevExpandedRef = useRef<boolean>(expanded);
  const hoveredRef = useRef<boolean>(hovered);
  const accentRef = useRef<SphereAccent>(accent);
  const pulseRef = useRef<number>(1);
  const pulseRgbRef = useRef<string>('244, 156, 59');
  const renderNowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    expandedRef.current = expanded;
    if (!prevExpandedRef.current && expanded) {
      pulseRef.current = 0;
      pulseRgbRef.current = '244, 156, 59';
    }
    prevExpandedRef.current = expanded;
    renderNowRef.current?.();
  }, [expanded]);

  useEffect(() => {
    hoveredRef.current = hovered;
    renderNowRef.current?.();
  }, [hovered]);

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
    renderNowRef.current?.();
  }, [accent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = performance.now();

    let rotationX = -0.18;
    let rotationY = 0;
    let autoY = 0;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dragVelX = 0;
    let dragVelY = 0;
    let isDragging = false;

    let pointerOffsetX = 0;
    let pointerOffsetY = 0;
    let pointerProximity = 0;

    let hoverProgress = hoveredRef.current && !expandedRef.current ? 1 : 0;
    let expandProgress = expandedRef.current ? 1 : 0;
    let expandVelocity = 0;

    if (controlRef) {
      controlRef.current = {
        applyDrag: (dx: number, dy: number) => {
          const dY = dx * 0.0042;
          const dX = dy * 0.0034;
          dragOffsetY += dY;
          dragOffsetX = Math.max(-1.05, Math.min(1.05, dragOffsetX + dX));
          dragVelY = dragVelY * 0.5 + dY * 0.5;
          dragVelX = dragVelX * 0.5 + dX * 0.5;
          if (reducedMotion && width > 0 && height > 0) {
            rotationY = autoY + dragOffsetY;
            rotationX = -0.18 + dragOffsetX;
            renderFrame(performance.now());
          }
        },
        setDragging: (active: boolean) => {
          isDragging = active;
        },
      };
    }

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
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reducedMotion) {
        renderFrame(performance.now());
      }
    };

    const project = (point: Point3D, size: number, radius = 1) => {
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
      size: number,
      radius: number,
      color: string,
      opacity: number,
      time: number,
      wobble = 0,
      lineWidth = 0.75,
    ) => {
      const longitudeCount = 18;
      const latitudeCount = 12;
      const points: ReturnType<typeof project>[][] = [];
      const t = time * 0.52;

      for (let latitude = 0; latitude <= latitudeCount; latitude += 1) {
        const phi = (latitude / latitudeCount - 0.5) * Math.PI;
        const row = [];
        for (let longitude = 0; longitude < longitudeCount; longitude += 1) {
          const theta = (longitude / longitudeCount) * TAU;
          const distortion =
            1 +
            wobble *
              (Math.sin(theta * 2.2 + t) +
                Math.sin(phi * 3.1 - t * 0.8) +
                Math.sin((theta + phi) * 2.7 + t * 0.45));
          row.push(
            project(
              {
                x: Math.cos(phi) * Math.cos(theta) * distortion,
                y: Math.sin(phi) * distortion,
                z: Math.cos(phi) * Math.sin(theta) * distortion,
              },
              size,
              radius,
            ),
          );
        }
        points.push(row);
      }

      context.lineWidth = lineWidth;
      for (let latitude = 0; latitude <= latitudeCount; latitude += 1) {
        for (let longitude = 0; longitude < longitudeCount; longitude += 1) {
          const point = points[latitude][longitude];
          const nextLongitude = points[latitude][(longitude + 1) % longitudeCount];
          const nextLatitude = points[Math.min(latitude + 1, latitudeCount)][longitude];
          const depthOpacity = Math.max(0.12, (point.z + 1.4) / 2.8);
          context.strokeStyle = color.replace('ALPHA', (opacity * depthOpacity).toFixed(3));
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(nextLongitude.x, nextLongitude.y);
          if (latitude < latitudeCount) context.lineTo(nextLatitude.x, nextLatitude.y);
          context.stroke();
        }
      }
    };

    const drawRing = (
      size: number,
      radius: number,
      tiltX: number,
      tiltY: number,
      color: string,
      lineWidth = 1,
    ) => {
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.beginPath();
      for (let index = 0; index <= 180; index += 1) {
        const angle = (index / 180) * TAU;
        let point: Point3D = { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius };
        point = rotate(point, tiltX, tiltY);
        const projected = project(point, size);
        if (index === 0) context.moveTo(projected.x, projected.y);
        else context.lineTo(projected.x, projected.y);
      }
      context.stroke();
    };

    const renderFrame = (now: number) => {
      const dtSec = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      const dt60 = dtSec * 60;
      lastTime = now;

      const isExpanded = expandedRef.current;
      const isHovered = hoveredRef.current;
      const activeAccent = accentRef.current;
      const time = reducedMotion ? 0 : now / 1000;

      if (reducedMotion) {
        hoverProgress = isHovered && !isExpanded ? 1 : 0;
        expandProgress = isExpanded ? 1 : 0;
        expandVelocity = 0;
      } else {
        const hoverTarget = isHovered && !isExpanded ? 1 : 0;
        hoverProgress += (hoverTarget - hoverProgress) * (1 - Math.exp(-7 * dtSec));

        const expandTarget = isExpanded ? 1 : 0;
        const stiffness = 120;
        const damping = 19;
        const accel = stiffness * (expandTarget - expandProgress) - damping * expandVelocity;
        expandVelocity += accel * dtSec;
        expandProgress = Math.max(-0.02, Math.min(1.06, expandProgress + expandVelocity * dtSec));
        if (Math.abs(expandTarget - expandProgress) < 0.0008 && Math.abs(expandVelocity) < 0.002) {
          expandProgress = expandTarget;
          expandVelocity = 0;
        }
      }

      const clampedExpand = Math.max(0, Math.min(1, expandProgress));
      const minDim = Math.min(width, height);
      const restSize = minDim * (width < 640 ? 0.195 : 0.168);
      const expandedSize = minDim * (width < 640 ? 0.315 : 0.305);
      const breathe = reducedMotion
        ? 1
        : 1 + Math.sin(time * 0.85) * 0.018 * (1 - clampedExpand * 0.65);
      const hoverScale = 1 + hoverProgress * 0.05;
      const size = lerp(restSize, expandedSize, expandProgress) * breathe * hoverScale;

      if (!reducedMotion) {
        const baseSpin =
          activeAccent !== 'default'
            ? 0.0017
            : isExpanded
              ? 0.0011
              : 0.00135 + hoverProgress * 0.0005;

        if (!isDragging) {
          autoY += baseSpin * dt60;
          dragOffsetY += dragVelY * dt60;
          dragOffsetX = Math.max(-1.05, Math.min(1.05, dragOffsetX + dragVelX * dt60));
          const coastDecay = Math.pow(0.95, dt60);
          dragVelY *= coastDecay;
          dragVelX *= coastDecay;
        } else {
          const holdDecay = Math.pow(0.82, dt60);
          dragVelY *= holdDecay;
          dragVelX *= holdDecay;
        }

        const organicX = Math.sin(time * 0.35) * 0.055 * (1 - clampedExpand * 0.5);
        const tiltWeight = (0.35 + 0.65 * pointerProximity) * (1 - clampedExpand * 0.45);
        const desiredX = -0.18 + organicX + dragOffsetX + pointerOffsetY * 0.24 * tiltWeight;
        const desiredY = autoY + dragOffsetY + pointerOffsetX * 0.34 * tiltWeight;

        // Alta inercia y amortiguación (factor 0.04 a 60 FPS) para sensación pesada y fluida
        const inertiaLerp = 1 - Math.pow(1 - 0.04, dt60);
        rotationX += (desiredX - rotationX) * inertiaLerp;
        rotationY += (desiredY - rotationY) * inertiaLerp;
      }

      context.clearRect(0, 0, width, height);

      // Resplandor atmosférico base alrededor de la esfera
      const glow = context.createRadialGradient(
        width / 2,
        height / 2,
        size * 0.06,
        width / 2,
        height / 2,
        size * 1.65,
      );
      glow.addColorStop(0, `rgba(60, 64, 72, ${0.32 - clampedExpand * 0.12})`);
      glow.addColorStop(
        0.55,
        activeAccent === 'arena'
          ? 'rgba(244, 156, 59, 0.11)'
          : `rgba(244, 156, 59, ${0.05 + hoverProgress * 0.055 + clampedExpand * 0.035})`,
      );
      glow.addColorStop(1, 'rgba(20, 21, 26, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      // Onda radial expansiva al clic o al cambiar acento
      if (pulseRef.current < 1) {
        pulseRef.current = Math.min(1, pulseRef.current + (reducedMotion ? 1 : dtSec * 1.35));
        const p = pulseRef.current;
        const easedP = 1 - Math.pow(1 - p, 3);
        context.strokeStyle = `rgba(${pulseRgbRef.current}, ${(1 - p) * 0.58})`;
        context.lineWidth = 1.6;
        context.beginPath();
        context.arc(width / 2, height / 2, size * (0.85 + easedP * 1.05), 0, TAU);
        context.stroke();
      }

      // Mallas 3D de la esfera
      const wireFade = 1 - clampedExpand * 0.42;
      const coreLineW = 0.65 + clampedExpand * 0.15;
      const outerLineW = 0.85 + hoverProgress * 0.18 + clampedExpand * 0.12;

      drawSphere(size, 0.72, 'rgba(60, 64, 72, ALPHA)', 0.72 * wireFade, time, 0, coreLineW);
      drawSphere(
        size,
        0.77,
        'rgba(244, 156, 59, ALPHA)',
        (activeAccent === 'arena' ? 0.92 : 0.78 + hoverProgress * 0.14) * (1 - clampedExpand * 0.36),
        time,
        0,
        coreLineW,
      );
      drawSphere(
        size,
        1.04,
        'rgba(247, 242, 236, ALPHA)',
        (activeAccent === 'expedition' ? 0.85 : 0.72 + hoverProgress * 0.12) * wireFade,
        time,
        0.025,
        outerLineW,
      );

      // Viñeta oscura central cuando está expandida para legibilidad
      if (clampedExpand > 0.02) {
        const centerMask = context.createRadialGradient(
          width / 2,
          height / 2,
          size * 0.08,
          width / 2,
          height / 2,
          size * 1.18,
        );
        centerMask.addColorStop(0, `rgba(20, 21, 26, ${0.64 * clampedExpand})`);
        centerMask.addColorStop(0.65, `rgba(20, 21, 26, ${0.4 * clampedExpand})`);
        centerMask.addColorStop(1, 'rgba(20, 21, 26, 0)');
        context.fillStyle = centerMask;
        context.beginPath();
        context.arc(width / 2, height / 2, size * 1.2, 0, TAU);
        context.fill();
      }

      // Anillos orbitales con precesión muy lenta y orgánica
      const ringLineWidth = 1 + hoverProgress * 0.55 + clampedExpand * 0.35;
      const ring1Radius = lerp(1.38 + 0.18 * hoverProgress, 1.24, expandProgress);
      const ring2Radius = lerp(1.62 + 0.24 * hoverProgress, 1.38, expandProgress);
      const ring3Radius = lerp(1.84 + 0.28 * hoverProgress, 1.5, expandProgress);
      const ringPrecession1 = Math.sin(time * 0.28) * 0.035;
      const ringPrecession2 = Math.cos(time * 0.22) * 0.035;
      const ringPrecession3 = Math.sin(time * 0.18 + 1.1) * 0.035;

      drawRing(
        size,
        ring1Radius,
        1.05 + ringPrecession1,
        -0.5 + ringPrecession2 * 0.6,
        `rgba(247,242,236,${activeAccent === 'expedition' ? 0.76 : 0.5 + hoverProgress * 0.22 + clampedExpand * 0.14})`,
        ringLineWidth,
      );
      drawRing(
        size,
        ring2Radius,
        0.5 + ringPrecession2,
        0.8 - ringPrecession1 * 0.6,
        `rgba(244,156,59,${activeAccent === 'arena' ? 0.82 : 0.5 + hoverProgress * 0.26 + clampedExpand * 0.18})`,
        ringLineWidth,
      );
      drawRing(
        size,
        ring3Radius,
        1.42 + ringPrecession3,
        0.15 + ringPrecession1 * 0.5,
        `rgba(123,135,148,${activeAccent === 'tree' ? 0.74 : 0.38 + hoverProgress * 0.24 + clampedExpand * 0.16})`,
        ringLineWidth,
      );

      // 4.º halo orbital exterior al hacer hover sobre la esfera en reposo
      if (hoverProgress > 0.02) {
        drawRing(
          size,
          2.28,
          0.78 + ringPrecession2 * 0.5,
          -0.65,
          `rgba(244,156,59,${hoverProgress * (1 - clampedExpand * 0.55) * 0.34})`,
          0.95,
        );
      }

      // Estrellas Fibonacci ordenadas por profundidad Z
      const starSpread = lerp(1, 0.88, clampedExpand);
      const sortedStars = stars
        .map((star) => ({
          ...project({ x: star.x * starSpread, y: star.y * starSpread, z: star.z * starSpread }, size),
          radius: star.radius,
        }))
        .sort((a, b) => a.z - b.z);

      for (const star of sortedStars) {
        const baseAlpha = Math.max(0.2, (star.z + 2.4) / 4.8);
        const alpha = baseAlpha * (1 - clampedExpand * 0.25);
        const starR = star.radius * star.scale;
        const rgb =
          star.radius > 1.5 ? '244,156,59' : star.radius > 1 ? '247,242,236' : '123,135,148';

        if (star.radius > 1.4) {
          context.fillStyle = `rgba(${rgb},${alpha * 0.22})`;
          context.beginPath();
          context.arc(star.x, star.y, starR * 2.5, 0, TAU);
          context.fill();
        }

        context.fillStyle = `rgba(${rgb},${alpha})`;
        context.beginPath();
        context.arc(star.x, star.y, starR, 0, TAU);
        context.fill();
      }

      // Orbitadores geométricos lentos
      const orbitSpread = lerp(1 + hoverProgress * 0.1, 0.84, clampedExpand);
      const orbiters = [
        { radius: 1.47 * orbitSpread, speed: 0.34, phase: 0, color: 'rgba(244,156,59,0.92)', sides: 4 },
        { radius: 1.72 * orbitSpread, speed: -0.24, phase: 2.1, color: 'rgba(247,242,236,0.9)', sides: 3 },
        { radius: 1.9 * orbitSpread, speed: 0.17, phase: 4.2, color: 'rgba(123,135,148,0.9)', sides: 6 },
      ];

      for (const orbiter of orbiters) {
        const angle = time * orbiter.speed + orbiter.phase;
        const point = project(
          {
            x: Math.cos(angle) * orbiter.radius,
            y: Math.sin(angle * 1.3 + orbiter.phase) * 0.5,
            z: Math.sin(angle) * orbiter.radius,
          },
          size,
        );
        const orbitSize = 5 + point.scale * 3;
        context.strokeStyle = orbiter.color;
        context.lineWidth = 1.25;
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

      if (!reducedMotion) {
        frame = requestAnimationFrame(renderFrame);
      }
    };

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (width <= 0 || height <= 0) return;
      pointerOffsetX = Math.max(-0.5, Math.min(0.5, event.clientX / width - 0.5));
      pointerOffsetY = Math.max(-0.5, Math.min(0.5, event.clientY / height - 0.5));
      const distFromCenter = Math.hypot(event.clientX - width / 2, event.clientY - height / 2);
      const proximityRadius = Math.max(180, Math.min(width, height) * 0.48);
      pointerProximity = Math.max(0, 1 - distFromCenter / proximityRadius);
    };

    renderNowRef.current = () => {
      if (reducedMotion && width > 0 && height > 0) {
        renderFrame(performance.now());
      }
    };

    resize();
    lastTime = performance.now();
    if (reducedMotion) {
      renderFrame(lastTime);
    } else {
      frame = requestAnimationFrame(renderFrame);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });

    return () => {
      if (controlRef) {
        controlRef.current = null;
      }
      renderNowRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handleWindowPointerMove);
    };
  }, [controlRef]);

  return (
    <div className={`pointer-events-none relative h-full w-full ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="pointer-events-none block h-full w-full" />
    </div>
  );
}

export const STUDIO_EASE = [0.22, 1, 0.36, 1] as const;

export const STUDIO_EASE_SNAPPY = [0.16, 1, 0.3, 1] as const;

export const STUDIO_SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 0.9,
};

export const VIEW_VARIANTS = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.99 },
};

export const VIEW_TRANSITION = {
  duration: 0.32,
  ease: STUDIO_EASE,
};

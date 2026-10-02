import type { Transition, Variants } from "framer-motion";

// Shared motion presets so every screen moves the same way.

export const spring: Transition = { type: "spring", stiffness: 380, damping: 30, mass: 0.8 };

export const softSpring: Transition = { type: "spring", stiffness: 200, damping: 26 };

export const easeOut: Transition = { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: easeOut },
};

export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: spring },
};

export function stagger(staggerChildren = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren, delayChildren } },
  };
}

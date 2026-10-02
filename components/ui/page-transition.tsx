"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { easeOut, fadeUp, stagger } from "@/lib/motion";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={easeOut}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className }: PageTransitionProps) {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger()} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: PageTransitionProps) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export function FloatingElement({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type DelayedProps = PageTransitionProps & { delay?: number };

export function SlideInFromLeft({ children, className, delay = 0 }: DelayedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...easeOut, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideInFromRight({ children, className, delay = 0 }: DelayedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...easeOut, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, className, delay = 0 }: DelayedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...easeOut, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Reveals children once when scrolled into view. */
export function Reveal({ children, className, delay = 0 }: DelayedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ ...easeOut, duration: 0.55, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

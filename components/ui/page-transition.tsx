"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02,
  },
};

const pageTransition = {
  type: "tween" as const,
  ease: "anticipate" as const,
  duration: 0.5,
};

export function PageTransition({ children, className }: PageTransitionProps) {
  try {
    return (
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    );
  } catch (error) {
    console.error("PageTransition error:", error);
    return <div className={className}>{children}</div>;
  }
}

export function StaggerContainer({ children, className }: PageTransitionProps) {
  try {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        className={className}
      >
        {children}
      </motion.div>
    );
  } catch (error) {
    console.error("StaggerContainer error:", error);
    return <div className={className}>{children}</div>;
  }
}

export function StaggerItem({ children, className }: PageTransitionProps) {
  try {
    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    );
  } catch (error) {
    console.error("StaggerItem error:", error);
    return <div className={className}>{children}</div>;
  }
}

export function FloatingElement({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideInFromLeft({ children, className, delay = 0 }: PageTransitionProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideInFromRight({ children, className, delay = 0 }: PageTransitionProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, className, delay = 0 }: PageTransitionProps & { delay?: number }) {
  try {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    );
  } catch (error) {
    console.error("ScaleIn error:", error);
    return <div className={className}>{children}</div>;
  }
}
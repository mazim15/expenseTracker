"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Illustration } from "@/components/ui/illustration";
import { fadeUp, stagger } from "@/lib/motion";

interface StatusScreenProps {
  image: string;
  fallbackIcon: ReactNode;
  code?: string;
  title: string;
  description: string;
  actions: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Full-page illustrated message used for 404 and error screens. */
export function StatusScreen({
  image,
  fallbackIcon,
  code,
  title,
  description,
  actions,
  children,
  className = "min-h-screen",
}: StatusScreenProps) {
  return (
    <div className={`gradient-mesh flex items-center justify-center p-6 ${className}`}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger(0.08)}
        className="flex max-w-md flex-col items-center text-center"
      >
        <motion.div variants={fadeUp} className="animate-float mb-6">
          <Illustration
            src={image}
            width={220}
            height={220}
            className="drop-shadow-2xl"
            fallback={
              <span className="bg-primary/12 text-primary inline-flex h-24 w-24 items-center justify-center rounded-[2rem] [&>svg]:h-11 [&>svg]:w-11">
                {fallbackIcon}
              </span>
            }
          />
        </motion.div>
        {code && (
          <motion.p
            variants={fadeUp}
            className="gradient-text text-6xl font-extrabold tracking-tighter"
          >
            {code}
          </motion.p>
        )}
        <motion.h1 variants={fadeUp} className="mt-2 text-2xl font-extrabold tracking-tight">
          {title}
        </motion.h1>
        <motion.p variants={fadeUp} className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {description}
        </motion.p>
        {children && (
          <motion.div variants={fadeUp} className="mt-4 w-full">
            {children}
          </motion.div>
        )}
        <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-2">
          {actions}
        </motion.div>
      </motion.div>
    </div>
  );
}

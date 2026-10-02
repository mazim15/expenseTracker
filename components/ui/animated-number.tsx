"use client";

import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  /** Defaults to currency formatting via formatCurrency. */
  format?: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, format = formatCurrency, className }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(reduceMotion ? value : 0, { stiffness: 90, damping: 22 });
  const display = useTransform(spring, (v) => format(v));

  useEffect(() => {
    if (reduceMotion) spring.jump(value);
    else spring.set(value);
  }, [spring, value, reduceMotion]);

  return <motion.span className={className ?? "tabular-nums"}>{display}</motion.span>;
}

"use client";

import { motion } from "framer-motion";
import { easeOut } from "@/lib/motion";

// Re-mounts on every navigation, so each page fades up as it arrives.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={easeOut}>
      {children}
    </motion.div>
  );
}

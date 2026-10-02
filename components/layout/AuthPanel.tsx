"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { BrandMark } from "./Brand";

const TIPS = [
  {
    title: "Snap it, done.",
    body: "Scan a receipt and let AI fill in the amount, date and category for you.",
  },
  {
    title: "See the whole month at a glance.",
    body: "The spending calendar shows your heavy days before they become a habit.",
  },
  {
    title: "Small leaks, found early.",
    body: "Category insights point out where your money quietly slips away.",
  },
];

/** Left-hand illustrated panel on the auth screens (lg and up). */
export function AuthPanel() {
  const [index, setIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const tip = TIPS[index];

  return (
    <div className="bg-hero relative hidden overflow-hidden rounded-[2rem] lg:flex lg:flex-col">
      {!imageFailed && (
        <Image
          src="/illustrations/auth-panel.png"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
      {imageFailed && (
        <>
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="bg-highlight/30 absolute bottom-10 -left-20 h-72 w-72 rounded-full blur-3xl" />
          <Wallet
            className="animate-float absolute right-12 bottom-40 h-48 w-48 opacity-20"
            strokeWidth={1}
          />
        </>
      )}

      <div className="relative z-10 flex h-full flex-col p-10">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[15px] font-extrabold tracking-tight">ExpenseTracker</span>
        </Link>

        <div className="mt-auto max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              className="rounded-3xl bg-black/15 p-6 backdrop-blur-md"
            >
              <p className="text-2xl font-extrabold tracking-tight">{tip.title}</p>
              <p className="mt-2 text-sm leading-relaxed opacity-85">{tip.body}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-5 flex gap-1.5">
            {TIPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show tip ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full bg-white transition-all duration-300 ${
                  i === index ? "w-8 opacity-100" : "w-3 opacity-40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

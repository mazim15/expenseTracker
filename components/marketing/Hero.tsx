"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, Receipt, Sparkles, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import { fadeUp, stagger, softSpring } from "@/lib/motion";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const chipAY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const chipBY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="gradient-mesh pointer-events-none absolute inset-0" />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 md:pt-20 lg:grid-cols-2 lg:pb-28">
        <motion.div initial="hidden" animate="visible" variants={stagger(0.09)}>
          <motion.span
            variants={fadeUp}
            className="bg-card shadow-soft inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            <span className="bg-highlight text-highlight-foreground rounded-full p-1">
              <Sparkles className="h-3 w-3" />
            </span>
            Receipt scanning now powered by AI
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mt-6 text-4xl leading-[1.05] font-extrabold tracking-tight text-balance md:text-6xl"
          >
            Know where every <span className="highlight">rupee</span> goes.{" "}
            <span className="gradient-text">Effortlessly.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-muted-foreground mt-6 max-w-lg text-lg text-pretty"
          >
            Log expenses in seconds, snap receipts, and watch clear, beautiful insights build
            themselves — all in one calm, fast dashboard.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Start tracking free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
          >
            <span className="flex items-center gap-1.5">
              <Check className="text-primary h-4 w-4" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="text-primary h-4 w-4" /> Free forever tier
            </span>
          </motion.p>
        </motion.div>

        <div className="relative mx-auto w-full max-w-md py-12 lg:max-w-none">
          <div className="bg-primary/25 absolute inset-10 rounded-full blur-3xl" />
          <motion.div
            style={{ y: artY }}
            initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ ...softSpring, delay: 0.2 }}
            className="relative"
          >
            <div className="animate-float">
              <Illustration
                src="/illustrations/hero.png"
                width={640}
                height={640}
                priority
                sizes="(min-width: 1024px) 560px, 90vw"
                className="mx-auto h-auto w-full max-w-[560px] drop-shadow-2xl"
                fallback={<HeroMock />}
              />
            </div>
          </motion.div>

          <motion.div
            style={{ y: chipAY }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...softSpring, delay: 0.55 }}
            className="glassmorphism shadow-lift absolute top-0 left-0 z-10 flex items-center gap-2.5 rounded-2xl px-3 py-2.5 lg:left-4"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600">
              <Receipt className="h-4 w-4" />
            </span>
            <div className="text-xs">
              <p className="font-bold">Receipt scanned</p>
              <p className="text-muted-foreground">3 items detected</p>
            </div>
          </motion.div>

          <motion.div
            style={{ y: chipBY }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...softSpring, delay: 0.7 }}
            className="glassmorphism shadow-lift absolute right-0 bottom-0 z-10 flex items-center gap-2.5 rounded-2xl px-3 py-2.5 lg:right-4"
          >
            <span className="bg-highlight text-highlight-foreground inline-flex h-9 w-9 items-center justify-center rounded-xl">
              <TrendingDown className="h-4 w-4" />
            </span>
            <div className="text-xs">
              <p className="font-bold">12% less spent</p>
              <p className="text-muted-foreground">than last month</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Stand-in for the hero illustration: a mini dashboard card. */
function HeroMock() {
  const bars = [38, 62, 45, 80, 56, 92];
  return (
    <div className="bg-card shadow-lift mx-auto w-full max-w-sm rounded-[2rem] border p-5">
      <div className="bg-hero rounded-3xl p-5">
        <p className="text-xs font-medium opacity-80">Spent this month</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">₨ 48,250</p>
        <div className="mt-4 flex h-16 items-end gap-2">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.8, delay: 0.4 + i * 0.08, ease: "easeOut" }}
              className={
                i === bars.length - 1
                  ? "bg-highlight flex-1 rounded-md"
                  : "flex-1 rounded-md bg-white/35"
              }
            />
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {[
          { t: "Groceries", c: "bg-orange-500/15", a: "₨ 4,320" },
          { t: "Fuel", c: "bg-emerald-500/15", a: "₨ 2,800" },
          { t: "Netflix", c: "bg-pink-500/15", a: "₨ 1,100" },
        ].map((row) => (
          <div key={row.t} className="flex items-center gap-3">
            <span className={`h-10 w-10 rounded-2xl ${row.c}`} />
            <span className="flex-1 text-sm font-semibold">{row.t}</span>
            <span className="text-sm font-bold tabular-nums">−{row.a}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

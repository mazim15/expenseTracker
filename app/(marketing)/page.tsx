import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/page-transition";
import { Illustration } from "@/components/ui/illustration";
import { Hero } from "@/components/marketing/Hero";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  PieChart,
  Receipt,
  ShieldCheck,
  Zap,
  Camera,
  Tags,
  Target,
  PiggyBank,
} from "lucide-react";

export default function Home() {
  return (
    <>
      <Hero />

      <section id="features" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase">
              Features
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
              Everything you need. <span className="gradient-text">Nothing you don&apos;t.</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Built for speed and clarity. No bloat, no busywork — just the data that helps you make
              better decisions.
            </p>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              className="md:col-span-2"
              image="/illustrations/feature-capture.png"
              icon={<Receipt className="h-7 w-7" />}
              title="Fast capture"
              description="Log expenses in seconds or scan a receipt with AI and let us extract the line items for you."
              tone="bg-hero"
              large
            />
            <FeatureCard
              image="/illustrations/feature-analytics.png"
              icon={<BarChart3 className="h-7 w-7" />}
              title="Clear analytics"
              description="Spot trends by category or month with dashboards designed for humans, not accountants."
              delay={0.08}
            />
            <FeatureCard
              image="/illustrations/feature-categories.png"
              icon={<PieChart className="h-7 w-7" />}
              title="Smart categories"
              description="Customize categories to match how you actually spend."
              delay={0.08}
            />
            <FeatureCard
              className="md:col-span-2"
              image="/illustrations/feature-privacy.png"
              icon={<ShieldCheck className="h-7 w-7" />}
              title="Private by default"
              description="Your data is encrypted in transit and at rest. We don't sell it, ever."
              tone="bg-highlight/50"
              large
              delay={0.16}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-muted/40 scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase">
              How it works
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
              Three steps to clarity.
            </h2>
          </Reveal>

          <div className="relative grid gap-6 md:grid-cols-3">
            <div className="border-primary/30 absolute top-24 right-[16%] left-[16%] hidden border-t-2 border-dashed md:block" />
            <Step
              n={1}
              image="/illustrations/step-capture.png"
              icon={<Camera className="h-8 w-8" />}
              title="Capture"
              description="Add expenses manually or snap a receipt. We parse it and pre-fill the details."
            />
            <Step
              n={2}
              image="/illustrations/step-categorize.png"
              icon={<Tags className="h-8 w-8" />}
              title="Categorize"
              description="Tag spending by category, location, or custom label. Filters do the rest."
              delay={0.12}
            />
            <Step
              n={3}
              image="/illustrations/step-decide.png"
              icon={<Target className="h-8 w-8" />}
              title="Decide"
              description="Dashboards highlight the trends that matter so you can act before month-end."
              delay={0.24}
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
          <Reveal>
            <div className="bg-hero shadow-lift relative overflow-hidden rounded-[2.5rem] p-10 md:p-16">
              <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              <div className="relative flex flex-col items-start gap-10 md:flex-row md:items-center md:justify-between">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                    <Zap className="h-3 w-3" />
                    Free to start
                  </div>
                  <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
                    Ready to take control of your money?
                  </h2>
                  <p className="mt-4 text-lg opacity-85">
                    Join thousands tracking their expenses the calm way. Set up in under two
                    minutes.
                  </p>
                  <Button
                    asChild
                    size="lg"
                    className="text-foreground mt-8 bg-white hover:bg-white/90 dark:text-[oklch(0.2_0.02_165)]"
                  >
                    <Link href="/register">
                      Create your account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="animate-float shrink-0 self-center">
                  <Illustration
                    src="/illustrations/cta-piggy.png"
                    width={260}
                    height={260}
                    className="drop-shadow-2xl"
                    fallback={<PiggyBank className="text-highlight h-40 w-40" strokeWidth={1.25} />}
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  image,
  icon,
  title,
  description,
  className,
  tone = "bg-card",
  large = false,
  delay = 0,
}: {
  image: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  tone?: string;
  large?: boolean;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <div
        className={cn(
          "group shadow-soft hover:shadow-lift border-border/60 relative flex h-full overflow-hidden rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1",
          tone,
          large ? "flex-col gap-6 sm:flex-row sm:items-center" : "flex-col",
        )}
      >
        <div className={cn("shrink-0", large ? "sm:order-2 sm:ml-auto" : "mb-4")}>
          <Illustration
            src={image}
            width={large ? 200 : 140}
            height={large ? 200 : 140}
            className="transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3"
            fallback={
              <span className="bg-card/80 text-primary shadow-soft inline-flex h-16 w-16 items-center justify-center rounded-2xl">
                {icon}
              </span>
            }
          />
        </div>
        <div className="max-w-sm">
          <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed opacity-80">{description}</p>
        </div>
      </div>
    </Reveal>
  );
}

function Step({
  n,
  image,
  icon,
  title,
  description,
  delay = 0,
}: {
  n: number;
  image: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="relative text-center">
      <div className="bg-card shadow-soft relative mx-auto mb-6 flex h-48 w-48 items-center justify-center rounded-full">
        <Illustration
          src={image}
          width={170}
          height={170}
          fallback={<span className="text-primary">{icon}</span>}
        />
        <span className="bg-hero shadow-lift absolute -top-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold">
          {n}
        </span>
      </div>
      <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm leading-relaxed">
        {description}
      </p>
    </Reveal>
  );
}

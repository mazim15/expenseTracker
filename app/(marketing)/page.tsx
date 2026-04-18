import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  PieChart,
  Receipt,
  Sparkles,
  ShieldCheck,
  Zap,
  Check,
} from "lucide-react";

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative container mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <span className="border-border bg-background/80 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="text-primary h-3 w-3" />
              Receipt scanning now powered by AI
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              Effortless expense tracking for{" "}
              <span className="text-primary">people who care about their money.</span>
            </h1>

            <p className="text-muted-foreground mt-6 max-w-xl text-lg text-pretty">
              Log expenses in seconds, understand exactly where your money goes, and stay ahead of
              your budget — all in one clean, fast dashboard.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">
                  Start tracking free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>

            <p className="text-muted-foreground mt-6 flex items-center gap-2 text-xs">
              <Check className="text-success h-3.5 w-3.5" /> No credit card required
              <span className="text-border">•</span>
              <Check className="text-success h-3.5 w-3.5" /> Free forever tier
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="border-border border-t">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-primary text-sm font-semibold">Features</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="text-muted-foreground mt-4 text-base">
              Built for speed and clarity. No bloat, no busywork — just the data that helps you make
              better decisions.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Receipt className="h-5 w-5" />}
              title="Fast capture"
              description="Log expenses in seconds or scan a receipt with AI and let us extract the line items."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Clear analytics"
              description="Spot trends by category, month, or tag with dashboards designed for humans, not accountants."
            />
            <FeatureCard
              icon={<PieChart className="h-5 w-5" />}
              title="Smart categories"
              description="Customize categories to match how you actually spend, then let auto-tagging do the rest."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Private by default"
              description="Your data is encrypted in transit and at rest. We don't sell it, ever."
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-muted/30 border-border border-t">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-primary text-sm font-semibold">How it works</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Three steps to clarity.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Step
              n={1}
              title="Capture"
              description="Add expenses manually or snap a receipt. We parse it and pre-fill the details."
            />
            <Step
              n={2}
              title="Categorize"
              description="Tag spending by category, location, or custom label. Filters do the rest."
            />
            <Step
              n={3}
              title="Decide"
              description="Dashboards highlight the trends that matter so you can act before month-end."
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="border-border border-t">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="bg-foreground text-background relative mx-auto max-w-4xl overflow-hidden rounded-2xl p-10 md:p-16">
            <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                  <Zap className="h-3 w-3" />
                  Free to start
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                  Ready to take control of your money?
                </h2>
                <p className="mt-3 text-base opacity-80">
                  Join thousands tracking their expenses the calm way. Set up in under two minutes.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary" className="shrink-0">
                <Link href="/register">
                  Create your account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-border bg-card hover:border-ring/50 group relative rounded-lg border p-6 transition-colors">
      <div className="bg-primary/10 text-primary mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="border-border bg-card relative rounded-lg border p-6">
      <div className="border-border text-muted-foreground mb-4 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold">
        {n}
      </div>
      <h3 className="mb-2 text-base font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, DollarSign, PieChart, Wallet } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero section */}
      <section className="from-background via-primary/5 to-background bg-gradient-to-b py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-6 text-4xl font-bold md:text-6xl">
            Take Control of Your <span className="text-primary">Finances</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-xl">
            Track expenses, manage budgets, and gain insights into your spending habits with our
            intuitive expense tracking solution.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="shadow-lg transition-all hover:shadow-xl">
              <Link href="/register">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary/20">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="bg-background py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Key Features</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<DollarSign className="text-primary h-10 w-10" />}
              title="Expense Tracking"
              description="Easily log and categorize your expenses to keep track of where your money goes."
            />
            <FeatureCard
              icon={<Wallet className="text-primary h-10 w-10" />}
              title="Budget Management"
              description="Set budgets for different categories and monitor your spending against them."
            />
            <FeatureCard
              icon={<BarChart3 className="text-primary h-10 w-10" />}
              title="Spending Analytics"
              description="Visualize your spending patterns with intuitive charts and graphs."
            />
            <FeatureCard
              icon={<PieChart className="text-primary h-10 w-10" />}
              title="Financial Insights"
              description="Get personalized insights to help you make better financial decisions."
            />
          </div>
        </div>
      </section>
    </div>
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
    <div className="bg-card rounded-lg border p-6 shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

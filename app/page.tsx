import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, DollarSign, PieChart, Wallet } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Take Control of Your <span className="text-primary">Finances</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Track expenses, manage budgets, and gain insights into your spending habits with our intuitive expense tracking solution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-all">
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
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<DollarSign className="h-10 w-10 text-primary" />}
              title="Expense Tracking"
              description="Easily log and categorize your expenses to keep track of where your money goes."
            />
            <FeatureCard
              icon={<Wallet className="h-10 w-10 text-primary" />}
              title="Budget Management"
              description="Set budgets for different categories and monitor your spending against them."
            />
            <FeatureCard
              icon={<BarChart3 className="h-10 w-10 text-primary" />}
              title="Spending Analytics"
              description="Visualize your spending patterns with intuitive charts and graphs."
            />
            <FeatureCard
              icon={<PieChart className="h-10 w-10 text-primary" />}
              title="Financial Insights"
              description="Get personalized insights to help you make better financial decisions."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-lg p-6 border shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

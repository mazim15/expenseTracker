import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-card flex flex-col items-center rounded-lg border p-6 shadow-md transition-all hover:scale-[1.02] hover:shadow-lg">
      <div className="bg-primary/10 mb-4 rounded-full p-3">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground text-center">{description}</p>
    </div>
  );
}

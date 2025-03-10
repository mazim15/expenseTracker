"use client";

import { Label } from "@/components/ui/label";

// Create a form component with better feedback
export function Form({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form 
      {...props} 
      className="space-y-4 transition-all"
    >
      {children}
    </form>
  );
}

export function FormField({ label, error, children }: { 
  label: string; 
  error?: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
} 
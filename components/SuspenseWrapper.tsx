"use client";

import { Suspense, ReactNode } from 'react';
import { PageLoadingSpinner, ChartLoadingSpinner, InlineLoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  type?: 'page' | 'chart' | 'inline' | 'custom';
  message?: string;
}

const defaultFallbacks = {
  page: (message?: string) => <PageLoadingSpinner message={message} />,
  chart: () => <ChartLoadingSpinner />,
  inline: (message?: string) => <InlineLoadingSpinner message={message} />,
  custom: () => null
};

export function SuspenseWrapper({ 
  children, 
  fallback, 
  type = 'page', 
  message 
}: SuspenseWrapperProps) {
  const fallbackComponent = fallback || defaultFallbacks[type](message);

  return (
    <ErrorBoundary>
      <Suspense fallback={fallbackComponent}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// Specific wrappers for common use cases
export function ChartSuspense({ children }: { children: ReactNode }) {
  return (
    <SuspenseWrapper type="chart">
      {children}
    </SuspenseWrapper>
  );
}

export function PageSuspense({ 
  children, 
  message 
}: { 
  children: ReactNode; 
  message?: string; 
}) {
  return (
    <SuspenseWrapper type="page" message={message}>
      {children}
    </SuspenseWrapper>
  );
}

export function InlineSuspense({ 
  children, 
  message 
}: { 
  children: ReactNode; 
  message?: string; 
}) {
  return (
    <SuspenseWrapper type="inline" message={message}>
      {children}
    </SuspenseWrapper>
  );
}
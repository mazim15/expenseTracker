"use client";

import { lazy } from 'react';

// Lazy load chart components
export const MonthlyBarChart = lazy(() => import('./MonthlyBarChart'));
export const CategoryPieChart = lazy(() => import('./CategoryPieChart'));
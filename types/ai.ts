export interface SpendingPattern {
  category: string;
  averageAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

export interface SpendingInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'trend';
  title: string;
  description: string;
  actionable: boolean;
  action?: string;
  severity: 'low' | 'medium' | 'high';
  category?: string;
  amount?: number;
  createdAt: Date;
}

export interface CategoryPrediction {
  category: string;
  confidence: number;
  reasoning: string;
}

export interface BudgetRecommendation {
  category: string;
  currentSpending: number;
  recommendedBudget: number;
  reasoning: string;
  potentialSavings?: number;
}

export interface SpendingAnomaly {
  id: string;
  expenseId?: string;
  type: 'unusual_amount' | 'unusual_frequency' | 'unusual_category' | 'duplicate_transaction';
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
  confidence: number;
}

export interface FinancialHealthScore {
  overall: number;
  budgetAdherence: number;
  spendingConsistency: number;
  categoryBalance: number;
  trendHealth: number;
  lastUpdated: Date;
}

export interface PredictiveAnalysis {
  monthlyForecast: {
    category: string;
    predictedAmount: number;
    confidence: number;
  }[];
  budgetRisk: {
    category: string;
    riskLevel: 'low' | 'medium' | 'high';
    daysUntilOverrun?: number;
  }[];
  savingsOpportunities: {
    category: string;
    potentialSavings: number;
    method: string;
  }[];
}

export interface AIInsightsResponse {
  insights: SpendingInsight[];
  patterns: SpendingPattern[];
  recommendations: BudgetRecommendation[];
  healthScore: FinancialHealthScore;
  anomalies: SpendingAnomaly[];
  predictions?: PredictiveAnalysis;
}

export interface SmartCategorizationRequest {
  description: string;
  amount: number;
  merchant?: string;
  location?: string;
  userHistory?: {
    category: string;
    description: string;
    merchant?: string;
  }[];
}

export interface SmartCategorizationResponse {
  suggestedCategory: string;
  confidence: number;
  alternativeCategories: CategoryPrediction[];
  reasoning: string;
}
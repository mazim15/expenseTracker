// Main AI services exports
export { GeminiClient } from './geminiClient';
export { SmartCategorizationService } from './smartCategorization';
export { PatternAnalysisService } from './patternAnalysis';
export { AnomalyDetectionService } from './anomalyDetection';
export { RecommendationService } from './recommendations';
export { InsightsService } from './insights';
export { PredictiveAnalyticsService } from './predictiveAnalytics';

// Re-export types for convenience
export type {
  SpendingPattern,
  SpendingInsight,
  CategoryPrediction,
  BudgetRecommendation,
  SpendingAnomaly,
  FinancialHealthScore,
  PredictiveAnalysis,
  AIInsightsResponse,
  SmartCategorizationRequest,
  SmartCategorizationResponse
} from '@/types/ai';

// Main AI service orchestrator
import { ExpenseType } from '@/types/expense';
import { SmartCategorizationService } from './smartCategorization';
import { PatternAnalysisService } from './patternAnalysis';
import { AnomalyDetectionService } from './anomalyDetection';
import { RecommendationService } from './recommendations';
import { InsightsService } from './insights';
import { PredictiveAnalyticsService } from './predictiveAnalytics';
import { AIInsightsResponse } from '@/types/ai';

export class AIService {
  private static instance: AIService;
  
  private smartCategorization: SmartCategorizationService;
  private patternAnalysis: PatternAnalysisService;
  private anomalyDetection: AnomalyDetectionService;
  private recommendations: RecommendationService;
  private insights: InsightsService;
  private predictiveAnalytics: PredictiveAnalyticsService;

  private constructor() {
    this.smartCategorization = SmartCategorizationService.getInstance();
    this.patternAnalysis = PatternAnalysisService.getInstance();
    this.anomalyDetection = AnomalyDetectionService.getInstance();
    this.recommendations = RecommendationService.getInstance();
    this.insights = InsightsService.getInstance();
    this.predictiveAnalytics = PredictiveAnalyticsService.getInstance();
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Quick access methods for common operations
  async suggestExpenseCategory(description: string, amount: number, merchant?: string) {
    return this.smartCategorization.suggestCategory({
      description,
      amount,
      merchant
    });
  }

  async getFullAnalysis(expenses: ExpenseType[]): Promise<AIInsightsResponse> {
    return this.patternAnalysis.analyzeSpendingPatterns(expenses);
  }

  async getDashboardInsights(expenses: ExpenseType[]) {
    return this.insights.generateDashboardInsights(expenses);
  }

  async getQuickInsight(expenses: ExpenseType[]) {
    return this.insights.generateQuickInsight(expenses);
  }

  async checkForAnomalies(expenses: ExpenseType[]) {
    return this.anomalyDetection.detectAnomalies(expenses);
  }

  async getBudgetRecommendations(expenses: ExpenseType[], currentBudgets?: Record<string, number>) {
    return this.recommendations.generateBudgetRecommendations(expenses, currentBudgets);
  }

  async getSavingsOpportunities(expenses: ExpenseType[]) {
    return this.recommendations.generateSavingsOpportunities(expenses);
  }

  async getPersonalizedTips(expenses: ExpenseType[]) {
    return this.recommendations.generatePersonalizedTips(expenses);
  }

  async getWeeklyReport(expenses: ExpenseType[]) {
    return this.insights.generateWeeklyReport(expenses);
  }

  async getCategoryInsight(expenses: ExpenseType[], category: string) {
    return this.insights.generateCategoryInsight(expenses, category);
  }

  async getBudgetForecast(expenses: ExpenseType[], currentBudgets?: Record<string, number>, timeframe?: 'next_month' | 'next_quarter' | 'next_year') {
    return this.predictiveAnalytics.generateBudgetForecast(expenses, currentBudgets, timeframe);
  }

  async predictCategorySpending(expenses: ExpenseType[], category: string, daysAhead?: number) {
    return this.predictiveAnalytics.predictCategorySpending(expenses, category, daysAhead);
  }

  async getSpendingSeasonality(expenses: ExpenseType[]) {
    return this.predictiveAnalytics.identifySpendingSeasonality(expenses);
  }

  // Batch operations
  async processNewExpense(expense: ExpenseType, userHistory: ExpenseType[]) {
    const [categorySuggestion, anomaly] = await Promise.all([
      this.smartCategorization.suggestCategory({
        description: expense.description,
        amount: expense.amount,
        userHistory: userHistory.slice(-10).map(e => ({
          category: e.category,
          description: e.description
        }))
      }),
      this.anomalyDetection.checkSingleTransaction(expense, userHistory)
    ]);

    return {
      categorySuggestion,
      anomaly,
      isUnusual: anomaly !== null
    };
  }

  // Health check
  isAIEnabled(): boolean {
    try {
      return process.env.NEXT_PUBLIC_GEMINI_API_KEY !== undefined;
    } catch {
      return false;
    }
  }
}
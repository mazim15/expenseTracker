/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { GeminiClient } from './geminiClient';
import { ExpenseType } from '@/types/expense';
import { PredictiveAnalysis } from '@/types/ai';

export class PredictiveAnalyticsService {
  private static instance: PredictiveAnalyticsService;
  private geminiClient: GeminiClient;

  private constructor() {
    this.geminiClient = GeminiClient.getInstance();
  }

  static getInstance(): PredictiveAnalyticsService {
    if (!PredictiveAnalyticsService.instance) {
      PredictiveAnalyticsService.instance = new PredictiveAnalyticsService();
    }
    return PredictiveAnalyticsService.instance;
  }

  async generateBudgetForecast(
    expenses: ExpenseType[], 
    currentBudgets?: Record<string, number>,
    timeframe: 'next_month' | 'next_quarter' | 'next_year' = 'next_month'
  ): Promise<PredictiveAnalysis> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackForecast(expenses, currentBudgets, timeframe);
    }

    try {
      const historicalData = this.prepareHistoricalData(expenses, timeframe);
      
      const prompt = `
Based on the following spending history, predict future budget requirements and risks:

${historicalData}

Current Budgets:
${currentBudgets ? Object.entries(currentBudgets)
  .map(([category, budget]) => `- ${category}: $${budget}`)
  .join('\n') : 'No current budgets set'}

Timeframe for prediction: ${timeframe.replace('_', ' ')}

Provide detailed predictions in JSON format:
{
  "monthlyForecast": [
    {
      "category": "category_name",
      "predictedAmount": 0.00,
      "confidence": 0.85
    }
  ],
  "budgetRisk": [
    {
      "category": "category_name",
      "riskLevel": "low|medium|high",
      "daysUntilOverrun": 15,
      "currentSpending": 0.00,
      "projectedSpending": 0.00
    }
  ],
  "savingsOpportunities": [
    {
      "category": "category_name",
      "potentialSavings": 0.00,
      "method": "Specific savings method",
      "feasibility": "easy|medium|hard"
    }
  ]
}

Consider:
1. Historical spending trends and seasonal patterns
2. Growth rates and spending velocity
3. Category-specific risk factors
4. Realistic savings opportunities
5. Budget allocation recommendations
`;

      const response = await this.geminiClient.generateStructuredContent<PredictiveAnalysis>(prompt);

      if (response.success && response.data) {
        return this.validateAndEnhancePredictions(response.data, expenses);
      }

      return this.getFallbackForecast(expenses, currentBudgets, timeframe);
    } catch (error) {
      console.error('Predictive analytics error:', error);
      return this.getFallbackForecast(expenses, currentBudgets, timeframe);
    }
  }

  async predictCategorySpending(
    expenses: ExpenseType[], 
    category: string, 
    daysAhead: number = 30
  ): Promise<{
    predictedAmount: number;
    confidence: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    factors: string[];
  }> {
    const categoryExpenses = expenses.filter(e => e.category === category);
    
    if (categoryExpenses.length < 3) {
      return {
        predictedAmount: 0,
        confidence: 0.3,
        trendDirection: 'stable',
        factors: ['Insufficient historical data for prediction']
      };
    }

    // Calculate basic trend
    const last30Days = categoryExpenses.filter(e => 
      new Date(e.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const last60Days = categoryExpenses.filter(e => 
      new Date(e.date) >= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    );

    const recent30DayTotal = last30Days.reduce((sum, e) => sum + e.amount, 0);
    const previous30DayTotal = last60Days
      .filter(e => new Date(e.date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, e) => sum + e.amount, 0);

    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recent30DayTotal > previous30DayTotal * 1.1) {
      trendDirection = 'increasing';
    } else if (recent30DayTotal < previous30DayTotal * 0.9) {
      trendDirection = 'decreasing';
    }

    // Simple linear projection
    const dailyAverage = recent30DayTotal / 30;
    const predictedAmount = dailyAverage * daysAhead;

    if (!this.geminiClient.isAvailable()) {
      return {
        predictedAmount,
        confidence: 0.7,
        trendDirection,
        factors: ['Based on recent 30-day average']
      };
    }

    try {
      const categoryData = this.prepareCategoryAnalysis(categoryExpenses, category);
      
      const prompt = `
Analyze this category's spending pattern and predict future spending:

${categoryData}

Prediction timeframe: ${daysAhead} days ahead

Provide prediction in JSON format:
{
  "predictedAmount": 0.00,
  "confidence": 0.85,
  "trendDirection": "increasing|decreasing|stable",
  "factors": ["Factor 1", "Factor 2", "Factor 3"]
}

Consider seasonal patterns, recent trends, and external factors.
`;

      const response = await this.geminiClient.generateStructuredContent<{
        predictedAmount: number;
        confidence: number;
        trendDirection: 'increasing' | 'decreasing' | 'stable';
        factors: string[];
      }>(prompt);

      if (response.success && response.data) {
        return {
          ...response.data,
          confidence: Math.min(Math.max(response.data.confidence, 0), 1)
        };
      }

      return {
        predictedAmount,
        confidence: 0.7,
        trendDirection,
        factors: ['Based on recent spending patterns']
      };
    } catch (error) {
      console.error('Category prediction error:', error);
      return {
        predictedAmount,
        confidence: 0.6,
        trendDirection,
        factors: ['Fallback prediction based on averages']
      };
    }
  }

  async identifySpendingSeasonality(expenses: ExpenseType[]): Promise<{
    patterns: {
      period: 'monthly' | 'weekly' | 'seasonal';
      pattern: string;
      confidence: number;
    }[];
    recommendations: string[];
  }> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackSeasonality(expenses);
    }

    try {
      const seasonalData = this.prepareSeasonalAnalysis(expenses);
      
      const prompt = `
Analyze this spending data for seasonal patterns and cycles:

${seasonalData}

Identify patterns in JSON format:
{
  "patterns": [
    {
      "period": "monthly|weekly|seasonal",
      "pattern": "Description of the pattern",
      "confidence": 0.85
    }
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ]
}

Look for monthly cycles, weekly patterns, holiday spending, and seasonal variations.
`;

      const response = await this.geminiClient.generateStructuredContent<{
        patterns: {
          period: 'monthly' | 'weekly' | 'seasonal';
          pattern: string;
          confidence: number;
        }[];
        recommendations: string[];
      }>(prompt);

      if (response.success && response.data) {
        return response.data;
      }

      return this.getFallbackSeasonality(expenses);
    } catch (error) {
      console.error('Seasonality analysis error:', error);
      return this.getFallbackSeasonality(expenses);
    }
  }

  private prepareHistoricalData(expenses: ExpenseType[], timeframe: string): string {
    const months = timeframe === 'next_year' ? 12 : timeframe === 'next_quarter' ? 3 : 6;
    const monthlyData: Record<string, Record<string, number>> = {};

    // Group expenses by month and category
    expenses.forEach(expense => {
      const monthKey = expense.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      monthlyData[monthKey][expense.category] = (monthlyData[monthKey][expense.category] || 0) + expense.amount;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const recentMonths = sortedMonths.slice(-months);

    return `
Historical Spending Data (Last ${months} months):

Monthly Totals:
${recentMonths.map(month => {
  const total = Object.values(monthlyData[month]).reduce((sum, amount) => sum + amount, 0);
  return `${month}: $${total.toFixed(2)}`;
}).join('\n')}

Category Breakdown by Month:
${recentMonths.map(month => 
  `${month}:\n${Object.entries(monthlyData[month])
    .map(([category, amount]) => `  - ${category}: $${amount.toFixed(2)}`)
    .join('\n')}`
).join('\n\n')}

Trends Analysis:
- Total months of data: ${recentMonths.length}
- Average monthly spending: $${(recentMonths.reduce((sum, month) => 
    sum + Object.values(monthlyData[month]).reduce((s, a) => s + a, 0), 0) / recentMonths.length).toFixed(2)}
- Growth trend: ${this.calculateGrowthTrend(recentMonths.map(month => 
    Object.values(monthlyData[month]).reduce((sum, amount) => sum + amount, 0)))}
`;
  }

  private prepareCategoryAnalysis(expenses: ExpenseType[], category: string): string {
    const last90Days = expenses.filter(e => 
      new Date(e.date) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );

    const weeklyTotals: number[] = [];
    for (let week = 0; week < 12; week++) {
      const weekStart = new Date(Date.now() - (week + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - week * 7 * 24 * 60 * 60 * 1000);
      
      const weekTotal = last90Days
        .filter(e => new Date(e.date) >= weekStart && new Date(e.date) < weekEnd)
        .reduce((sum, e) => sum + e.amount, 0);
      
      weeklyTotals.push(weekTotal);
    }

    return `
${category} Category Analysis (Last 90 days):

Total spending: $${last90Days.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
Number of transactions: ${last90Days.length}
Average transaction: $${(last90Days.reduce((sum, e) => sum + e.amount, 0) / last90Days.length || 0).toFixed(2)}

Weekly Spending Pattern:
${weeklyTotals.reverse().map((total, index) => 
  `Week ${index + 1}: $${total.toFixed(2)}`
).join('\n')}

Recent Transactions:
${last90Days.slice(-10).map(e => 
  `${e.date.toLocaleDateString()}: $${e.amount.toFixed(2)} - ${e.description}`
).join('\n')}
`;
  }

  private prepareSeasonalAnalysis(expenses: ExpenseType[]): string {
    const monthlyTotals: Record<string, number> = {};
    const weeklyTotals: Record<string, number> = {};

    expenses.forEach(expense => {
      const month = expense.date.toLocaleDateString('en-US', { month: 'long' });
      const dayOfWeek = expense.date.toLocaleDateString('en-US', { weekday: 'long' });

      monthlyTotals[month] = (monthlyTotals[month] || 0) + expense.amount;
      weeklyTotals[dayOfWeek] = (weeklyTotals[dayOfWeek] || 0) + expense.amount;
    });

    return `
Seasonal Spending Analysis:

Monthly Patterns:
${Object.entries(monthlyTotals)
  .sort(([,a], [,b]) => b - a)
  .map(([month, total]) => `${month}: $${total.toFixed(2)}`)
  .join('\n')}

Weekly Patterns:
${Object.entries(weeklyTotals)
  .sort(([,a], [,b]) => b - a)
  .map(([day, total]) => `${day}: $${total.toFixed(2)}`)
  .join('\n')}

Data Period: ${expenses.length > 0 ? 
  `${expenses[0].date.toLocaleDateString()} to ${expenses[expenses.length - 1].date.toLocaleDateString()}` : 
  'No data available'}
`;
  }

  private calculateGrowthTrend(monthlyTotals: number[]): string {
    if (monthlyTotals.length < 2) return 'Insufficient data';

    const firstHalf = monthlyTotals.slice(0, Math.floor(monthlyTotals.length / 2));
    const secondHalf = monthlyTotals.slice(Math.floor(monthlyTotals.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, total) => sum + total, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, total) => sum + total, 0) / secondHalf.length;

    const growthRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    if (growthRate > 10) return `Increasing (${growthRate.toFixed(1)}% growth)`;
    if (growthRate < -10) return `Decreasing (${Math.abs(growthRate).toFixed(1)}% decline)`;
    return 'Stable';
  }

  private validateAndEnhancePredictions(predictions: PredictiveAnalysis, expenses: ExpenseType[]): PredictiveAnalysis {
    // Validate and cap confidence scores
    predictions.monthlyForecast = predictions.monthlyForecast.map(forecast => ({
      ...forecast,
      confidence: Math.min(Math.max(forecast.confidence, 0.1), 1)
    }));

    // Add historical context to budget risk
    predictions.budgetRisk = predictions.budgetRisk.map(risk => {
      const categoryExpenses = expenses.filter(e => e.category === risk.category);
      const currentSpending = categoryExpenses
        .filter(e => new Date(e.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        ...risk,
        currentSpending
      };
    });

    return predictions;
  }

  private getFallbackForecast(
    expenses: ExpenseType[], 
    currentBudgets?: Record<string, number>, 
    timeframe?: string
  ): PredictiveAnalysis {
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const monthlyForecast = Object.entries(categoryTotals).map(([category, total]) => ({
      category,
      predictedAmount: total / 6, // 6-month average
      confidence: 0.6
    }));

    const budgetRisk = currentBudgets ? Object.entries(currentBudgets).map(([category, budget]) => {
      const currentSpending = categoryTotals[category] || 0;
      const monthlyAverage = currentSpending / 6;
      
      return {
        category,
        riskLevel: monthlyAverage > budget ? 'high' as const : 
                  monthlyAverage > budget * 0.8 ? 'medium' as const : 'low' as const,
        currentSpending: monthlyAverage,
        projectedSpending: monthlyAverage
      };
    }) : [];

    const savingsOpportunities = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category, total]) => ({
        category,
        potentialSavings: total * 0.15,
        method: `Review and optimize ${category} expenses`,
        feasibility: 'medium' as const
      }));

    return {
      monthlyForecast,
      budgetRisk,
      savingsOpportunities
    };
  }

  private getFallbackSeasonality(expenses: ExpenseType[]) {
    return {
      patterns: [
        {
          period: 'weekly' as const,
          pattern: 'Higher spending observed on weekends',
          confidence: 0.6
        }
      ],
      recommendations: [
        'Track spending patterns over longer periods for better insights',
        'Consider setting weekly spending limits'
      ]
    };
  }
}
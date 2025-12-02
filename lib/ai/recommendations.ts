/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { GeminiClient } from './geminiClient';
import { ExpenseType } from '@/types/expense';
import { BudgetRecommendation, PredictiveAnalysis } from '@/types/ai';

export class RecommendationService {
  private static instance: RecommendationService;
  private geminiClient: GeminiClient;

  private constructor() {
    this.geminiClient = GeminiClient.getInstance();
  }

  static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  async generateBudgetRecommendations(
    expenses: ExpenseType[], 
    currentBudgets?: Record<string, number>,
    targetSavingsGoal?: number
  ): Promise<BudgetRecommendation[]> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackBudgetRecommendations(expenses, currentBudgets);
    }

    try {
      const analysisData = this.prepareFinancialData(expenses, currentBudgets, targetSavingsGoal);
      
      const prompt = `
Based on the following financial data, provide budget optimization recommendations:

${analysisData}

Please provide recommendations in JSON format:
[
  {
    "category": "category_name",
    "currentSpending": 0.00,
    "recommendedBudget": 0.00,
    "reasoning": "Detailed explanation for the recommendation",
    "potentialSavings": 0.00
  }
]

Focus on:
1. Categories where spending could be optimized
2. Realistic budget adjustments based on spending patterns
3. Opportunities for savings without major lifestyle changes
4. Balancing necessary expenses vs discretionary spending
5. Helping achieve savings goals if specified

Provide 3-6 actionable recommendations.
`;

      const response = await this.geminiClient.generateStructuredContent<BudgetRecommendation[]>(prompt);

      if (response.success && response.data && Array.isArray(response.data)) {
        return response.data.map(rec => ({
          ...rec,
          potentialSavings: rec.currentSpending - rec.recommendedBudget
        }));
      }

      return this.getFallbackBudgetRecommendations(expenses, currentBudgets);
    } catch (error) {
      console.error('Budget recommendation error:', error);
      return this.getFallbackBudgetRecommendations(expenses, currentBudgets);
    }
  }

  async generateSavingsOpportunities(expenses: ExpenseType[]): Promise<{
    category: string;
    potentialSavings: number;
    method: string;
    difficulty: 'easy' | 'medium' | 'hard';
    impact: 'low' | 'medium' | 'high';
  }[]> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackSavingsOpportunities(expenses);
    }

    try {
      const spendingData = this.analyzeSpendingPatterns(expenses);
      
      const prompt = `
Analyze the following spending patterns and suggest specific savings opportunities:

${spendingData}

Provide savings suggestions in JSON format:
[
  {
    "category": "category_name",
    "potentialSavings": 0.00,
    "method": "Specific actionable method to save money",
    "difficulty": "easy|medium|hard",
    "impact": "low|medium|high"
  }
]

Focus on:
1. Practical and achievable savings methods
2. Category-specific optimization strategies
3. Behavioral changes that can reduce costs
4. Alternative solutions that maintain quality of life
5. Both immediate and long-term savings opportunities

Provide 4-8 specific recommendations.
`;

      const response = await this.geminiClient.generateStructuredContent<{
        category: string;
        potentialSavings: number;
        method: string;
        difficulty: 'easy' | 'medium' | 'hard';
        impact: 'low' | 'medium' | 'high';
      }[]>(prompt);

      if (response.success && response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return this.getFallbackSavingsOpportunities(expenses);
    } catch (error) {
      console.error('Savings opportunities error:', error);
      return this.getFallbackSavingsOpportunities(expenses);
    }
  }

  async generatePredictiveAnalysis(expenses: ExpenseType[]): Promise<PredictiveAnalysis> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackPredictiveAnalysis(expenses);
    }

    try {
      const historicalData = this.prepareHistoricalData(expenses);
      
      const prompt = `
Based on the following historical spending data, provide predictive analysis:

${historicalData}

Please provide predictions in JSON format:
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
      "daysUntilOverrun": 15
    }
  ],
  "savingsOpportunities": [
    {
      "category": "category_name",
      "potentialSavings": 0.00,
      "method": "Specific savings method"
    }
  ]
}

Consider:
1. Seasonal spending patterns
2. Trend analysis and trajectory
3. Category-specific growth rates
4. Potential budget overruns
5. Realistic savings targets
`;

      const response = await this.geminiClient.generateStructuredContent<PredictiveAnalysis>(prompt);

      if (response.success && response.data) {
        return response.data;
      }

      return this.getFallbackPredictiveAnalysis(expenses);
    } catch (error) {
      console.error('Predictive analysis error:', error);
      return this.getFallbackPredictiveAnalysis(expenses);
    }
  }

  async generatePersonalizedTips(expenses: ExpenseType[], userProfile?: {
    age?: number;
    income?: number;
    goals?: string[];
  }): Promise<string[]> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackPersonalizedTips(expenses);
    }

    try {
      const profileData = userProfile ? `
User Profile:
- Age: ${userProfile.age || 'Not specified'}
- Monthly Income: $${userProfile.income || 'Not specified'}
- Financial Goals: ${userProfile.goals?.join(', ') || 'Not specified'}
` : '';

      const spendingData = this.getSpendingSummary(expenses);
      
      const prompt = `
Generate personalized financial tips based on this user's spending patterns:

${profileData}

Spending Analysis:
${spendingData}

Provide 5-8 personalized tips as a JSON array of strings. Each tip should be:
1. Specific to their spending patterns
2. Actionable and practical
3. Appropriate for their profile
4. Focused on improvement opportunities

Example format: ["Tip 1 text", "Tip 2 text", ...]
`;

      const response = await this.geminiClient.generateStructuredContent<string[]>(prompt);

      if (response.success && response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return this.getFallbackPersonalizedTips(expenses);
    } catch (error) {
      console.error('Personalized tips error:', error);
      return this.getFallbackPersonalizedTips(expenses);
    }
  }

  private prepareFinancialData(
    expenses: ExpenseType[], 
    currentBudgets?: Record<string, number>,
    targetSavingsGoal?: number
  ): string {
    const last30Days = expenses.filter(e => 
      new Date(e.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const categorySpending = last30Days.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalSpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);

    let budgetInfo = '';
    if (currentBudgets) {
      budgetInfo = `\nCurrent Budgets:\n${Object.entries(currentBudgets)
        .map(([category, budget]) => `- ${category}: $${budget}`)
        .join('\n')}`;
    }

    let savingsGoalInfo = '';
    if (targetSavingsGoal) {
      savingsGoalInfo = `\nTarget Monthly Savings Goal: $${targetSavingsGoal}`;
    }

    return `
Monthly Spending Analysis:
Total Spending: $${totalSpending.toFixed(2)}

Category Breakdown:
${Object.entries(categorySpending)
  .sort(([,a], [,b]) => b - a)
  .map(([category, amount]) => 
    `- ${category}: $${amount.toFixed(2)} (${((amount / totalSpending) * 100).toFixed(1)}%)`
  ).join('\n')}
${budgetInfo}${savingsGoalInfo}

Transaction Patterns:
- Average transaction: $${(totalSpending / last30Days.length).toFixed(2)}
- Most expensive day: ${this.getMostExpensiveDay(last30Days)}
- Most common category: ${Object.entries(categorySpending).reduce((a, b) => categorySpending[a[0]] > categorySpending[b[0]] ? a : b)[0]}
`;
  }

  private analyzeSpendingPatterns(expenses: ExpenseType[]): string {
    const last60Days = expenses.filter(e => 
      new Date(e.date) >= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    );

    const categoryFrequency = last60Days.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryAverages = last60Days.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = { total: 0, count: 0 };
      }
      acc[expense.category].total += expense.amount;
      acc[expense.category].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return `
Spending Pattern Analysis (Last 60 days):

Category Frequency:
${Object.entries(categoryFrequency)
  .sort(([,a], [,b]) => b - a)
  .map(([category, count]) => `- ${category}: ${count} transactions`)
  .join('\n')}

Average Amounts by Category:
${Object.entries(categoryAverages)
  .map(([category, data]) => `- ${category}: $${(data.total / data.count).toFixed(2)} average`)
  .join('\n')}

High-Value Transactions (>$100):
${last60Days
  .filter(e => e.amount > 100)
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 5)
  .map(e => `- $${e.amount} on ${e.description} (${e.category})`)
  .join('\n')}
`;
  }

  private prepareHistoricalData(expenses: ExpenseType[]): string {
    const last90Days = expenses.filter(e => 
      new Date(e.date) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );

    // Group by month
    const monthlyData = last90Days.reduce((acc, expense) => {
      const month = expense.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!acc[month]) {
        acc[month] = {};
      }
      acc[month][expense.category] = (acc[month][expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return `
Historical Spending Trends (Last 3 months):

Monthly Breakdown:
${Object.entries(monthlyData)
  .map(([month, categories]) => {
    const total = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
    return `${month}: $${total.toFixed(2)} total\n${Object.entries(categories)
      .map(([cat, amount]) => `  - ${cat}: $${amount.toFixed(2)}`)
      .join('\n')}`;
  }).join('\n\n')}

Recent Trends:
- Total transactions: ${last90Days.length}
- Average daily spending: $${(last90Days.reduce((sum, e) => sum + e.amount, 0) / 90).toFixed(2)}
`;
  }

  private getFallbackBudgetRecommendations(
    expenses: ExpenseType[], 
    currentBudgets?: Record<string, number>
  ): BudgetRecommendation[] {
    const categorySpending = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const recommendations: BudgetRecommendation[] = [];

    Object.entries(categorySpending).forEach(([category, spending]) => {
      const currentBudget = currentBudgets?.[category];
      
      if (!currentBudget || spending > currentBudget * 1.1) {
        recommendations.push({
          category,
          currentSpending: spending,
          recommendedBudget: spending * 0.9,
          reasoning: `Consider reducing ${category} spending by 10% to optimize your budget`,
          potentialSavings: spending * 0.1
        });
      }
    });

    return recommendations.slice(0, 5);
  }

  private getFallbackSavingsOpportunities(expenses: ExpenseType[]) {
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalSpending = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return Object.entries(categoryTotals)
      .filter(([, amount]) => amount > totalSpending * 0.1)
      .map(([category, amount]) => ({
        category,
        potentialSavings: amount * 0.15,
        method: `Review and optimize ${category} expenses`,
        difficulty: 'medium' as const,
        impact: amount > totalSpending * 0.2 ? 'high' as const : 'medium' as const
      }))
      .slice(0, 5);
  }

  private getFallbackPredictiveAnalysis(expenses: ExpenseType[]): PredictiveAnalysis {
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      monthlyForecast: Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        predictedAmount: amount,
        confidence: 0.7
      })),
      budgetRisk: [],
      savingsOpportunities: Object.entries(categoryTotals)
        .slice(0, 3)
        .map(([category, amount]) => ({
          category,
          potentialSavings: amount * 0.1,
          method: `Optimize ${category} spending`
        }))
    };
  }

  private getFallbackPersonalizedTips(expenses: ExpenseType[]): string[] {
    const tips = [
      "Track your daily expenses to identify spending patterns",
      "Set a weekly budget limit for discretionary expenses",
      "Review subscription services and cancel unused ones",
      "Use the 24-hour rule before making non-essential purchases",
      "Compare prices before making significant purchases"
    ];

    return tips.slice(0, 5);
  }

  private getMostExpensiveDay(expenses: ExpenseType[]): string {
    const dailyTotals = expenses.reduce((acc, expense) => {
      const day = expense.date.toLocaleDateString();
      acc[day] = (acc[day] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const [day, amount] = Object.entries(dailyTotals).reduce((a, b) => 
      dailyTotals[a[0]] > dailyTotals[b[0]] ? a : b
    );

    return `${day} ($${amount.toFixed(2)})`;
  }

  private getSpendingSummary(expenses: ExpenseType[]): string {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return `Total: $${total.toFixed(2)} across ${expenses.length} transactions
Top categories: ${topCategories.map(([cat, amount]) => `${cat} ($${amount.toFixed(2)})`).join(', ')}`;
  }
}
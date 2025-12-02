/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { GeminiClient } from './geminiClient';
import { ExpenseType } from '@/types/expense';
import { 
  SpendingPattern, 
  SpendingInsight, 
  SpendingAnomaly, 
  FinancialHealthScore,
  AIInsightsResponse 
} from '@/types/ai';

export class PatternAnalysisService {
  private static instance: PatternAnalysisService;
  private geminiClient: GeminiClient;

  private constructor() {
    this.geminiClient = GeminiClient.getInstance();
  }

  static getInstance(): PatternAnalysisService {
    if (!PatternAnalysisService.instance) {
      PatternAnalysisService.instance = new PatternAnalysisService();
    }
    return PatternAnalysisService.instance;
  }

  async analyzeSpendingPatterns(expenses: ExpenseType[], timeRange: 'week' | 'month' | 'quarter' = 'month'): Promise<AIInsightsResponse> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackAnalysis(expenses);
    }

    try {
      const analysisData = this.prepareExpenseData(expenses, timeRange);
      
      const prompt = `
Analyze the following spending data and provide comprehensive financial insights:

${analysisData}

Please provide a detailed analysis in the following JSON format:
{
  "insights": [
    {
      "id": "insight_1",
      "type": "warning|info|success|trend",
      "title": "Short insight title",
      "description": "Detailed description with specific numbers",
      "actionable": true,
      "action": "Specific action user can take",
      "severity": "low|medium|high",
      "category": "category_name",
      "amount": 0.00,
      "createdAt": "${new Date().toISOString()}"
    }
  ],
  "patterns": [
    {
      "category": "category_name",
      "averageAmount": 0.00,
      "frequency": "daily|weekly|monthly|occasional",
      "trend": "increasing|decreasing|stable",
      "confidence": 0.95
    }
  ],
  "healthScore": {
    "overall": 85,
    "budgetAdherence": 90,
    "spendingConsistency": 80,
    "categoryBalance": 85,
    "trendHealth": 88,
    "lastUpdated": "${new Date().toISOString()}"
  },
  "anomalies": [
    {
      "id": "anomaly_1",
      "type": "unusual_amount|unusual_frequency|unusual_category",
      "description": "Description of the anomaly",
      "severity": "low|medium|high",
      "detectedAt": "${new Date().toISOString()}",
      "confidence": 0.85
    }
  ]
}

Focus on:
1. Identifying spending trends and patterns
2. Unusual or concerning spending behavior
3. Opportunities for savings and optimization
4. Overall financial health assessment
5. Actionable recommendations
6. Category-wise analysis and insights
`;

      const response = await this.geminiClient.generateStructuredContent<{
        insights: SpendingInsight[];
        patterns: SpendingPattern[];
        healthScore: FinancialHealthScore;
        anomalies: SpendingAnomaly[];
      }>(prompt);

      if (response.success && response.data) {
        return {
          ...response.data,
          recommendations: await this.generateRecommendations(expenses)
        };
      }

      return this.getFallbackAnalysis(expenses);
    } catch (error) {
      console.error('Pattern analysis error:', error);
      return this.getFallbackAnalysis(expenses);
    }
  }

  private prepareExpenseData(expenses: ExpenseType[], timeRange: string): string {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
    }

    const filteredExpenses = expenses.filter(expense => 
      new Date(expense.date) >= startDate
    );

    // Group by category
    const categoryData = filteredExpenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = {
          total: 0,
          count: 0,
          amounts: [],
          dates: []
        };
      }
      acc[expense.category].total += expense.amount;
      acc[expense.category].count += 1;
      acc[expense.category].amounts.push(expense.amount);
      acc[expense.category].dates.push(expense.date.toISOString());
      return acc;
    }, {} as Record<string, { total: number; count: number; amounts: number[]; dates: string[] }>);

    // Group by day of week
    const weekdayData = filteredExpenses.reduce((acc, expense) => {
      const dayOfWeek = new Date(expense.date).toLocaleDateString('en-US', { weekday: 'long' });
      acc[dayOfWeek] = (acc[dayOfWeek] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return `
Time Range: ${timeRange} (${filteredExpenses.length} transactions)
Total Spending: $${filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}

Category Breakdown:
${Object.entries(categoryData).map(([category, data]) => 
  `- ${category}: $${data.total.toFixed(2)} (${data.count} transactions, avg: $${(data.total / data.count).toFixed(2)})`
).join('\n')}

Day of Week Analysis:
${Object.entries(weekdayData).map(([day, amount]) => 
  `- ${day}: $${amount.toFixed(2)}`
).join('\n')}

Recent Large Transactions (>$100):
${filteredExpenses
  .filter(e => e.amount > 100)
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 5)
  .map(e => `- $${e.amount.toFixed(2)} on ${e.date.toLocaleDateString()} for ${e.description} (${e.category})`)
  .join('\n')}

Transaction Frequency:
${Object.entries(categoryData).map(([category, data]) => {
  const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const frequency = data.count / days;
  return `- ${category}: ${frequency.toFixed(2)} transactions per day`;
}).join('\n')}
`;
  }

  private async generateRecommendations(expenses: ExpenseType[]) {
    const recommendations = [];
    
    // Simple rule-based recommendations for fallback
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalSpending = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    for (const [category, amount] of Object.entries(categoryTotals)) {
      const percentage = (amount / totalSpending) * 100;
      
      if (percentage > 40) {
        recommendations.push({
          category,
          currentSpending: amount,
          recommendedBudget: amount * 0.85,
          reasoning: `${category} represents ${percentage.toFixed(1)}% of your spending. Consider reducing by 15%.`,
          potentialSavings: amount * 0.15
        });
      }
    }

    return recommendations;
  }

  private getFallbackAnalysis(expenses: ExpenseType[]): AIInsightsResponse {
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalSpending = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    const averageTransaction = totalSpending / expenses.length;

    const insights: SpendingInsight[] = [];
    const patterns: SpendingPattern[] = [];
    const anomalies: SpendingAnomaly[] = [];

    // Generate basic insights
    const topCategory = Object.entries(categoryTotals).reduce((a, b) => 
      categoryTotals[a[0]] > categoryTotals[b[0]] ? a : b
    );

    insights.push({
      id: 'top_category',
      type: 'info',
      title: `Highest spending category: ${topCategory[0]}`,
      description: `You spent $${topCategory[1].toFixed(2)} on ${topCategory[0]}, which is ${((topCategory[1] / totalSpending) * 100).toFixed(1)}% of your total spending.`,
      actionable: true,
      action: `Review your ${topCategory[0]} expenses for potential savings`,
      severity: 'medium',
      category: topCategory[0],
      amount: topCategory[1],
      createdAt: new Date()
    });

    // Generate patterns
    Object.entries(categoryTotals).forEach(([category, total]) => {
      const categoryExpenses = expenses.filter(e => e.category === category);
      patterns.push({
        category,
        averageAmount: total / categoryExpenses.length,
        frequency: categoryExpenses.length > 10 ? 'frequent' as any : 'occasional',
        trend: 'stable',
        confidence: 0.7
      });
    });

    // Find anomalies (large transactions)
    expenses.forEach(expense => {
      if (expense.amount > averageTransaction * 3) {
        anomalies.push({
          id: `anomaly_${expense.id}`,
          expenseId: expense.id,
          type: 'unusual_amount',
          description: `Unusually large ${expense.category} expense: $${expense.amount}`,
          severity: expense.amount > averageTransaction * 5 ? 'high' : 'medium',
          detectedAt: new Date(),
          confidence: 0.8
        });
      }
    });

    return {
      insights,
      patterns,
      recommendations: [],
      healthScore: {
        overall: 75,
        budgetAdherence: 80,
        spendingConsistency: 70,
        categoryBalance: 75,
        trendHealth: 75,
        lastUpdated: new Date()
      },
      anomalies
    };
  }

  async generateQuickInsight(expenses: ExpenseType[]): Promise<string> {
    if (!this.geminiClient.isAvailable()) {
      return `You have ${expenses.length} expenses totaling $${expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)} this month.`;
    }

    const recentExpenses = expenses.slice(-10);
    const expensesSummary = recentExpenses.map(e => 
      `$${e.amount} on ${e.description} (${e.category})`
    ).join(', ');

    const prompt = `
Based on these recent expenses: ${expensesSummary}

Generate a single, insightful sentence about the user's spending pattern. Be specific, helpful, and actionable. Keep it under 100 characters.
`;

    const response = await this.geminiClient.generateContent({
      prompt,
      temperature: 0.4,
      maxTokens: 100
    });

    return response.success ? response.text.trim() : 
      `Your recent spending shows a focus on ${recentExpenses[0]?.category || 'various'} expenses.`;
  }
}
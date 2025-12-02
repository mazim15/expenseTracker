import { GeminiClient } from './geminiClient';
import { ExpenseType } from '@/types/expense';
import { SpendingInsight } from '@/types/ai';
import { PatternAnalysisService } from './patternAnalysis';
import { AnomalyDetectionService } from './anomalyDetection';
import { RecommendationService } from './recommendations';

export class InsightsService {
  private static instance: InsightsService;
  private geminiClient: GeminiClient;
  private patternAnalysis: PatternAnalysisService;
  private anomalyDetection: AnomalyDetectionService;
  private recommendations: RecommendationService;

  private constructor() {
    this.geminiClient = GeminiClient.getInstance();
    this.patternAnalysis = PatternAnalysisService.getInstance();
    this.anomalyDetection = AnomalyDetectionService.getInstance();
    this.recommendations = RecommendationService.getInstance();
  }

  static getInstance(): InsightsService {
    if (!InsightsService.instance) {
      InsightsService.instance = new InsightsService();
    }
    return InsightsService.instance;
  }

  async generateDashboardInsights(expenses: ExpenseType[]): Promise<{
    quickInsight: string;
    keyInsights: SpendingInsight[];
    recommendations: string[];
    healthScore: number;
  }> {
    const [quickInsight, analysis, personalizedTips] = await Promise.all([
      this.generateQuickInsight(expenses),
      this.patternAnalysis.analyzeSpendingPatterns(expenses),
      this.recommendations.generatePersonalizedTips(expenses)
    ]);

    return {
      quickInsight,
      keyInsights: analysis.insights.slice(0, 3), // Top 3 insights
      recommendations: personalizedTips.slice(0, 4), // Top 4 recommendations
      healthScore: analysis.healthScore.overall
    };
  }

  async generateQuickInsight(expenses: ExpenseType[]): Promise<string> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackQuickInsight(expenses);
    }

    try {
      const recentExpenses = expenses.slice(-30); // Last 30 transactions
      const thisMonth = new Date();
      thisMonth.setDate(1);
      
      const monthlyExpenses = expenses.filter(e => new Date(e.date) >= thisMonth);
      const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      const topCategory = this.getTopSpendingCategory(monthlyExpenses);
      
      const prompt = `
Generate a single, insightful sentence about the user's spending this month:

Monthly spending: $${monthlyTotal.toFixed(2)} across ${monthlyExpenses.length} transactions
Top category: ${topCategory.category} ($${topCategory.amount.toFixed(2)})
Recent transactions: ${recentExpenses.slice(-5).map(e => `$${e.amount} on ${e.description}`).join(', ')}

Create an engaging, specific insight that:
1. Highlights a key spending pattern or trend
2. Is actionable or informative
3. Uses specific numbers
4. Is under 150 characters
5. Sounds natural and helpful

Examples:
- "You've spent 40% more on dining this month - try cooking twice a week to save $200+"
- "Your entertainment budget looks healthy at $85, leaving room for that concert ticket!"
- "Grocery spending is up 15% but you're saving on takeout - smart trade-off!"
`;

      const response = await this.geminiClient.generateContent({
        prompt,
        temperature: 0.6,
        maxTokens: 200
      });

      if (response.success && response.text.trim()) {
        return response.text.trim().replace(/"/g, '');
      }

      return this.getFallbackQuickInsight(expenses);
    } catch (error) {
      console.error('Quick insight generation error:', error);
      return this.getFallbackQuickInsight(expenses);
    }
  }

  async generateWeeklyReport(expenses: ExpenseType[]): Promise<{
    summary: string;
    highlights: string[];
    concerns: string[];
    nextWeekTips: string[];
  }> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackWeeklyReport(expenses);
    }

    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyExpenses = expenses.filter(e => new Date(e.date) >= weekAgo);
      
      const weeklyData = this.prepareWeeklyData(weeklyExpenses);
      
      const prompt = `
Generate a weekly spending report based on this data:

${weeklyData}

Provide the report in JSON format:
{
  "summary": "2-3 sentence overview of the week's spending",
  "highlights": ["Positive spending behavior 1", "Positive spending behavior 2"],
  "concerns": ["Area of concern 1", "Area of concern 2"],
  "nextWeekTips": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"]
}

Make it:
1. Personal and specific to their data
2. Encouraging but honest about concerns
3. Actionable and practical
4. Forward-looking for next week
`;

      const response = await this.geminiClient.generateStructuredContent<{
        summary: string;
        highlights: string[];
        concerns: string[];
        nextWeekTips: string[];
      }>(prompt);

      if (response.success && response.data) {
        return response.data;
      }

      return this.getFallbackWeeklyReport(expenses);
    } catch (error) {
      console.error('Weekly report generation error:', error);
      return this.getFallbackWeeklyReport(expenses);
    }
  }

  async generateSpendingStory(expenses: ExpenseType[], timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<string> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackSpendingStory(expenses, timeframe);
    }

    try {
      const timeframeExpenses = this.filterByTimeframe(expenses, timeframe);
      const storyData = this.prepareStoryData(timeframeExpenses, timeframe);
      
      const prompt = `
Create an engaging narrative about this user's spending journey for the ${timeframe}:

${storyData}

Write a compelling 2-3 paragraph story that:
1. Tells their spending journey like a story
2. Highlights key moments and decisions
3. Identifies patterns and turning points
4. Ends with insights for improvement
5. Uses a warm, understanding tone
6. Includes specific details and numbers

Make it personal and relatable, like a financial friend reviewing their journey.
`;

      const response = await this.geminiClient.generateContent({
        prompt,
        temperature: 0.7,
        maxTokens: 500
      });

      if (response.success && response.text.trim()) {
        return response.text.trim();
      }

      return this.getFallbackSpendingStory(expenses, timeframe);
    } catch (error) {
      console.error('Spending story generation error:', error);
      return this.getFallbackSpendingStory(expenses, timeframe);
    }
  }

  async generateCategoryInsight(expenses: ExpenseType[], category: string): Promise<{
    insight: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    recommendation: string;
    comparison: string;
  }> {
    const categoryExpenses = expenses.filter(e => e.category === category);
    
    if (categoryExpenses.length === 0) {
      return {
        insight: `No ${category} expenses found in your recent history.`,
        trend: 'stable',
        recommendation: `Consider tracking ${category} expenses to better understand this aspect of your spending.`,
        comparison: 'No historical data available for comparison.'
      };
    }

    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackCategoryInsight(categoryExpenses, category);
    }

    try {
      const categoryData = this.prepareCategoryData(categoryExpenses, category);
      
      const prompt = `
Analyze this category's spending data and provide insights:

${categoryData}

Respond in JSON format:
{
  "insight": "Key insight about their spending in this category",
  "trend": "increasing|decreasing|stable",
  "recommendation": "Specific actionable recommendation",
  "comparison": "How this compares to typical spending patterns"
}

Be specific, helpful, and encouraging.
`;

      const response = await this.geminiClient.generateStructuredContent<{
        insight: string;
        trend: 'increasing' | 'decreasing' | 'stable';
        recommendation: string;
        comparison: string;
      }>(prompt);

      if (response.success && response.data) {
        return response.data;
      }

      return this.getFallbackCategoryInsight(categoryExpenses, category);
    } catch (error) {
      console.error('Category insight generation error:', error);
      return this.getFallbackCategoryInsight(categoryExpenses, category);
    }
  }

  private prepareWeeklyData(expenses: ExpenseType[]): string {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const dailyBreakdown = expenses.reduce((acc, expense) => {
      const day = expense.date.toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = (acc[day] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const categoryBreakdown = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return `
Week Summary:
- Total spent: $${total.toFixed(2)}
- Number of transactions: ${expenses.length}
- Average per transaction: $${(total / expenses.length || 0).toFixed(2)}

Daily Breakdown:
${Object.entries(dailyBreakdown)
  .map(([day, amount]) => `- ${day}: $${amount.toFixed(2)}`)
  .join('\n')}

Category Breakdown:
${Object.entries(categoryBreakdown)
  .sort(([,a], [,b]) => b - a)
  .map(([category, amount]) => `- ${category}: $${amount.toFixed(2)}`)
  .join('\n')}

Largest expense: $${Math.max(...expenses.map(e => e.amount)).toFixed(2)}
Most frequent category: ${Object.entries(categoryBreakdown).reduce((a, b) => categoryBreakdown[a[0]] > categoryBreakdown[b[0]] ? a : b)[0]}
`;
  }

  private prepareStoryData(expenses: ExpenseType[], timeframe: string): string {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const sortedExpenses = expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const milestones = [
      sortedExpenses[0], // First expense
      ...sortedExpenses.filter(e => e.amount > 100).slice(0, 3), // Large expenses
      sortedExpenses[sortedExpenses.length - 1] // Last expense
    ].filter(Boolean);

    return `
${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Overview:
- Total spending: $${total.toFixed(2)}
- ${expenses.length} transactions
- Timeframe: ${sortedExpenses[0]?.date.toLocaleDateString()} to ${sortedExpenses[sortedExpenses.length - 1]?.date.toLocaleDateString()}

Key Moments:
${milestones.map((expense, index) => 
  `${index + 1}. ${expense.date.toLocaleDateString()}: $${expense.amount.toFixed(2)} on ${expense.description} (${expense.category})`
).join('\n')}

Spending Pattern:
${this.getSpendingPattern(expenses)}
`;
  }

  private prepareCategoryData(expenses: ExpenseType[], category: string): string {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const average = total / expenses.length;
    const recentMonth = expenses.filter(e => 
      new Date(e.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    return `
${category.charAt(0).toUpperCase() + category.slice(1)} Category Analysis:
- Total spent: $${total.toFixed(2)} across ${expenses.length} transactions
- Average per transaction: $${average.toFixed(2)}
- Recent month: ${recentMonth.length} transactions, $${recentMonth.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}

Recent transactions:
${expenses.slice(-5).map(e => 
  `- ${e.date.toLocaleDateString()}: $${e.amount.toFixed(2)} on ${e.description}`
).join('\n')}

Frequency: ${expenses.length > 20 ? 'Very frequent' : expenses.length > 10 ? 'Regular' : 'Occasional'}
`;
  }

  private getTopSpendingCategory(expenses: ExpenseType[]): { category: string; amount: number } {
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const [category, amount] = Object.entries(categoryTotals).reduce((a, b) => 
      categoryTotals[a[0]] > categoryTotals[b[0]] ? a : b
    );

    return { category, amount };
  }

  private getSpendingPattern(expenses: ExpenseType[]): string {
    if (expenses.length < 5) return "Limited data for pattern analysis";

    const weekdays = expenses.filter(e => {
      const day = new Date(e.date).getDay();
      return day >= 1 && day <= 5;
    });

    const weekends = expenses.filter(e => {
      const day = new Date(e.date).getDay();
      return day === 0 || day === 6;
    });

    const weekdayAvg = weekdays.reduce((sum, e) => sum + e.amount, 0) / (weekdays.length || 1);
    const weekendAvg = weekends.reduce((sum, e) => sum + e.amount, 0) / (weekends.length || 1);

    if (weekendAvg > weekdayAvg * 1.3) {
      return "Weekend spender - higher activity on weekends";
    } else if (weekdayAvg > weekendAvg * 1.3) {
      return "Weekday spender - more active during work days";
    } else {
      return "Consistent spender throughout the week";
    }
  }

  private filterByTimeframe(expenses: ExpenseType[], timeframe: string): ExpenseType[] {
    const now = new Date();
    const cutoff = new Date();

    switch (timeframe) {
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoff.setMonth(now.getMonth() - 3);
        break;
    }

    return expenses.filter(e => new Date(e.date) >= cutoff);
  }

  // Fallback methods for when AI is not available

  private getFallbackQuickInsight(expenses: ExpenseType[]): string {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthlyExpenses = expenses.filter(e => new Date(e.date) >= thisMonth);
    const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const topCategory = this.getTopSpendingCategory(monthlyExpenses);

    return `You've spent $${total.toFixed(2)} this month, with ${topCategory.category} taking the lead at $${topCategory.amount.toFixed(2)}.`;
  }

  private getFallbackWeeklyReport(expenses: ExpenseType[]) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyExpenses = expenses.filter(e => new Date(e.date) >= weekAgo);
    const total = weeklyExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      summary: `This week you made ${weeklyExpenses.length} transactions totaling $${total.toFixed(2)}.`,
      highlights: ["You tracked all your expenses consistently"],
      concerns: weeklyExpenses.length > 20 ? ["High transaction frequency this week"] : [],
      nextWeekTips: ["Continue tracking your expenses", "Review your top spending categories"]
    };
  }

  private getFallbackSpendingStory(expenses: ExpenseType[], timeframe: string): string {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const topCategory = this.getTopSpendingCategory(expenses);

    return `Over the past ${timeframe}, your spending journey shows $${total.toFixed(2)} across ${expenses.length} transactions. Your focus has been on ${topCategory.category} expenses, which represents your primary spending area. This pattern suggests consistent tracking habits and provides a good foundation for financial planning.`;
  }

  private getFallbackCategoryInsight(expenses: ExpenseType[], category: string) {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const average = total / expenses.length;

    return {
      insight: `Your ${category} spending shows ${expenses.length} transactions totaling $${total.toFixed(2)}.`,
      trend: 'stable' as const,
      recommendation: `Consider setting a monthly budget of $${(total * 1.1).toFixed(2)} for ${category} expenses.`,
      comparison: `Average transaction amount is $${average.toFixed(2)} in this category.`
    };
  }
}
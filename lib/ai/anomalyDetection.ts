import { GeminiClient } from './geminiClient';
import { ExpenseType } from '@/types/expense';
import { SpendingAnomaly } from '@/types/ai';

export class AnomalyDetectionService {
  private static instance: AnomalyDetectionService;
  private geminiClient: GeminiClient;

  private constructor() {
    this.geminiClient = GeminiClient.getInstance();
  }

  static getInstance(): AnomalyDetectionService {
    if (!AnomalyDetectionService.instance) {
      AnomalyDetectionService.instance = new AnomalyDetectionService();
    }
    return AnomalyDetectionService.instance;
  }

  async detectAnomalies(expenses: ExpenseType[], lookbackDays = 30): Promise<SpendingAnomaly[]> {
    const anomalies: SpendingAnomaly[] = [];

    // Get recent expenses for comparison
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
    
    const recentExpenses = expenses.filter(expense => 
      new Date(expense.date) >= cutoffDate
    );

    if (recentExpenses.length < 5) {
      return anomalies; // Not enough data for meaningful analysis
    }

    // Rule-based anomaly detection
    anomalies.push(...this.detectAmountAnomalies(recentExpenses, expenses));
    anomalies.push(...this.detectFrequencyAnomalies(recentExpenses, expenses));
    anomalies.push(...this.detectDuplicateTransactions(recentExpenses));
    anomalies.push(...this.detectUnusualCategories(recentExpenses, expenses));

    // AI-powered anomaly detection if available
    if (this.geminiClient.isAvailable() && recentExpenses.length > 10) {
      const aiAnomalies = await this.detectAIAnomalies(recentExpenses, expenses);
      anomalies.push(...aiAnomalies);
    }

    return anomalies.filter((anomaly, index, self) => 
      index === self.findIndex(a => a.id === anomaly.id)
    );
  }

  private detectAmountAnomalies(recentExpenses: ExpenseType[], allExpenses: ExpenseType[]): SpendingAnomaly[] {
    const anomalies: SpendingAnomaly[] = [];

    // Calculate category baselines from historical data
    const categoryStats = this.calculateCategoryStats(allExpenses);

    recentExpenses.forEach(expense => {
      const stats = categoryStats[expense.category];
      if (!stats || stats.count < 3) return; // Need at least 3 transactions for comparison

      const standardDeviation = Math.sqrt(
        stats.amounts.reduce((sum, amount) => sum + Math.pow(amount - stats.average, 2), 0) / stats.count
      );

      // Detect amounts more than 2 standard deviations from the mean
      const zScore = Math.abs(expense.amount - stats.average) / (standardDeviation || 1);
      
      if (zScore > 2 && expense.amount > stats.average * 1.5) {
        anomalies.push({
          id: `amount_anomaly_${expense.id}`,
          expenseId: expense.id,
          type: 'unusual_amount',
          description: `Unusually large ${expense.category} expense: $${expense.amount.toFixed(2)} (typical range: $${(stats.average - standardDeviation).toFixed(2)} - $${(stats.average + standardDeviation).toFixed(2)})`,
          severity: zScore > 3 ? 'high' : 'medium',
          detectedAt: new Date(),
          confidence: Math.min(zScore / 3, 1)
        });
      }
    });

    return anomalies;
  }

  private detectFrequencyAnomalies(recentExpenses: ExpenseType[], allExpenses: ExpenseType[]): SpendingAnomaly[] {
    const anomalies: SpendingAnomaly[] = [];

    // Analyze spending frequency by category
    const categoryFrequency = this.calculateCategoryFrequency(allExpenses);
    const recentCategoryFrequency = this.calculateCategoryFrequency(recentExpenses, 7); // Last 7 days

    Object.entries(recentCategoryFrequency).forEach(([category, recentFreq]) => {
      const historicalFreq = categoryFrequency[category];
      if (!historicalFreq || historicalFreq < 0.1) return;

      // Check if recent frequency is significantly higher than normal
      if (recentFreq > historicalFreq * 3) {
        anomalies.push({
          id: `frequency_anomaly_${category}_${Date.now()}`,
          type: 'unusual_frequency',
          description: `Unusual increase in ${category} spending frequency: ${recentFreq.toFixed(1)} transactions per week vs typical ${historicalFreq.toFixed(1)}`,
          severity: recentFreq > historicalFreq * 5 ? 'high' : 'medium',
          detectedAt: new Date(),
          confidence: Math.min((recentFreq / historicalFreq) / 3, 1)
        });
      }
    });

    return anomalies;
  }

  private detectDuplicateTransactions(expenses: ExpenseType[]): SpendingAnomaly[] {
    const anomalies: SpendingAnomaly[] = [];
    const duplicates = new Map<string, ExpenseType[]>();

    // Group by potential duplicate criteria
    expenses.forEach(expense => {
      const key = `${expense.amount}_${expense.description}_${expense.date.toDateString()}`;
      if (!duplicates.has(key)) {
        duplicates.set(key, []);
      }
      duplicates.get(key)!.push(expense);
    });

    // Find groups with more than one transaction
    duplicates.forEach((group, key) => {
      if (group.length > 1) {
        const [amount, description] = key.split('_');
        anomalies.push({
          id: `duplicate_${key}_${Date.now()}`,
          type: 'duplicate_transaction',
          description: `Potential duplicate transactions: ${group.length} identical entries for "${description}" ($${amount})`,
          severity: group.length > 2 ? 'high' : 'medium',
          detectedAt: new Date(),
          confidence: 0.9
        });
      }
    });

    return anomalies;
  }

  private detectUnusualCategories(recentExpenses: ExpenseType[], allExpenses: ExpenseType[]): SpendingAnomaly[] {
    const anomalies: SpendingAnomaly[] = [];

    // Find categories that are new or rarely used
    const categoryUsage = allExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentCategories = new Set(recentExpenses.map(e => e.category));

    recentCategories.forEach(category => {
      const usage = categoryUsage[category] || 0;
      const totalExpenses = allExpenses.length;

      // Flag categories used less than 5% of the time as unusual
      if (usage / totalExpenses < 0.05 && usage < 3) {
        const recentAmount = recentExpenses
          .filter(e => e.category === category)
          .reduce((sum, e) => sum + e.amount, 0);

        anomalies.push({
          id: `category_anomaly_${category}_${Date.now()}`,
          type: 'unusual_category',
          description: `Unusual category activity: $${recentAmount.toFixed(2)} spent on rarely-used category "${category}"`,
          severity: 'low',
          detectedAt: new Date(),
          confidence: 0.7
        });
      }
    });

    return anomalies;
  }

  private async detectAIAnomalies(recentExpenses: ExpenseType[], allExpenses: ExpenseType[]): Promise<SpendingAnomaly[]> {
    try {
      const expenseData = this.prepareExpenseDataForAI(recentExpenses, allExpenses);
      
      const prompt = `
Analyze the following spending data and identify any unusual patterns or anomalies:

${expenseData}

Look for:
1. Transactions that don't fit normal spending patterns
2. Unusual timing of expenses
3. Atypical amounts for specific categories
4. Potential fraud indicators
5. Spending behavior changes

Respond with JSON array of anomalies:
[
  {
    "id": "ai_anomaly_1",
    "type": "unusual_amount|unusual_frequency|unusual_category",
    "description": "Clear description of the anomaly",
    "severity": "low|medium|high",
    "confidence": 0.85,
    "detectedAt": "${new Date().toISOString()}"
  }
]

Only include high-confidence anomalies (>0.7). Maximum 5 anomalies.
`;

      const response = await this.geminiClient.generateStructuredContent<SpendingAnomaly[]>(prompt);

      if (response.success && response.data && Array.isArray(response.data)) {
        return response.data.map(anomaly => ({
          ...anomaly,
          detectedAt: new Date(),
          confidence: Math.min(Math.max(anomaly.confidence, 0), 1)
        }));
      }

      return [];
    } catch (error) {
      console.error('AI anomaly detection error:', error);
      return [];
    }
  }

  private calculateCategoryStats(expenses: ExpenseType[]) {
    const stats: Record<string, {
      count: number;
      total: number;
      average: number;
      amounts: number[];
    }> = {};

    expenses.forEach(expense => {
      if (!stats[expense.category]) {
        stats[expense.category] = {
          count: 0,
          total: 0,
          average: 0,
          amounts: []
        };
      }

      stats[expense.category].count++;
      stats[expense.category].total += expense.amount;
      stats[expense.category].amounts.push(expense.amount);
    });

    // Calculate averages
    Object.values(stats).forEach(stat => {
      stat.average = stat.total / stat.count;
    });

    return stats;
  }

  private calculateCategoryFrequency(expenses: ExpenseType[], days?: number): Record<string, number> {
    const now = new Date();
    const startDate = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : 
                     new Date(Math.min(...expenses.map(e => e.date.getTime())));
    
    const totalDays = Math.max(1, (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const weeksInPeriod = totalDays / 7;

    const categoryCounts = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to frequency per week
    const frequency: Record<string, number> = {};
    Object.entries(categoryCounts).forEach(([category, count]) => {
      frequency[category] = count / weeksInPeriod;
    });

    return frequency;
  }

  private prepareExpenseDataForAI(recentExpenses: ExpenseType[], allExpenses: ExpenseType[]): string {
    const recentTotal = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const historicalAverage = allExpenses.length > 0 ? 
      allExpenses.reduce((sum, e) => sum + e.amount, 0) / allExpenses.length : 0;

    return `
Recent Expenses (Last 30 days): ${recentExpenses.length} transactions, $${recentTotal.toFixed(2)} total
Historical Average Transaction: $${historicalAverage.toFixed(2)}

Recent Transactions:
${recentExpenses.slice(-20).map(e => 
  `- ${e.date.toLocaleDateString()}: $${e.amount.toFixed(2)} for ${e.description} (${e.category})`
).join('\n')}

Category Breakdown (Recent):
${Object.entries(recentExpenses.reduce((acc, e) => {
  acc[e.category] = (acc[e.category] || 0) + e.amount;
  return acc;
}, {} as Record<string, number>)).map(([cat, amount]) => 
  `- ${cat}: $${amount.toFixed(2)}`
).join('\n')}
`;
  }

  async checkSingleTransaction(expense: ExpenseType, userHistory: ExpenseType[]): Promise<SpendingAnomaly | null> {
    const similarTransactions = userHistory.filter(e => 
      e.category === expense.category && 
      Math.abs(new Date(e.date).getTime() - new Date(expense.date).getTime()) < 86400000 * 90 // 90 days
    );

    if (similarTransactions.length < 3) {
      return null; // Not enough history to detect anomalies
    }

    const amounts = similarTransactions.map(e => e.amount);
    const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const standardDeviation = Math.sqrt(
      amounts.reduce((sum, amount) => sum + Math.pow(amount - average, 2), 0) / amounts.length
    );

    const zScore = Math.abs(expense.amount - average) / (standardDeviation || 1);

    if (zScore > 2.5 && expense.amount > average * 2) {
      return {
        id: `single_anomaly_${expense.id}`,
        expenseId: expense.id,
        type: 'unusual_amount',
        description: `This ${expense.category} expense ($${expense.amount.toFixed(2)}) is unusually large compared to your typical spending`,
        severity: zScore > 3.5 ? 'high' : 'medium',
        detectedAt: new Date(),
        confidence: Math.min(zScore / 3, 1)
      };
    }

    return null;
  }
}
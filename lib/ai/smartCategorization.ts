import { GeminiClient } from './geminiClient';
import { SmartCategorizationRequest, SmartCategorizationResponse, CategoryPrediction } from '@/types/ai';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@/types/expense';

export class SmartCategorizationService {
  private static instance: SmartCategorizationService;
  private geminiClient: GeminiClient;

  private constructor() {
    this.geminiClient = GeminiClient.getInstance();
  }

  static getInstance(): SmartCategorizationService {
    if (!SmartCategorizationService.instance) {
      SmartCategorizationService.instance = new SmartCategorizationService();
    }
    return SmartCategorizationService.instance;
  }

  async suggestCategory({
    description,
    amount,
    merchant,
    location,
    userHistory = []
  }: SmartCategorizationRequest): Promise<SmartCategorizationResponse> {
    if (!this.geminiClient.isAvailable()) {
      return this.getFallbackCategorization(description);
    }

    try {
      const availableCategories = EXPENSE_CATEGORIES.map(cat => ({
        value: cat.value,
        label: cat.label,
        description: this.getCategoryDescription(cat.value)
      }));

      const userHistoryContext = userHistory.length > 0 
        ? `\n\nUser's previous similar expenses:\n${userHistory.map(h => 
            `- "${h.description}" was categorized as "${h.category}"${h.merchant ? ` (merchant: ${h.merchant})` : ''}`
          ).join('\n')}`
        : '';

      const prompt = `
Analyze this expense and suggest the most appropriate category:

Expense Details:
- Description: "${description}"
- Amount: $${amount}
${merchant ? `- Merchant: "${merchant}"` : ''}
${location ? `- Location: "${location}"` : ''}

Available Categories:
${availableCategories.map(cat => `- ${cat.value}: ${cat.label} (${cat.description})`).join('\n')}
${userHistoryContext}

Please respond with JSON in this exact format:
{
  "suggestedCategory": "category_value",
  "confidence": 0.95,
  "alternativeCategories": [
    {"category": "alternative1", "confidence": 0.75, "reasoning": "explanation"},
    {"category": "alternative2", "confidence": 0.65, "reasoning": "explanation"}
  ],
  "reasoning": "Detailed explanation for the main suggestion"
}

Consider:
1. The expense description and merchant name
2. Typical amount ranges for each category
3. User's historical categorization patterns
4. Common sense categorization rules
`;

      const response = await this.geminiClient.generateStructuredContent<{
        suggestedCategory: string;
        confidence: number;
        alternativeCategories: CategoryPrediction[];
        reasoning: string;
      }>(prompt);

      if (response.success && response.data) {
        // Validate that suggested category exists
        const validCategory = this.validateCategory(response.data.suggestedCategory);
        
        return {
          suggestedCategory: validCategory,
          confidence: Math.min(Math.max(response.data.confidence, 0), 1),
          alternativeCategories: response.data.alternativeCategories
            .map(alt => ({
              ...alt,
              category: this.validateCategory(alt.category)
            }))
            .filter(alt => alt.category !== validCategory)
            .slice(0, 3), // Limit to top 3 alternatives
          reasoning: response.data.reasoning
        };
      }

      // Fallback if AI fails
      return this.getFallbackCategorization(description);
    } catch (error) {
      console.error('Smart categorization error:', error);
      return this.getFallbackCategorization(description);
    }
  }

  private validateCategory(category: string): ExpenseCategory {
    const validCategories = EXPENSE_CATEGORIES.map(cat => cat.value);
    return validCategories.includes(category as ExpenseCategory) 
      ? category as ExpenseCategory 
      : 'other';
  }

  private getFallbackCategorization(description: string): SmartCategorizationResponse {
    const desc = description.toLowerCase();
    let suggestedCategory: ExpenseCategory = 'other';
    let confidence = 0.6;

    // Simple rule-based fallback
    if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery')) {
      suggestedCategory = 'food';
      confidence = 0.8;
    } else if (desc.includes('gas') || desc.includes('fuel') || desc.includes('uber') || desc.includes('taxi')) {
      suggestedCategory = 'transportation';
      confidence = 0.8;
    } else if (desc.includes('movie') || desc.includes('game') || desc.includes('entertainment')) {
      suggestedCategory = 'entertainment';
      confidence = 0.8;
    } else if (desc.includes('hospital') || desc.includes('doctor') || desc.includes('pharmacy')) {
      suggestedCategory = 'healthcare';
      confidence = 0.8;
    } else if (desc.includes('rent') || desc.includes('utilities') || desc.includes('electricity')) {
      suggestedCategory = 'housing';
      confidence = 0.8;
    }

    return {
      suggestedCategory,
      confidence,
      alternativeCategories: [],
      reasoning: 'Fallback rule-based categorization'
    };
  }

  private getCategoryDescription(category: ExpenseCategory): string {
    const descriptions: Record<ExpenseCategory, string> = {
      food: 'Groceries, restaurants, dining, takeout, beverages',
      transportation: 'Gas, public transport, rideshare, parking, vehicle maintenance',
      housing: 'Rent, mortgage, utilities, maintenance, insurance',
      healthcare: 'Medical bills, pharmacy, doctor visits, health insurance',
      entertainment: 'Movies, games, streaming, hobbies, sports',
      shopping: 'Clothing, electronics, home goods, personal items',
      education: 'Tuition, books, courses, training, workshops',
      business: 'Work expenses, supplies, equipment, professional services',
      travel: 'Flights, hotels, vacation, accommodation, tourism',
      utilities: 'Electricity, water, internet, phone, cable',
      insurance: 'Health, auto, home, life insurance premiums',
      other: 'Miscellaneous expenses that don\'t fit other categories'
    };

    return descriptions[category] || 'General expenses';
  }

  async batchCategorize(expenses: SmartCategorizationRequest[]): Promise<SmartCategorizationResponse[]> {
    const results: SmartCategorizationResponse[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < expenses.length; i += batchSize) {
      const batch = expenses.slice(i, i + batchSize);
      const batchPromises = batch.map(expense => this.suggestCategory(expense));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < expenses.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }
}
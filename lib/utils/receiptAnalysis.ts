import { ExpenseType, ExpenseCategory, EXPENSE_CATEGORIES } from "@/types/expense";

// API key for Gemini 2.0 Flash
const API_KEY = "AIzaSyBuNKLW2q28nw7UMvhr9HCfIHALN-1_Rg8";
const API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

/**
 * Analyzes a receipt image using Gemini 2.0 Flash
 * @param imageData Base64 encoded image data
 * @returns Extracted expense data for multiple items
 */
export async function analyzeReceipt(imageData: string): Promise<Partial<ExpenseType>[]> {
  try {
    // Prepare request to Gemini API with prompt that asks for multiple items
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: "Please analyze this receipt and extract the following information in JSON format: \n\n1. Store/merchant name\n2. Date of purchase\n3. Individual items with their prices\n\nReturn results in this JSON structure:\n{\n  \"merchant\": \"store name\",\n  \"date\": \"YYYY-MM-DD\",\n  \"items\": [\n    {\"name\": \"item description\", \"price\": 00.00, \"category\": \"food/entertainment/etc\"}, \n    {...}\n  ],\n  \"total\": 00.00\n}"
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageData.split(',')[1] // Remove the data:image/jpeg;base64, part
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024
      }
    };

    // Call the Gemini API
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const textContent = result.candidates[0].content.parts[0].text;
    
    // Extract JSON from response (it may be wrapped in code blocks or contain extra text)
    let jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/) || 
                    textContent.match(/```\n([\s\S]*?)\n```/) ||
                    textContent.match(/{[\s\S]*?}/);
                    
    let extractedData: any = { items: [] };
    
    if (jsonMatch) {
      try {
        // Try to parse the JSON content
        extractedData = JSON.parse(jsonMatch[0].replace(/```json\n|```\n|```/g, ''));
      } catch (e) {
        console.error("Failed to parse JSON from response", e);
        // Fall back to trying to parse the entire text as JSON
        try {
          extractedData = JSON.parse(textContent);
        } catch (e2) {
          console.error("Failed to parse entire response as JSON", e2);
        }
      }
    } else {
      // If no JSON format is detected, try to parse the entire text
      try {
        extractedData = JSON.parse(textContent);
      } catch (e) {
        console.error("Failed to parse response text as JSON", e);
      }
    }

    // Inside analyzeReceipt function, add detailed logging
    console.log("Raw Gemini response:", textContent);
    console.log("Extracted data:", extractedData);
    console.log("Mapped expense items:", 
      extractedData.items?.map((item: any) => mapToExpenseType(item, extractedData.date, extractedData.merchant)) || []
    );

    // Make sure we handle empty cases more robustly
    if (!extractedData.items || !Array.isArray(extractedData.items) || extractedData.items.length === 0) {
      console.log("No items found in receipt, creating fallback item");
      return [mapToExpenseType({
        name: extractedData.merchant || "Unknown purchase",
        price: extractedData.total || 0,
        category: "other",
      }, extractedData.date, extractedData.merchant)];
    }

    // Map each item to an expense object
    return extractedData.items.map((item: any) => 
      mapToExpenseType(item, extractedData.date, extractedData.merchant)
    );
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
}

/**
 * Maps extracted item data to ExpenseType
 */
function mapToExpenseType(
  item: any, 
  dateStr?: string, 
  merchant?: string
): Partial<ExpenseType> {
  // Find the closest matching category in our system
  const extractedCategory = item.category?.toLowerCase() || "";
  let matchedCategory: ExpenseCategory = "other";
  
  if (extractedCategory) {
    // Find a matching category or default to "other"
    const categoryMatch = EXPENSE_CATEGORIES.find(cat => 
      extractedCategory.includes(cat.value) || 
      cat.value.includes(extractedCategory) ||
      extractedCategory.includes(cat.label.toLowerCase()) ||
      cat.label.toLowerCase().includes(extractedCategory)
    );
    
    if (categoryMatch) {
      matchedCategory = categoryMatch.value as ExpenseCategory;
    }
  }

  // For food items, use the food category
  if (matchedCategory === "other" && item.name) {
    const itemName = item.name.toLowerCase();
    if (itemName.includes("food") || 
        itemName.includes("meal") || 
        itemName.includes("snack") ||
        itemName.includes("drink") ||
        itemName.includes("cup") ||
        itemName.includes("pack")) {
      matchedCategory = "food";
    }
  }

  return {
    amount: parseFloat(item.price || "0"),
    date: dateStr ? new Date(dateStr) : new Date(),
    description: `${item.name}${merchant ? ` (${merchant})` : ''}`,
    category: matchedCategory
  };
}

/**
 * Converts a file to base64 encoded string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
} 
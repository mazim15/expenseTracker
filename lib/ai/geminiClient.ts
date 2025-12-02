const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

export interface GeminiRequest {
  prompt: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  text: string;
  success: boolean;
  error?: string;
}

export class GeminiClient {
  private static instance: GeminiClient;
  
  private constructor() {
    if (!API_KEY) {
      console.warn("Gemini API key not found. AI features will be disabled.");
    }
  }

  static getInstance(): GeminiClient {
    if (!GeminiClient.instance) {
      GeminiClient.instance = new GeminiClient();
    }
    return GeminiClient.instance;
  }

  async generateContent({
    prompt,
    context = "",
    temperature = 0.3,
    maxTokens = 1024
  }: GeminiRequest): Promise<GeminiResponse> {
    if (!API_KEY) {
      return {
        success: false,
        text: "",
        error: "Gemini API key not configured"
      };
    }

    try {
      const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: fullPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      };

      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        throw new Error("Invalid response structure from Gemini API");
      }

      const textContent = result.candidates[0].content.parts[0].text;

      return {
        success: true,
        text: textContent
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      return {
        success: false,
        text: "",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async generateStructuredContent<T>(
    prompt: string,
    context?: string,
    temperature = 0.2
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const response = await this.generateContent({
      prompt: `${prompt}\n\nPlease respond with valid JSON only, no additional text or formatting.`,
      context,
      temperature
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    try {
      // Extract JSON from response (handle code blocks)
      const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/) || 
                      response.text.match(/```\s*([\s\S]*?)\s*```/) ||
                      response.text.match(/{[\s\S]*}/);

      let jsonText = response.text;
      if (jsonMatch) {
        jsonText = jsonMatch[1] || jsonMatch[0];
      }

      // Clean up the JSON text
      jsonText = jsonText.replace(/```json|```/g, '').trim();

      // Try to fix common JSON issues
      jsonText = this.sanitizeJsonText(jsonText);

      const data = JSON.parse(jsonText) as T;
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error("Failed to parse JSON response:", error);
      console.error("Raw response:", response.text);
      return {
        success: false,
        error: "Failed to parse AI response as JSON"
      };
    }
  }

  private sanitizeJsonText(jsonText: string): string {
    // Remove any trailing commas before closing braces/brackets
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
    
    // Remove any leading/trailing non-JSON content
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }
    
    // Fix common quote issues
    jsonText = jsonText.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    
    // Remove any control characters
    jsonText = jsonText.replace(/[\x00-\x1F\x7F]/g, '');
    
    return jsonText;
  }

  isAvailable(): boolean {
    return !!API_KEY;
  }
}
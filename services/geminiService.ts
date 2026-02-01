
import { GoogleGenAI } from "@google/genai";
import { storageService } from "./storage";

export const geminiService = {
  async generateStyle(baseImageBase64: string, prompt: string, refinement?: string): Promise<string> {
    // 1. Get keys from Admin Panel pool
    const adminKeys = storageService.getApiKeys().filter(k => k.status === 'active').map(k => k.key);
    
    // 2. Define the hardcoded/environment key as the primary fallback
    const systemKey = process.env.API_KEY || '';
    
    // 3. Create a prioritized list: Admin keys first (for quota management), then System key
    const availableKeys = [...adminKeys];
    if (systemKey && !availableKeys.includes(systemKey)) {
      availableKeys.push(systemKey);
    }
    
    if (availableKeys.length === 0 || !availableKeys[0]) {
      throw new Error("No API key configured. Please add one in the Admin Panel.");
    }

    let lastError = null;
    const finalPrompt = refinement 
      ? `${prompt} ALSO APPLY THESE ADJUSTMENTS: ${refinement}`
      : prompt;

    // Cycle through keys if quota is hit
    for (const key of availableKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: baseImageBase64.split(',')[1] || baseImageBase64,
                  mimeType: 'image/png'
                }
              },
              { text: finalPrompt }
            ]
          }
        });

        const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part?.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
        throw new Error("Gemini returned text instead of an image. Try refining your prompt.");

      } catch (error: any) {
        lastError = error;
        console.error("Gemini API Error:", error);
        // If it's a quota or key issue, try the next key
        if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('API_KEY_INVALID')) {
          continue;
        }
        // If it's a safety or other terminal error, stop
        break;
      }
    }

    throw lastError || new Error("Style generation failed. Please try again later.");
  }
};

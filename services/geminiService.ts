
import { GoogleGenAI } from "@google/genai";
import { storageService } from "./storage";

export const geminiService = {
  async generateStyle(baseImageBase64: string, prompt: string, refinement?: string): Promise<string> {
    const apiKeys = storageService.getApiKeys().filter(k => k.status === 'active');
    const availableKeys = apiKeys.length > 0 ? apiKeys.map(k => k.key) : [process.env.API_KEY || ''];
    
    let lastError = null;
    const finalPrompt = refinement 
      ? `${prompt} ALSO APPLY THESE ADJUSTMENTS: ${refinement}`
      : prompt;

    for (const key of availableKeys) {
      if (!key) continue;
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

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
        throw new Error("No image data returned from model");

      } catch (error: any) {
        lastError = error;
        if (error.message?.includes('429') || error.message?.includes('quota')) continue;
        continue;
      }
    }

    throw lastError || new Error("Failed to generate image. Please check API keys in Admin.");
  }
};


import { GoogleGenAI } from "@google/genai";
import { storageService } from "./storage";
import { logger } from "./logger";

export const geminiService = {
  async generateStyle(baseImageBase64: string, prompt: string, refinement?: string): Promise<string> {
    logger.info('AI', 'Starting generation process', { promptLength: prompt.length, hasRefinement: !!refinement });

    // 1. Get keys from database
    const dbKeys = (await storageService.getApiKeys())
      .filter(k => k.status === 'active')
      .map(k => k.key);
    
    // 2. Fallback to Environment Variable
    const systemKey = process.env.API_KEY || '';
    
    const availableKeys = [...new Set([...dbKeys, systemKey])].filter(k => !!k);
    
    if (availableKeys.length === 0) {
      logger.error('AI', 'No API keys available in pool or environment');
      throw new Error("API Key configuration missing. Please check cloud environment or admin panel.");
    }

    const finalPrompt = refinement 
      ? `${prompt} ALSO APPLY THESE ADJUSTMENTS: ${refinement}`
      : prompt;

    for (let i = 0; i < availableKeys.length; i++) {
      const key = availableKeys[i];
      const keyLabel = `KeyIndex_${i}`;
      
      try {
        logger.debug('AI', `Attempting generation with ${keyLabel}`);
        const ai = new GoogleGenAI({ apiKey: key });
        
        // Use gemini-3-flash-preview as recommended for high-quality/fast tasks
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
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
          logger.info('AI', 'Generation successful', { keyLabel });
          return `data:image/png;base64,${part.inlineData.data}`;
        }
        
        throw new Error("Invalid response modality from AI: No inlineData found.");

      } catch (error: any) {
        logger.warn('AI', `Key ${keyLabel} failed`, { error: error.message });
        
        // If it's a quota error, continue to next key
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          continue;
        }
        // For other errors, we might want to fail fast or try one more key
        if (i === availableKeys.length - 1) {
          logger.error('AI', 'All available keys exhausted or failed');
          throw error;
        }
      }
    }

    throw new Error("Style generation failed after trying all keys.");
  }
};


import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";
import { storageService } from "./storage";

export const geminiService = {
  async generateStyle(baseImageBase64: string, prompt: string, refinement?: string): Promise<string> {
    logger.info('AI', 'Starting generation process', { promptLength: prompt.length, hasRefinement: !!refinement });

    // Fetch pool from DB
    const settings = await storageService.getAdminSettings();
    const keyPool = settings.geminiApiKeys?.filter(k => k.status === 'active') || [];
    
    // Check for process.env.API_KEY as final fallback if pool is empty
    const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
    
    if (keyPool.length === 0 && envKey) {
      keyPool.push({
        id: 'env-fallback',
        key: envKey,
        label: 'Environment Fallback',
        status: 'active',
        addedAt: Date.now()
      });
    }

    if (keyPool.length === 0) {
      logger.error('AI', 'No active API keys available in the pool');
      throw new Error("Service currently unavailable. Please add an API key in the Admin Panel.");
    }

    const finalPrompt = refinement 
      ? `Transform this person into the following style: ${prompt}. Additional instructions: ${refinement}. Preserve the person's facial features and identity exactly.`
      : `Transform this person into the following style: ${prompt}. Preserve the person's facial features and identity exactly. High-quality artistic output.`;

    // Try keys one by one until success
    for (const apiRecord of keyPool) {
      try {
        if (!apiRecord.key || apiRecord.key.trim() === '') {
          logger.warn('AI', `Skipping empty key: ${apiRecord.label}`);
          continue;
        }

        logger.info('AI', `Attempting with key: ${apiRecord.label}`);
        
        // Ensure process.env.API_KEY is synchronized for libraries that check it globally
        if (typeof process !== 'undefined' && process.env) {
          process.env.API_KEY = apiRecord.key;
        }
        
        // Pass the key directly to the constructor to avoid "API Key must be set" error
        const ai = new GoogleGenAI({ apiKey: apiRecord.key });
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: baseImageBase64.includes(',') ? baseImageBase64.split(',')[1] : baseImageBase64,
                  mimeType: 'image/png'
                }
              },
              { text: finalPrompt }
            ]
          }
        });

        if (response.candidates && response.candidates.length > 0) {
          const parts = response.candidates[0].content.parts;
          for (const part of parts) {
            if (part.inlineData) {
              logger.info('AI', `Generation successful with key: ${apiRecord.label}`);
              return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        }
        
        throw new Error("The AI returned a response without an image. Please try again.");

      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        const errorStatus = error.status || 'N/A';
        
        logger.warn('AI', `Key ${apiRecord.label} failed`, { 
          message: errorMessage,
          status: errorStatus
        });

        // Continue to the next key in the pool automatically
        continue;
      }
    }

    throw new Error("All API keys in the pool are currently unavailable or failing. Please check your keys in the Admin Panel.");
  }
};


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
    if (keyPool.length === 0 && process.env.API_KEY) {
      keyPool.push({
        id: 'env-fallback',
        key: process.env.API_KEY,
        label: 'Environment Fallback',
        status: 'active',
        addedAt: Date.now()
      });
    }

    if (keyPool.length === 0) {
      logger.error('AI', 'No active API keys available in the pool');
      throw new Error("Service currently unavailable. No active API keys found.");
    }

    const finalPrompt = refinement 
      ? `Transform this person into the following style: ${prompt}. Additional instructions: ${refinement}. Preserve the person's facial features and identity exactly.`
      : `Transform this person into the following style: ${prompt}. Preserve the person's facial features and identity exactly. High-quality artistic output.`;

    // Try keys one by one until success
    for (const apiRecord of keyPool) {
      try {
        logger.info('AI', `Attempting with key: ${apiRecord.label}`);
        
        // Temporarily set process.env.API_KEY to satisfy SDK requirements
        process.env.API_KEY = apiRecord.key;
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
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
        
        throw new Error("No image part in response");

      } catch (error: any) {
        const status = error.status || error.message;
        logger.warn('AI', `Key ${apiRecord.label} failed`, { status });

        // If it's a rate limit (429) or invalid key (401), we continue to the next key
        if (status?.toString().includes('429') || status?.toString().includes('401')) {
          continue; 
        }

        // If it's another error, we still try the next key but log the specific error
        continue;
      }
    }

    throw new Error("All available API keys in the pool failed or reached their limit. Please try again later.");
  }
};


import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";
import { storageService } from "./storage";
import { ApiKeyRecord } from "../types";

export const geminiService = {
  async generateStyle(baseImageBase64: string, prompt: string, refinement?: string): Promise<string> {
    logger.info('AI', 'Starting generation process', { promptLength: prompt.length, hasRefinement: !!refinement });

    // Fetch pool from DB
    const settings = await storageService.getAdminSettings();
    let keyPool = settings.geminiApiKeys?.filter(k => k.status === 'active') || [];
    
    // Check for process.env.API_KEY as final fallback if pool is empty
    const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
    
    if (keyPool.length === 0 && envKey && envKey.trim() !== '') {
      keyPool.push({
        id: 'env-fallback',
        key: envKey,
        label: 'Environment Fallback',
        status: 'active',
        addedAt: Date.now()
      });
    }

    if (keyPool.length === 0) {
      logger.error('AI', 'No active API keys available');
      throw new Error("Service unavailable. No active API keys found. Please add a NEW key in the Admin Panel.");
    }

    const finalPrompt = refinement 
      ? `Transform this person into the following style: ${prompt}. Additional instructions: ${refinement}. Preserve the person's facial features and identity exactly.`
      : `Transform this person into the following style: ${prompt}. Preserve the person's facial features and identity exactly. High-quality artistic output.`;

    // Try keys one by one
    for (const apiRecord of keyPool) {
      try {
        if (!apiRecord.key || apiRecord.key.length < 10) continue;

        logger.info('AI', `Attempting with key: ${apiRecord.label}`);
        
        // Pass the key directly to ensure the SDK uses the pool key, not a leaked env variable
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
          // Removed imageConfig hardcoding to let the AI match input photo dimensions
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
        
        throw new Error("Empty AI response");

      } catch (error: any) {
        const errorMessage = error.message || '';
        const isLeaked = errorMessage.toLowerCase().includes('leaked') || errorMessage.includes('403');
        const isInvalid = errorMessage.toLowerCase().includes('invalid') || errorMessage.includes('401');

        logger.warn('AI', `Key ${apiRecord.label} failed`, { message: errorMessage });

        // AUTO-DISABLE DEAD KEYS: If the key is specifically reported as leaked or invalid
        if (isLeaked || isInvalid) {
          logger.error('AI', `Permanently disabling key ${apiRecord.label} due to security/validity error`);
          this.deactivateKey(apiRecord.id);
        }

        // Continue to the next key
        continue;
      }
    }

    throw new Error("All your API keys are failing. One or more might be 'Leaked' or 'Rate Limited'. Please generate a NEW key in Google AI Studio and update your Admin Panel.");
  },

  async deactivateKey(id: string) {
    try {
      const settings = await storageService.getAdminSettings();
      const updatedKeys = (settings.geminiApiKeys || []).map(k => 
        k.id === id ? { ...k, status: 'invalid' as const } : k
      );
      await storageService.saveAdminSettings({ ...settings, geminiApiKeys: updatedKeys });
      logger.info('AI', `Key ${id} marked as invalid in database`);
    } catch (err) {
      logger.error('AI', 'Failed to auto-deactivate key', err);
    }
  }
};


import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

export const geminiService = {
  async generateStyle(baseImageBase64: string, prompt: string, refinement?: string): Promise<string> {
    logger.info('AI', 'Starting generation process', { promptLength: prompt.length, hasRefinement: !!refinement });

    // API key MUST be obtained exclusively from process.env.API_KEY
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      logger.error('AI', 'API Key configuration missing (process.env.API_KEY)');
      throw new Error("API Key configuration missing.");
    }

    const finalPrompt = refinement 
      ? `Transform this person into the following style: ${prompt}. Additional instructions: ${refinement}. Preserve the person's facial features and identity exactly.`
      : `Transform this person into the following style: ${prompt}. Preserve the person's facial features and identity exactly. High-quality artistic output.`;

    try {
      // Create a new instance with the required API key
      const ai = new GoogleGenAI({ apiKey });
      
      // Use gemini-2.5-flash-image for image editing as recommended
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

      // Extract generated image data from response parts
      if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData) {
            logger.info('AI', 'Generation successful');
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      
      throw new Error("Model response did not contain an image part.");

    } catch (error: any) {
      logger.error('AI', 'Generation failed', { error: error.message });
      throw error;
    }
  }
};

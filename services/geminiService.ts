
import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

export const geminiService = {
  /**
   * Generates a stylized version of a base image using Gemini 2.5 Flash Image.
   * Exclusively uses process.env.API_KEY as required by the coding guidelines.
   */
  async generateStyle(baseImageBase64: string, prompt: string, refinement?: string): Promise<string> {
    logger.info('AI', 'Starting generation process', { promptLength: prompt.length, hasRefinement: !!refinement });

    const finalPrompt = refinement 
      ? `Transform this person into the following style: ${prompt}. Additional instructions: ${refinement}. Preserve the person's facial features and identity exactly.`
      : `Transform this person into the following style: ${prompt}. Preserve the person's facial features and identity exactly. High-quality artistic output.`;

    try {
      // Initialize the SDK using the environment variable directly.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                // Ensure the base64 string is cleaned of data URL prefixes if present.
                data: baseImageBase64.includes(',') ? baseImageBase64.split(',')[1] : baseImageBase64,
                mimeType: 'image/png'
              }
            },
            { text: finalPrompt }
          ]
        }
      });

      // Iterate through parts to extract the generated image.
      if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData) {
            logger.info('AI', 'Generation successful');
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      
      throw new Error("No image data returned from model. Please try again with a different photo.");

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred during AI generation.';
      logger.error('AI', 'Generation process failed', { message: errorMessage });
      throw new Error(`AI Service Error: ${errorMessage}`);
    }
  }
};

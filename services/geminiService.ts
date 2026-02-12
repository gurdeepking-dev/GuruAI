
import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";
import { storageService } from "./storage";

export const geminiService = {
  /**
   * Helper to get a working API key from the pool or environment.
   */
  async getApiKey(): Promise<string> {
    try {
      const settings = await storageService.getAdminSettings();
      const pool = settings.geminiApiKeys || [];
      const activeFromPool = pool.find(k => k.status === 'active');
      
      const key = activeFromPool ? activeFromPool.key : process.env.API_KEY;
      if (!key) throw new Error("No API Key found in Pool or System. Please add one in Admin.");
      return key;
    } catch (e) {
      return process.env.API_KEY || '';
    }
  },

  /**
   * Stage 1: The Face Matcher.
   * Generates a styled image while locking the facial features.
   */
  async generateStyle(baseImageBase64: string, prompt: string, refinement?: string): Promise<string> {
    const apiKey = await this.getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    const facialInstruction = `
      CRITICAL: keep the facial features exactly as given in the uploaded photos.
      1. Analyze the faces (Man/Woman).
      2. Keep the SAME eyes, nose, and mouth shape.
      3. Do not change who they are.
      4. The faces must be a perfect match to the original people.
    `.trim();

    const styleInstruction = `
      STYLE: ${prompt}.
      FIXES: ${refinement || 'None'}.
      High quality lighting, clear faces, professional look.
    `.trim();

    const finalPrompt = `${facialInstruction}\n\n${styleInstruction}\n\nApply style only to clothes and background. KEEP FACES 100% SAME AS ORIGINAL.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: {
          parts: [
            { inlineData: { data: baseImageBase64.split(',')[1], mimeType: 'image/png' } },
            { text: finalPrompt }
          ]
        }
      });

      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part && part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      
      throw new Error("Could not create image. Please try a simpler description.");
    } catch (error: any) {
      logger.error('GeminiService', 'Style generation failed', error);
      throw error;
    }
  },

  /**
   * Stage 2: Video Creator.
   */
  async generateVideo(
    startImageBase64: string, 
    userPrompt: string, 
    onStatus?: (status: string) => void,
    endImageBase64?: string,
    useFastModel: boolean = false,
    preStyledKeyframe?: string
  ): Promise<string> {
    // For video generation, we prefer the user's selected key if available via window.aistudio
    let apiKey = process.env.API_KEY;
    if (!apiKey) {
      apiKey = await this.getApiKey();
    }
    
    const ai = new GoogleGenAI({ apiKey });
    const modelName = useFastModel ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';
    const cleanBase64 = (str: string) => str.includes(',') ? str.split(',')[1] : str;

    try {
      let styledKeyframeBase64 = preStyledKeyframe;
      if (!styledKeyframeBase64) {
        if (onStatus) onStatus("Matching faces...");
        styledKeyframeBase64 = await this.generateStyle(startImageBase64, userPrompt);
      }
      
      let styledEndFrameBase64 = null;
      if (endImageBase64) {
        if (onStatus) onStatus("Preparing transition...");
        styledEndFrameBase64 = await this.generateStyle(endImageBase64, userPrompt);
      }

      if (onStatus) onStatus(`Creating your video...`);
      
      const movementPrompt = `Animate realistically. keep the facial features exactly as given in the photos. ${userPrompt}. High resolution, smooth motion.`;

      const config: any = {
        numberOfVideos: 1,
        aspectRatio: '9:16'
      };

      const requestPayload: any = {
        model: modelName,
        prompt: movementPrompt,
        image: {
          imageBytes: cleanBase64(styledKeyframeBase64!),
          mimeType: 'image/png',
        },
        config
      };

      if (styledEndFrameBase64) {
        requestPayload.config.lastFrame = {
          imageBytes: cleanBase64(styledEndFrameBase64),
          mimeType: 'image/png',
        };
      }

      let operation = await ai.models.generateVideos(requestPayload);

      let steps = 0;
      while (!operation.done) {
        steps++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        const progress = Math.min(steps * (useFastModel ? 10 : 3), 99);
        if (onStatus) onStatus(`Processing: ${progress}%`);
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("The process took too long. Please try again.");

      const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
      if (!videoResponse.ok) throw new Error("Could not download video.");
      const blob = await videoResponse.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      logger.error('GeminiService', 'Video failed', error);
      throw new Error(error?.message || 'AI is currently busy. Please try in a minute.');
    }
  }
};

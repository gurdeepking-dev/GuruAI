
import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

export const geminiService = {
  /**
   * Stage 1: The Identity Anchor.
   * Generates a styled keyframe while strictly locking the facial geometry.
   */
  async generateStyle(baseImageBase64: string, prompt: string, refinement?: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    // VERBATIM instruction added as requested: "keep the man and women facial feature as given in the uploaded photos"
    const facialInstruction = `
      CRITICAL REQUIREMENT: keep the man and women facial feature as given in the uploaded photos.
      1. Analyze every human face in the image (Man and Woman).
      2. REPLICATE the EXACT eye shapes, nose bridges, lip curves, and bone structures for BOTH subjects.
      3. DO NOT change identity, age, or ethnicity.
      4. LOCK facial geometry. All human subjects must be 100% recognizable from the source.
      5. The output faces MUST be a pixel-perfect match to the input subjects.
    `.trim();

    const styleInstruction = `
      SECONDARY TASK: ARTISTIC STYLE
      - Environment/Style: ${prompt}.
      - Artistic Correction: ${refinement || 'None'}.
      - Lighting: High-contrast cinematic studio lighting, extreme detail on facial features.
      - Rendering: Professional 8k photography, sharp focus.
    `.trim();

    const finalPrompt = `${facialInstruction}\n\n${styleInstruction}\n\nApply the style only to the clothing and background. KEEP THE HUMAN FACES UNCHANGED AND IDENTICAL TO SOURCE.`;

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
      
      throw new Error("Facial synthesis was blocked or failed to return an image. Try a simpler style prompt.");
    } catch (error: any) {
      logger.error('GeminiService', 'Identity Anchor failed', error);
      throw error;
    }
  },

  /**
   * Stage 2: Motion Synthesis.
   * Uses the approved keyframe from Stage 1 as the anchor for video generation.
   */
  async generateVideo(
    startImageBase64: string, 
    userPrompt: string, 
    onStatus?: (status: string) => void,
    endImageBase64?: string,
    useFastModel: boolean = false,
    preStyledKeyframe?: string
  ): Promise<string> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please select a key via the dialog.");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    const modelName = useFastModel ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';
    const cleanBase64 = (str: string) => str.includes(',') ? str.split(',')[1] : str;

    try {
      let styledKeyframeBase64 = preStyledKeyframe;
      if (!styledKeyframeBase64) {
        if (onStatus) onStatus("Anchoring facial identity...");
        styledKeyframeBase64 = await this.generateStyle(startImageBase64, userPrompt);
      }
      
      let styledEndFrameBase64 = null;
      if (endImageBase64) {
        if (onStatus) onStatus("Aligning transition frame...");
        styledEndFrameBase64 = await this.generateStyle(endImageBase64, userPrompt);
      }

      if (onStatus) onStatus(`Synthesizing motion for ${modelName.includes('fast') ? 'Preview' : 'Cinema'}...`);
      
      // Included verbatim requirement here as well to ensure video generation respects the identity anchor
      const movementPrompt = `Animate the man and woman realistically. keep the man and women facial feature as given in the uploaded photos. ${userPrompt}. High resolution, smooth cinematic motion.`;

      // GUIDELINE: resolution parameter is NOT supported for video generation. Removed it.
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
        if (onStatus) onStatus(`Generating Cinematic Frames: ${progress}%`);
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Motion synthesis timed out.");

      const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
      if (!videoResponse.ok) throw new Error("Download server unavailable.");
      const blob = await videoResponse.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      const errorMessage = error?.message || 'Neural engine error';
      logger.error('GeminiService', 'Video generation failed', error);
      throw new Error(errorMessage);
    }
  }
};

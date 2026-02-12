import { storageService } from './storage';
import { logger } from './logger';

export interface KlingParams {
  prompt: string;
  negative_prompt?: string;
  duration: "5" | "10";
  aspect_ratio: "9:16" | "16:9" | "1:1";
  mode: "std" | "pro";
  camera_control?: {
    zoom?: number; 
    pan?: number; 
    tilt?: number; 
  };
}

export const klingService = {
  async generateVideo(startImage: string, endImage: string | null, params: KlingParams, onStatus?: (status: string) => void): Promise<string> {
    const settings = await storageService.getAdminSettings();
    const accessKey = settings.klingAccessKey;
    const secretKey = settings.klingSecretKey;

    if (!accessKey || !secretKey) {
      throw new Error("Kling API credentials are not configured. Go to Admin -> Payment/API to set them.");
    }

    const cleanBase64 = (str: string) => str.includes(',') ? str.split(',')[1] : str;

    const payload: any = {
      model: "kling-v1",
      image: cleanBase64(startImage),
      prompt: params.prompt || "cinematic masterpiece animation",
      negative_prompt: params.negative_prompt || "blurry, low quality, distorted",
      cfg_scale: params.mode === "pro" ? 0.7 : 0.5,
      duration: params.duration,
      aspect_ratio: params.aspect_ratio,
      mode: params.mode
    };

    if (endImage) payload.last_image = cleanBase64(endImage);

    if (onStatus) onStatus("Waking up AI Engine...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 min timeout for initial submission

    try {
      const submitResponse = await fetch("/api/kling-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ 
          action: 'submit', 
          payload, 
          accessKey, 
          secretKey 
        })
      });

      clearTimeout(timeoutId);

      if (!submitResponse.ok) {
        const errBody = await submitResponse.json().catch(() => ({ error: 'Proxy Connection Failed' }));
        throw new Error(errBody.error || `Server Error (${submitResponse.status})`);
      }

      const submitData = await submitResponse.json();
      if (submitData.code !== 0) {
        throw new Error(`Kling API Error (${submitData.code}): ${submitData.message || 'Unknown error'}`);
      }

      const taskId = submitData.data?.task_id;
      if (!taskId) throw new Error("No Task ID received. Please try again.");
      
      console.log(`[KlingService] Task created: ${taskId}`);

      let attempts = 0;
      const maxAttempts = 180; // 30 minutes total (10s * 180)
      let succeedWithoutUrlCount = 0;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // Progress stays at 99% if it takes too long
        const progress = Math.min(Math.floor((attempts / 150) * 100), 99);
        if (onStatus) onStatus(`Rendering: ${progress}%`);
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        try {
          const pollResponse = await fetch("/api/kling-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              action: 'poll', 
              taskId, 
              accessKey, 
              secretKey 
            })
          });
          
          if (!pollResponse.ok) continue;

          const pollData = await pollResponse.json();
          const status = pollData.data?.task_status;
          
          if (status === "succeed") {
            const videoUrl = 
              pollData.data?.video_resource?.url || 
              pollData.data?.task_result?.video_url ||
              (pollData.data?.task_result?.videos && pollData.data.task_result.videos[0]?.url);

            if (!videoUrl) {
              succeedWithoutUrlCount++;
              console.warn(`[KlingService] succeed but no URL. Count: ${succeedWithoutUrlCount}`);
              if (onStatus) onStatus("Finalizing files...");
              
              // Give it another 2 minutes if it's "succeed" but no URL
              if (succeedWithoutUrlCount > 12) {
                throw new Error("API reported success but failed to provide video link after 2 minutes.");
              }
              continue;
            }
            
            if (onStatus) onStatus("Success! Fetching...");
            const videoRes = await fetch(videoUrl);
            if (!videoRes.ok) throw new Error("Could not download generated video.");
            
            const blob = await videoRes.blob();
            return URL.createObjectURL(blob);
          } else if (status === "failed") {
            const errorMsg = pollData.data?.task_status_msg || "Rendering engine error.";
            throw new Error(`Kling Render Failed: ${errorMsg}`);
          }
        } catch (pollErr: any) {
          if (pollErr.message.includes("Kling Render Failed") || pollErr.message.includes("video link")) throw pollErr;
          console.warn("[KlingService] Network glitch during poll:", pollErr.message);
        }
      }
      throw new Error("Render process timed out after 30 minutes. Please check again in a few moments.");
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error("KlingService", "Fatal", err);
      throw err;
    }
  }
};

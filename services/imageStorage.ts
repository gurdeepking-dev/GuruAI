
import { supabase, isCloudEnabled } from './supabase';
import { logger } from './logger';

export const imageStorage = {
  /**
   * Uploads permanent assets (like Style Templates) to Cloud Storage.
   * User portraits and results should NEVER use this function.
   */
  uploadTemplateImage: async (base64: string, fileName: string): Promise<string> => {
    logger.info('Storage', `Attempting template upload: ${fileName}`);
    
    if (!isCloudEnabled || !supabase) {
      logger.warn('Storage', 'Cloud disabled, falling back to base64 for template');
      return base64;
    }

    try {
      const parts = base64.split(',');
      if (parts.length < 2) throw new Error("Invalid base64 format");
      
      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      const { data, error } = await supabase.storage
        .from('style_templates')
        .upload(`public/${fileName}`, blob, { upsert: true });

      if (error) {
        logger.error('Storage', 'Supabase upload error', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('style_templates')
        .getPublicUrl(data.path);

      logger.info('Storage', 'Template upload successful', { publicUrl });
      return publicUrl;
    } catch (err: any) {
      logger.error('Storage', 'Template upload failed', { error: err.message });
      return base64;
    }
  }
};

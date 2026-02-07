
import { supabase } from './supabase';
import { logger } from './logger';

export const imageStorage = {
  async uploadTemplateImage(base64: string): Promise<string> {
    try {
      if (!base64 || !base64.startsWith('data:')) {
        return base64;
      }

      const mimeMatch = base64.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      const fileExt = mimeType.split('/')[1] || 'png';
      
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `styles/${fileName}`;

      const response = await fetch(base64);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('templates')
        .upload(filePath, blob, {
          contentType: mimeType,
          cacheControl: '31536000',
          upsert: false
        });

      if (error) {
        logger.error('Storage', 'Supabase Upload Error', { error });
        throw error;
      }

      // Restored optimization: Returning a URL that requests a resized WebP version
      const { data: { publicUrl } } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath, {
          transform: {
            width: 500,
            quality: 80,
            format: 'webp'
          }
        });

      logger.info('Storage', 'File moved to cloud with on-the-fly optimization', { publicUrl });
      return publicUrl;
    } catch (err: any) {
      logger.error('Storage', 'Storage operation failed. Using local fallback.', err.message);
      return base64;
    }
  }
};

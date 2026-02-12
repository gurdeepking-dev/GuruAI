
import { supabase } from './supabase';
import { logger } from './logger';

export const imageStorage = {
  /**
   * Compresses an image using HTML5 Canvas
   */
  async compressImage(base64: string, maxWidth = 1080, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context failed"));
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
    });
  },

  async uploadMedia(file: File | string, bucket: string, pathPrefix: string): Promise<string> {
    try {
      let blob: Blob;
      let mimeType: string;
      let fileExt: string;

      if (typeof file === 'string') {
        if (!file.startsWith('data:')) return file;
        const mimeMatch = file.match(/^data:([^;]+);base64,/);
        mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        
        if (mimeType.startsWith('image/')) {
          blob = await this.compressImage(file);
          mimeType = 'image/jpeg';
          fileExt = 'jpg';
        } else {
          const response = await fetch(file);
          blob = await response.blob();
          fileExt = mimeType.split('/')[1] || 'bin';
        }
      } else {
        blob = file;
        mimeType = file.type;
        fileExt = file.name.split('.').pop() || 'bin';
        
        // Compress if it's an image file
        if (mimeType.startsWith('image/')) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          blob = await this.compressImage(base64);
          mimeType = 'image/jpeg';
          fileExt = 'jpg';
        }
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${pathPrefix}/${fileName}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      logger.error('Storage', 'Upload Error', err);
      return typeof file === 'string' ? file : '';
    }
  },

  async uploadTemplateImage(base64: string): Promise<string> {
    return this.uploadMedia(base64, 'templates', 'styles');
  }
};

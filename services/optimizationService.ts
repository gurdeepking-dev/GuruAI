
import { supabase } from './supabase';
import { storageService } from './storage';
import { logger } from './logger';

export interface OptimizationLog {
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
  timestamp: number;
}

export const optimizationService = {
  async processStyles(onProgress: (log: OptimizationLog) => void): Promise<{ saved: number, count: number }> {
    const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
      onProgress({ message, type, timestamp: Date.now() });
    };

    addLog('🚀 Starting storage optimization...', 'info');

    const { data: styles, error: dbError } = await supabase
      .from('styles')
      .select('*');

    if (dbError) {
      addLog(`❌ Failed to fetch styles: ${dbError.message}`, 'error');
      throw dbError;
    }

    addLog(`📂 Found ${styles.length} style records to inspect.`, 'info');

    let processedCount = 0;
    let totalSavedBytes = 0;

    for (const style of styles) {
      try {
        // Skip if not hosted on our Supabase
        const supabaseUrl = (supabase as any).supabaseUrl;
        if (!style.imageUrl.includes(supabaseUrl)) {
          addLog(`⏭️ Skipping ${style.name}: External image.`, 'info');
          continue;
        }

        // Skip if already optimized WebP
        if (style.imageUrl.toLowerCase().endsWith('.webp')) {
          addLog(`⏭️ Skipping ${style.name}: Already optimized.`, 'info');
          continue;
        }

        addLog(`📸 Processing ${style.name}...`, 'info');

        // 1. Download
        const response = await fetch(style.imageUrl);
        const originalBlob = await response.blob();
        const originalSize = originalBlob.size;

        // 2. Optimize in Browser
        const optimizedBlob = await this.optimizeImage(originalBlob);
        const savedSize = originalSize - optimizedBlob.size;
        totalSavedBytes += Math.max(0, savedSize);

        // 3. Upload back to Supabase
        const bucketName = 'templates';
        const urlParts = style.imageUrl.split(`${bucketName}/`);
        if (urlParts.length < 2) throw new Error('Invalid storage path');
        
        const originalPath = urlParts[1].split('?')[0]; // Strip transform params
        const newPath = originalPath.replace(/\.[^.]+$/, '.webp');

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(newPath, optimizedBlob, {
            contentType: 'image/webp',
            upsert: true,
            cacheControl: '31536000'
          });

        if (uploadError) throw uploadError;

        // 4. Update Database
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(newPath);

        const { error: updateError } = await supabase
          .from('styles')
          .update({ imageUrl: publicUrl })
          .eq('id', style.id);

        if (updateError) throw updateError;

        processedCount++;
        addLog(`✅ ${style.name} optimized! Saved ${(savedSize / 1024).toFixed(2)} KB.`, 'success');

      } catch (err: any) {
        addLog(`❌ Error optimizing ${style.name}: ${err.message}`, 'error');
        logger.error('Optimizer', `Failed to process ${style.name}`, err);
      }
    }

    addLog(`✨ Optimization complete. Processed ${processedCount} images. Total saved: ${(totalSavedBytes / 1024).toFixed(2)} KB.`, 'success');
    return { saved: totalSavedBytes, count: processedCount };
  },

  // Fix: Removed 'private' modifier from object literal method. 
  // Object literal properties cannot have access modifiers like 'private' in TypeScript.
  async optimizeImage(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if too large (mimic Sharp resize)
        const MAX_WIDTH = 1200;
        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH / width) * height;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to WebP with 80% quality (mimic Sharp webp quality)
        canvas.toBlob(
          (resultBlob) => {
            if (resultBlob) resolve(resultBlob);
            else reject(new Error('Canvas toBlob failed'));
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for processing'));
      img.src = URL.createObjectURL(blob);
    });
  }
};

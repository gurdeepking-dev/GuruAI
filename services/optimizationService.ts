
import { supabase, supabaseUrl } from './supabase';
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
        // Only process images hosted on our Supabase bucket
        if (!style.imageUrl.includes(supabaseUrl)) {
          addLog(`⏭️ Skipping ${style.name}: External image (likely Unsplash).`, 'info');
          continue;
        }

        // Skip if already optimized WebP
        if (style.imageUrl.toLowerCase().includes('.webp') && !style.imageUrl.includes('transform')) {
          addLog(`⏭️ Skipping ${style.name}: Already a native optimized WebP.`, 'info');
          continue;
        }

        addLog(`📸 Optimizing ${style.name}...`, 'info');

        // 1. Download original
        const cleanUrl = style.imageUrl.split('?')[0]; // Remove any existing transform params
        const response = await fetch(cleanUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        
        const originalBlob = await response.blob();
        const originalSize = originalBlob.size;

        // 2. Optimize in Browser (Resize to 1000px max, 80% WebP)
        const optimizedBlob = await this.optimizeImage(originalBlob);
        const savedSize = originalSize - optimizedBlob.size;
        
        // 3. Upload back to Supabase
        const bucketName = 'templates';
        const urlParts = cleanUrl.split(`${bucketName}/`);
        if (urlParts.length < 2) throw new Error('Invalid storage path structure');
        
        const originalPath = urlParts[1];
        // Ensure path ends in .webp
        const newPath = originalPath.replace(/\.[^.]+$/, '.webp');

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(newPath, optimizedBlob, {
            contentType: 'image/webp',
            upsert: true,
            cacheControl: '31536000'
          });

        if (uploadError) throw uploadError;

        // 4. Update Database with the clean permanent WebP URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(newPath);

        const { error: updateError } = await supabase
          .from('styles')
          .update({ imageUrl: publicUrl })
          .eq('id', style.id);

        if (updateError) throw updateError;

        totalSavedBytes += Math.max(0, savedSize);
        processedCount++;
        addLog(`✅ ${style.name} finished. Saved ${(savedSize / 1024).toFixed(1)} KB.`, 'success');

      } catch (err: any) {
        addLog(`❌ Error optimizing ${style.name}: ${err.message}`, 'error');
        logger.error('Optimizer', `Failed to process ${style.name}`, err);
      }
    }

    addLog(`✨ All done! Processed ${processedCount} images. Total saved: ${(totalSavedBytes / 1024).toFixed(1)} KB.`, 'success');
    return { saved: totalSavedBytes, count: processedCount };
  },

  async optimizeImage(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Standard high-res target (1000px is sweet spot for web templates)
        const TARGET_SIZE = 1000;
        if (width > height && width > TARGET_SIZE) {
          height = (TARGET_SIZE / width) * height;
          width = TARGET_SIZE;
        } else if (height > TARGET_SIZE) {
          width = (TARGET_SIZE / height) * width;
          height = TARGET_SIZE;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use high-quality drawing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to WebP 80% quality (best balance for AI art templates)
        canvas.toBlob(
          (resultBlob) => {
            if (resultBlob) resolve(resultBlob);
            else reject(new Error('Canvas conversion to blob failed'));
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Image load failed during optimization'));
      img.src = URL.createObjectURL(blob);
    });
  }
};

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import path from 'path';
// Fix: Import process from node:process to resolve "Property 'exit' does not exist on type 'Process'"
import process from 'node:process';
// Fix: Import Buffer from node:buffer to resolve "Cannot find name 'Buffer'"
import { Buffer } from 'node:buffer';

/**
 * CONFIGURATION
 * Ensure these variables are in your .env file
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  console.log('Get your Service Role Key from: Supabase Dashboard > Settings > API');
  // Fix: process is now correctly imported
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET_NAME = 'templates';

async function runOptimization() {
  console.log('🚀 Starting Bulk Optimization Pipeline...');

  // 1. Get all styles from the database
  const { data: styles, error: dbError } = await supabase
    .from('styles')
    .select('*');

  if (dbError) {
    console.error('❌ Failed to fetch styles from DB:', dbError.message);
    return;
  }

  console.log(`📂 Found ${styles.length} styles to process.`);

  for (const style of styles) {
    try {
      // Skip if already a WebP (likely already optimized)
      if (style.imageUrl.endsWith('.webp')) {
        console.log(`- Skipping ${style.name}: Already optimized.`);
        continue;
      }

      // We only optimize images hosted on our Supabase bucket
      if (!style.imageUrl.includes(supabaseUrl)) {
        console.log(`- Skipping ${style.name}: External image (Unsplash).`);
        continue;
      }

      console.log(`📸 Processing ${style.name}...`);

      // 2. Extract relative path from URL
      // URL format: .../storage/v1/object/public/templates/styles/filename.png
      const pathParts = style.imageUrl.split(`${BUCKET_NAME}/`);
      if (pathParts.length < 2) continue;
      const relativePath = pathParts[1];

      // 3. Download the original file
      const { data: blob, error: dlError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(relativePath);

      if (dlError) throw dlError;

      // 4. Optimize with Sharp
      // Fix: Buffer is now correctly imported for usage in ESM
      const buffer = Buffer.from(await blob.arrayBuffer());
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true }) // Normalize for high-res but save space
        .webp({ quality: 80, effort: 6 }) // Convert to WebP with high compression effort
        .toBuffer();

      // 5. Upload the new WebP version
      const newFileName = relativePath.replace(/\.[^.]+$/, '.webp');
      const { error: upError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(newFileName, optimizedBuffer, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '31536000'
        });

      if (upError) throw upError;

      // 6. Get the new Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(newFileName);

      // 7. Update the Database record
      const { error: updateError } = await supabase
        .from('styles')
        .update({ imageUrl: publicUrl })
        .eq('id', style.id);

      if (updateError) throw updateError;

      const savings = ((buffer.length - optimizedBuffer.length) / 1024).toFixed(2);
      console.log(`✅ Success: ${style.name} optimized. Saved ${savings} KB.`);

    } catch (err) {
      console.error(`❌ Error processing ${style.name}:`, err.message);
    }
  }

  console.log('\n✨ All tasks finished!');
}

runOptimization();

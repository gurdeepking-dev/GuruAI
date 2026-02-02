
import { StyleTemplate, AdminSettings, TransactionRecord } from '../types';
import { logger } from './logger';
import { supabase } from './supabase';
import { imageStorage } from './imageStorage';

const SESSION_KEY = 'styleswap_admin_session';
const INITIALIZED_KEY = 'styleswap_db_initialized';
const STYLES_CACHE_KEY = 'styleswap_styles_cache_v1';

export const DEFAULT_STYLES: StyleTemplate[] = [
  { id: '1', name: 'Royal Indian Wedding', imageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500&q=75', prompt: 'A magnificent Indian wedding portrait. Traditional royal attire with intricate gold embroidery, heavy jewelry, and a palace background. Warm cinematic lighting.', description: 'Traditional elegance.' },
  { id: '2', name: 'Cyberpunk Neon', imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&q=75', prompt: 'Cyberpunk 2077 style. Neon glowing accents, futuristic techwear, rainy night city background with teal and pink lighting. High-tech aesthetic.', description: 'Futuristic sci-fi.' },
  { id: '3', name: 'Pixar Animation', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=75', prompt: '3D Disney Pixar animation style. Big expressive eyes, smooth skin textures, stylized features, vibrant and soft cinematic lighting.', description: '3D Animated character.' },
  { id: '4', name: 'Greek Marble Statue', imageUrl: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=500&q=75', prompt: 'Classic white marble Greek sculpture. Intricate carved details, smooth stone texture, museum gallery lighting, timeless museum aesthetic.', description: 'Ancient masterpiece.' },
  { id: '5', name: 'Detailed Pencil Sketch', imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&q=75', prompt: 'Hyper-realistic pencil charcoal sketch on textured paper. Fine lines, artistic shading, graphite smudges, hand-drawn look.', description: 'Artistic hand-drawing.' },
  { id: '6', name: 'Van Gogh Oil Painting', imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&q=75', prompt: 'Impressionist oil painting in the style of Vincent van Gogh. Thick visible brushstrokes, swirling colors, Starry Night color palette.', description: 'Classic impressionism.' },
  { id: '7', name: '1950s Hollywood Noir', imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=75', prompt: '1950s Black and white film noir cinematography. High contrast, dramatic shadows, moody atmosphere, sharp focus, vintage cinematic look.', description: 'Vintage movie star.' },
  { id: '8', name: 'GTA Loading Screen', imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=75', prompt: 'Stylized vector art loading screen style. Thick black outlines, high contrast saturated colors, digital illustration aesthetic.', description: 'Comic-book stylized.' },
  { id: '9', name: 'Viking Chieftain', imageUrl: 'https://images.unsplash.com/photo-1519074063912-ad2dbf50b16d?w=500&q=75', prompt: 'Rough Viking era warrior. Fur clothing, tribal face paint, snowy dark forest background, cinematic cold lighting, epic historical look.', description: 'Norse warrior.' },
  { id: '10', name: 'Studio Ghibli Anime', imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=500&q=75', prompt: 'Hand-painted Studio Ghibli anime style. Soft watercolor textures, whimsical atmosphere, lush green background, gentle lighting.', description: 'Japanese animation.' }
];

export const DEFAULT_ADMIN: AdminSettings = {
  username: 'admin',
  passwordHash: 'admin123',
  payment: {
    gateway: 'Razorpay',
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    currency: process.env.DEFAULT_CURRENCY || 'INR',
    enabled: true,
    photoPrice: parseFloat(process.env.PHOTO_PRICE || '8')
  }
};

export const storageService = {
  async getStyles(forceRefresh = false): Promise<StyleTemplate[]> {
    // Cache-First strategy: Return cached data immediately if available
    const cached = localStorage.getItem(STYLES_CACHE_KEY);
    if (cached && !forceRefresh) {
      logger.debug('Storage', 'Returning styles from cache');
      // Still fetch in background to update cache
      this.fetchStylesFromDB().then(freshData => {
        if (freshData.length > 0) {
          localStorage.setItem(STYLES_CACHE_KEY, JSON.stringify(freshData));
        }
      });
      return JSON.parse(cached);
    }

    return this.fetchStylesFromDB();
  },

  async fetchStylesFromDB(): Promise<StyleTemplate[]> {
    try {
      const { data, error } = await supabase.from('styles').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      
      // Initial Sync check
      if ((!data || data.length === 0) && !localStorage.getItem(INITIALIZED_KEY)) {
        logger.info('Storage', 'Initial sync triggered: Parallel uploading defaults...');
        // Set key immediately to prevent race conditions
        localStorage.setItem(INITIALIZED_KEY, 'true');
        
        // Use Promise.all for parallel uploads (Much faster than sequential loop)
        Promise.all(DEFAULT_STYLES.map(s => this.saveStyle(s)))
          .then(() => logger.info('Storage', 'Background parallel sync completed'))
          .catch(e => logger.error('Storage', 'Background sync failed', e));

        return DEFAULT_STYLES;
      }

      const styles = data || [];
      if (styles.length > 0) {
        localStorage.setItem(STYLES_CACHE_KEY, JSON.stringify(styles));
      }
      return styles;
    } catch (err) {
      logger.error('Storage', 'Supabase Styles Fetch Failed', err);
      return DEFAULT_STYLES;
    }
  },

  async saveStyle(style: StyleTemplate): Promise<void> {
    const finalImageUrl = await imageStorage.uploadTemplateImage(style.imageUrl);
    const { error } = await supabase.from('styles').upsert({
      ...style,
      imageUrl: finalImageUrl,
      created_at: style.created_at || new Date().toISOString()
    });
    if (error) throw error;
    // Clear cache to force refresh on next load
    localStorage.removeItem(STYLES_CACHE_KEY);
  },

  async deleteStyle(id: string): Promise<void> {
    logger.debug('Storage', 'Attempting to delete style row', { id });
    
    try {
      const response = await supabase
        .from('styles')
        .delete()
        .eq('id', id);

      if (response.error) {
        throw response.error;
      }
      
      localStorage.removeItem(STYLES_CACHE_KEY);
      logger.info('Storage', 'Style deleted and cache invalidated', { id });

    } catch (err: any) {
      logger.error('Storage', 'Critical failure during deleteStyle service call', err);
      throw err;
    }
  },

  async importStyles(stylesJson: string): Promise<void> {
    const parsed = JSON.parse(stylesJson);
    if (Array.isArray(parsed)) {
      await Promise.all(parsed.map(s => this.saveStyle(s)));
      localStorage.removeItem(STYLES_CACHE_KEY);
    }
  },

  async exportStyles(): Promise<string> {
    const styles = await this.getStyles(true);
    return JSON.stringify(styles, null, 2);
  },

  async getAdminSettings(): Promise<AdminSettings> {
    try {
      const { data, error } = await supabase.from('settings').select('config').eq('id', 'global').single();
      
      if (error || !data) {
        await this.saveAdminSettings(DEFAULT_ADMIN);
        return DEFAULT_ADMIN;
      }
      
      return data.config as AdminSettings;
    } catch (err) {
      return DEFAULT_ADMIN;
    }
  },

  async saveAdminSettings(settings: AdminSettings): Promise<void> {
    const { error } = await supabase.from('settings').upsert({
      id: 'global',
      config: settings
    });
    if (error) {
      logger.error('Storage', 'Failed to save settings to Supabase', error);
      throw error;
    }
    logger.info('Storage', 'Settings saved to Supabase successfully');
  },

  isAdminLoggedIn(): boolean {
    return localStorage.getItem(SESSION_KEY) === 'true';
  },

  setAdminLoggedIn(val: boolean): void {
    if (val) localStorage.setItem(SESSION_KEY, 'true');
    else localStorage.removeItem(SESSION_KEY);
  },

  async saveTransaction(tx: TransactionRecord): Promise<void> {
    const { error } = await supabase.from('transactions').insert({
      razorpay_payment_id: tx.razorpay_payment_id,
      user_email: tx.user_email,
      amount: tx.amount,
      items: tx.items,
      status: tx.status,
      created_at: new Date().toISOString()
    });
    if (error) throw error;
  },

  getCurrencySymbol(currency: string = 'INR'): string {
    const symbols: Record<string, string> = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹' };
    return symbols[currency] || '₹';
  }
};

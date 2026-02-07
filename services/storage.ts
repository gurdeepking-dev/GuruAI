
import { StyleTemplate, AdminSettings, TransactionRecord, ApiKeyRecord, Coupon } from '../types';
import { logger } from './logger';
import { supabase } from './supabase';
import { imageStorage } from './imageStorage';

const SESSION_KEY = 'styleswap_admin_session';
const INITIALIZED_KEY = 'styleswap_db_initialized';
const STYLES_CACHE_KEY = 'styleswap_styles_cache_v1';

export const DEFAULT_STYLES: StyleTemplate[] = [
  { 
    id: 'valentine-love', 
    name: 'Eternal Romance', 
    imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&q=75&auto=format', 
    prompt: 'A romantic fine art photo with a soft dreamy glow, surrounded by floating red and pink rose petals, elegant lighting, warm color palette, professional photography, ethereal atmosphere. Preserve facial identity perfectly.', 
    description: 'Perfect for Valentine gifts.',
    displayOrder: 0,
    autoGenerate: true
  }
];

export const DEFAULT_ADMIN: AdminSettings = {
  username: 'admin',
  passwordHash: 'admin123',
  geminiApiKeys: [],
  coupons: [],
  payment: {
    gateway: 'Razorpay',
    keyId: '',
    keySecret: '',
    currency: 'INR',
    enabled: true,
    photoPrice: 8
  },
  tracking: {
    metaPixelId: ''
  }
};

export const storageService = {
  async getStyles(forceRefresh = false): Promise<StyleTemplate[]> {
    const cached = localStorage.getItem(STYLES_CACHE_KEY);
    if (cached && !forceRefresh) {
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
      // Attempt to fetch with the new displayOrder column
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .order('displayOrder', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
        
      if (error) {
        // If column missing (Error 42703), fallback to standard ordering
        if (error.code === '42703') {
          logger.warn('Storage', 'displayOrder column missing, falling back to basic sort');
          const fallback = await supabase.from('styles').select('*').order('created_at', { ascending: true });
          if (fallback.error) throw fallback.error;
          return fallback.data || [];
        }
        throw error;
      }
      
      if ((!data || data.length === 0) && !localStorage.getItem(INITIALIZED_KEY)) {
        localStorage.setItem(INITIALIZED_KEY, 'true');
        await Promise.all(DEFAULT_STYLES.map((s, idx) => this.saveStyle({...s, displayOrder: idx})));
        return DEFAULT_STYLES;
      }

      const styles = data || [];
      localStorage.setItem(STYLES_CACHE_KEY, JSON.stringify(styles));
      return styles;
    } catch (err) {
      logger.error('Storage', 'Failed to fetch styles from DB', err);
      return DEFAULT_STYLES;
    }
  },

  async saveStyle(style: StyleTemplate): Promise<void> {
    const finalImageUrl = await imageStorage.uploadTemplateImage(style.imageUrl);
    const { error } = await supabase.from('styles').upsert({
      ...style,
      imageUrl: finalImageUrl,
      created_at: style.created_at || new Date().toISOString(),
      displayOrder: style.displayOrder ?? 999,
      autoGenerate: style.autoGenerate ?? false
    });
    if (error) throw error;
    localStorage.removeItem(STYLES_CACHE_KEY);
  },

  async deleteStyle(id: string): Promise<void> {
    const { error } = await supabase.from('styles').delete().eq('id', id);
    if (error) throw error;
    localStorage.removeItem(STYLES_CACHE_KEY);
  },

  async exportStyles(): Promise<string> {
    const styles = await this.getStyles(true);
    return JSON.stringify(styles, null, 2);
  },

  async importStyles(json: string): Promise<void> {
    try {
      const styles = JSON.parse(json) as StyleTemplate[];
      if (!Array.isArray(styles)) throw new Error('Invalid backup format');
      for (const style of styles) {
        await this.saveStyle(style);
      }
      localStorage.removeItem(STYLES_CACHE_KEY);
    } catch (err) {
      logger.error('Storage', 'Failed to import styles', err);
      throw err;
    }
  },

  async getAdminSettings(): Promise<AdminSettings> {
    try {
      const { data, error } = await supabase.from('settings').select('config').eq('id', 'global').maybeSingle();
      
      if (error) {
        logger.error('Storage', 'Error fetching settings from Supabase', error);
        return DEFAULT_ADMIN;
      }
      
      if (!data) {
        logger.info('Storage', 'No settings found in Supabase, creating initial default');
        await this.saveAdminSettings(DEFAULT_ADMIN);
        return DEFAULT_ADMIN;
      }
      
      const settingsFromDb = data.config as AdminSettings;
      
      // CRITICAL: Deep merge to prevent overwriting keys with defaults if they are missing from the DB object
      const merged: AdminSettings = {
        ...DEFAULT_ADMIN,
        ...settingsFromDb,
        payment: { 
          ...DEFAULT_ADMIN.payment, 
          ...(settingsFromDb.payment || {}) 
        },
        tracking: { 
          ...DEFAULT_ADMIN.tracking, 
          ...(settingsFromDb.tracking || {}) 
        },
        geminiApiKeys: settingsFromDb.geminiApiKeys || [],
        coupons: settingsFromDb.coupons || []
      };
      
      return merged;
    } catch (err) {
      logger.error('Storage', 'Unexpected error in getAdminSettings', err);
      return DEFAULT_ADMIN;
    }
  },

  async saveAdminSettings(settings: AdminSettings): Promise<void> {
    // Safety check: Don't save if settings look like an accidental reset (e.g. empty key when we shouldn't have one)
    const { error } = await supabase.from('settings').upsert({
      id: 'global',
      config: settings
    });
    
    if (error) {
      logger.error('Storage', 'Failed to save settings to Supabase', error);
      throw error;
    }
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

  async logActivity(eventName: string, eventData: any = {}): Promise<void> {
    const sessionId = localStorage.getItem('styleswap_session_id') || Math.random().toString(36).substring(7);
    localStorage.setItem('styleswap_session_id', sessionId);
    try {
      await supabase.from('user_activities').insert({
        event_name: eventName,
        event_data: eventData,
        session_id: sessionId,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      // Fail silently for background logging
    }
  },

  getCurrencySymbol(currency: string = 'INR'): string {
    const symbols: Record<string, string> = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹' };
    return symbols[currency] || '₹';
  }
};

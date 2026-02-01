
import { StyleTemplate, ApiKeyRecord, AdminSettings, TransactionRecord } from '../types';
import { supabase, isCloudEnabled } from './supabase';
import { logger } from './logger';

const ADMIN_KEY = 'styleswap_admin_settings';
const SESSION_KEY = 'styleswap_admin_session';

const DEFAULT_STYLES: StyleTemplate[] = [
  {
    id: '1',
    name: 'Royal Indian Wedding',
    imageUrl: 'https://images.unsplash.com/photo-1610034603010-0a3733e07d9b?w=800&q=80',
    prompt: 'Transform this person into a magnificent Indian bride/groom wearing traditional royal wedding attire. Use intricate jewelry, rich silk embroidery, and a grand palace background with warm golden lighting.',
    description: 'Majestic traditional elegance with rich cultural details.'
  }
];

const DEFAULT_ADMIN: AdminSettings = {
  username: 'admin',
  passwordHash: 'admin123',
  payment: {
    gateway: 'Razorpay',
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    currency: 'INR',
    enabled: true,
    photoPrice: 5.00
  }
};

export const storageService = {
  getStyles: async (): Promise<StyleTemplate[]> => {
    logger.debug('Data', 'Fetching style templates');
    if (isCloudEnabled && supabase) {
      const { data, error } = await supabase.from('style_templates').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        logger.info('Data', `Loaded ${data.length} styles from Cloud`);
        return data;
      }
      logger.error('Data', 'Cloud styles fetch failed', error);
    }
    const localData = localStorage.getItem('styleswap_templates');
    logger.info('Data', 'Loaded styles from LocalStorage fallback');
    return localData ? JSON.parse(localData) : DEFAULT_STYLES;
  },

  saveStyle: async (style: StyleTemplate) => {
    logger.info('Data', `Saving style: ${style.name}`);
    if (isCloudEnabled && supabase) {
      const { error } = await supabase.from('style_templates').upsert(style);
      if (!error) {
        logger.info('Data', 'Style synced to Cloud');
        return;
      }
      logger.error('Data', 'Cloud style save failed', error);
    }
    const styles = await storageService.getStyles();
    const updated = styles.some(s => s.id === style.id) 
      ? styles.map(s => s.id === style.id ? style : s)
      : [...styles, style];
    localStorage.setItem('styleswap_templates', JSON.stringify(updated));
  },

  deleteStyle: async (id: string) => {
    logger.info('Data', `Deleting style: ${id}`);
    if (isCloudEnabled && supabase) {
      const { error } = await supabase.from('style_templates').delete().eq('id', id);
      if (error) logger.error('Data', 'Cloud style delete failed', error);
    }
    const styles = await storageService.getStyles();
    localStorage.setItem('styleswap_templates', JSON.stringify(styles.filter(s => s.id !== id)));
  },

  getApiKeys: async (): Promise<ApiKeyRecord[]> => {
    if (isCloudEnabled && supabase) {
      const { data, error } = await supabase.from('api_key_pool').select('*');
      if (!error && data) return data;
    }
    const data = localStorage.getItem('styleswap_api_keys');
    return data ? JSON.parse(data) : [];
  },

  saveApiKey: async (key: ApiKeyRecord) => {
    logger.info('Data', 'Adding new API key to pool');
    if (isCloudEnabled && supabase) {
      await supabase.from('api_key_pool').upsert(key);
    }
    const keys = await storageService.getApiKeys();
    localStorage.setItem('styleswap_api_keys', JSON.stringify([...keys, key]));
  },

  deleteApiKey: async (id: string) => {
    if (isCloudEnabled && supabase) {
      await supabase.from('api_key_pool').delete().eq('id', id);
    }
    const keys = await storageService.getApiKeys();
    localStorage.setItem('styleswap_api_keys', JSON.stringify(keys.filter(k => k.id !== id)));
  },

  getAdminSettings: async (): Promise<AdminSettings> => {
    if (isCloudEnabled && supabase) {
      const { data, error } = await supabase.from('admin_settings').select('settings').single();
      if (!error && data) return data.settings;
    }
    const data = localStorage.getItem(ADMIN_KEY);
    return data ? JSON.parse(data) : DEFAULT_ADMIN;
  },

  saveAdminSettings: async (settings: AdminSettings) => {
    logger.info('Data', 'Updating global admin settings');
    if (isCloudEnabled && supabase) {
      await supabase.from('admin_settings').upsert({ id: 'current', settings });
    }
    localStorage.setItem(ADMIN_KEY, JSON.stringify(settings));
  },

  saveTransaction: async (tx: TransactionRecord) => {
    logger.info('Payment', 'Logging transaction', { id: tx.razorpay_payment_id });
    if (isCloudEnabled && supabase) {
      const { error } = await supabase.from('transactions').insert(tx);
      if (error) logger.error('Payment', 'Cloud transaction log failed', error);
      else logger.info('Payment', 'Transaction synced to Cloud');
    }
  },

  isAdminLoggedIn: (): boolean => {
    return localStorage.getItem(SESSION_KEY) === 'true';
  },

  setAdminLoggedIn: (status: boolean) => {
    if (status) localStorage.setItem(SESSION_KEY, 'true');
    else localStorage.removeItem(SESSION_KEY);
  },

  getCurrencySymbol: (currency: string = 'INR'): string => {
    switch (currency) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '₹';
    }
  }
};

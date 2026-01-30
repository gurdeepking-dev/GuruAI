
import { StyleTemplate, ApiKeyRecord, AdminSettings } from '../types';

const STYLES_KEY = 'styleswap_templates';
const KEYS_KEY = 'styleswap_api_keys';
const ADMIN_KEY = 'styleswap_admin_settings';

const DEFAULT_STYLES: StyleTemplate[] = [
  {
    id: '1',
    name: 'Cyberpunk Neon',
    imageUrl: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=500&fit=crop',
    prompt: 'Transform this person into a high-tech cyberpunk character with neon highlights, futuristic visor, and a bustling night city background in a sci-fi digital art style.',
    description: 'Electric neon and futuristic vibes.'
  },
  {
    id: '2',
    name: 'Classic Oil Painting',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=500&fit=crop',
    prompt: 'Reimagine this person as a subject in an 18th-century classical oil painting. Use heavy brushstrokes, rich textures, warm lighting, and a Renaissance aesthetic.',
    description: 'Timeless masterpiece look.'
  },
  {
    id: '3',
    name: 'Studio Ghibli Anime',
    imageUrl: 'https://images.unsplash.com/photo-1578632738981-4320f661fb3c?w=400&h=500&fit=crop',
    prompt: 'Convert this photo into a beautiful Studio Ghibli style anime illustration. Soft hand-drawn lines, watercolor-esque backgrounds, and whimsical atmosphere.',
    description: 'Soft, whimsical hand-drawn anime.'
  }
];

const DEFAULT_ADMIN: AdminSettings = {
  username: 'admin',
  passwordHash: 'admin123', // In a real app, use actual hashing
  payment: {
    gateway: 'Stripe',
    merchantId: 'm_test_123',
    currency: 'USD',
    enabled: true
  }
};

export const storageService = {
  getStyles: (): StyleTemplate[] => {
    const data = localStorage.getItem(STYLES_KEY);
    return data ? JSON.parse(data) : DEFAULT_STYLES;
  },
  saveStyles: (styles: StyleTemplate[]) => {
    localStorage.setItem(STYLES_KEY, JSON.stringify(styles));
  },
  updateStyle: (updated: StyleTemplate) => {
    const styles = storageService.getStyles();
    storageService.saveStyles(styles.map(s => s.id === updated.id ? updated : s));
  },
  addStyle: (style: StyleTemplate) => {
    const styles = storageService.getStyles();
    storageService.saveStyles([...styles, style]);
  },
  deleteStyle: (id: string) => {
    const styles = storageService.getStyles();
    storageService.saveStyles(styles.filter(s => s.id !== id));
  },
  getApiKeys: (): ApiKeyRecord[] => {
    const data = localStorage.getItem(KEYS_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveApiKeys: (keys: ApiKeyRecord[]) => {
    localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
  },
  getAdminSettings: (): AdminSettings => {
    const data = localStorage.getItem(ADMIN_KEY);
    return data ? JSON.parse(data) : DEFAULT_ADMIN;
  },
  saveAdminSettings: (settings: AdminSettings) => {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(settings));
  }
};


import { StyleTemplate, ApiKeyRecord, AdminSettings } from '../types';

const STYLES_KEY = 'styleswap_templates';
const KEYS_KEY = 'styleswap_api_keys';
const ADMIN_KEY = 'styleswap_admin_settings';
const SESSION_KEY = 'styleswap_admin_session';

const DEFAULT_STYLES: StyleTemplate[] = [
  {
    id: '1',
    name: 'Royal Indian Wedding',
    imageUrl: 'https://images.unsplash.com/photo-1610034603010-0a3733e07d9b?w=800&q=80',
    prompt: 'Transform this person into a magnificent Indian bride/groom wearing traditional royal wedding attire. Use intricate jewelry, rich silk embroidery, and a grand palace background with warm golden lighting.',
    description: 'Majestic traditional elegance with rich cultural details.'
  },
  {
    id: '2',
    name: 'Ghibli Style Wedding',
    imageUrl: 'https://images.unsplash.com/photo-1634926878768-2a5b3c42f139?w=800&q=80',
    prompt: 'Reimagine this wedding portrait in the beautiful, hand-drawn anime style of Studio Ghibli. Soft watercolor textures, whimsical lighting, and a romantic meadow background with floating petals.',
    description: 'Whimsical watercolor romance in a magical anime world.'
  },
  {
    id: '3',
    name: 'Cyberpunk Union',
    imageUrl: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800&q=80',
    prompt: 'A high-tech cyberpunk wedding portrait. The person wears tech-integrated formal wear with glowing neon circuitry, cybernetic enhancements, and a rainy Neo-Tokyo neon cityscape background.',
    description: 'Neon-infused futuristic love set in a rainy cityscape.'
  },
  {
    id: '4',
    name: 'Classic Ethereal Wedding',
    imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    prompt: 'Convert this photo into a timeless western wedding portrait. Elegant white gown or sharp tuxedo, soft ethereal lighting, bokeh background of a sunlit garden, and a dreamlike atmosphere.',
    description: 'Timeless and ethereal beauty with a soft, dreamlike glow.'
  },
  {
    id: '5',
    name: '3D Pixar Romance',
    imageUrl: 'https://images.unsplash.com/photo-1620336655055-088d06e36bf0?w=800&q=80',
    prompt: 'Transform this person into a high-fidelity 3D animated character from a modern Pixar movie. Expressive large eyes, stylized facial features, vibrant colors, and cinematic soft-focus lighting.',
    description: 'Charming 3D animation style with expressive features.'
  },
  {
    id: '6',
    name: 'Artistic Charcoal Sketch',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
    prompt: 'Transform this photo into a detailed hand-drawn charcoal and pencil sketch on textured paper. Masterful shading, delicate lines, and an artistic fine-art aesthetic.',
    description: 'Elegant hand-drawn fine art with realistic charcoal textures.'
  }
];

const DEFAULT_ADMIN: AdminSettings = {
  username: 'admin',
  passwordHash: 'admin123',
  payment: {
    gateway: 'Razorpay',
    keyId: '',
    keySecret: '',
    currency: 'INR',
    enabled: true,
    photoPrice: 5.00
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
  },
  isAdminLoggedIn: (): boolean => {
    return localStorage.getItem(SESSION_KEY) === 'true';
  },
  setAdminLoggedIn: (status: boolean) => {
    if (status) localStorage.setItem(SESSION_KEY, 'true');
    else localStorage.removeItem(SESSION_KEY);
  },
  getCurrencySymbol: (): string => {
    const settings = storageService.getAdminSettings();
    switch (settings.payment.currency) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '₹';
    }
  }
};

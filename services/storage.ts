
import { StyleTemplate, ApiKeyRecord, AdminSettings } from '../types';

const STYLES_KEY = 'styleswap_templates';
const KEYS_KEY = 'styleswap_api_keys';
const ADMIN_KEY = 'styleswap_admin_settings';
const SESSION_KEY = 'styleswap_admin_session';

const DEFAULT_STYLES: StyleTemplate[] = [
  {
    id: '1',
    name: 'Cyberpunk 2077',
    imageUrl: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=500&fit=crop',
    prompt: 'Transform this person into a high-tech cyberpunk character with neon highlights, futuristic visor, and a bustling night city background in a sci-fi digital art style.',
    description: 'Neon-drenched futuristic aesthetics.'
  },
  {
    id: '2',
    name: 'Renaissance Masterpiece',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=500&fit=crop',
    prompt: 'Reimagine this person as a subject in an 18th-century classical oil painting. Use heavy brushstrokes, rich textures, warm lighting, and a Renaissance aesthetic.',
    description: 'Timeless oil painting look.'
  },
  {
    id: '3',
    name: 'Ghibli Magic',
    imageUrl: 'https://images.unsplash.com/photo-1578632738981-4320f661fb3c?w=400&h=500&fit=crop',
    prompt: 'Convert this photo into a beautiful Studio Ghibli style anime illustration. Soft hand-drawn lines, watercolor-esque backgrounds, and whimsical atmosphere.',
    description: 'Whimsical hand-drawn anime.'
  },
  {
    id: '4',
    name: 'Greek Marble Statue',
    imageUrl: 'https://images.unsplash.com/photo-1554188248-986adbb73be4?w=400&h=500&fit=crop',
    prompt: 'Sculpt this person as a pristine white marble Greek statue. Intricate details, smooth stone texture, and dramatic museum lighting.',
    description: 'Eternalized in white marble.'
  },
  {
    id: '5',
    name: 'Viking Warrior',
    imageUrl: 'https://images.unsplash.com/photo-1599421141474-0f2c41870197?w=400&h=500&fit=crop',
    prompt: 'Depict this person as a fierce Viking warrior with war paint, fur clothing, and a snowy Nordic background. Hyper-realistic cinematic style.',
    description: 'Rugged Nordic legend.'
  },
  {
    id: '6',
    name: '1920s Noir',
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=500&fit=crop',
    prompt: 'Convert this photo into a black and white film noir movie still. High contrast lighting, dramatic shadows, and a smoky detective agency vibe.',
    description: 'Classic detective mystery.'
  },
  {
    id: '7',
    name: 'Pop Art (Warhol)',
    imageUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=500&fit=crop',
    prompt: 'Transform this person into an Andy Warhol style Pop Art silkscreen print. High-saturation, vibrant clashing colors, and repetitive patterns.',
    description: 'Vibrant 60s iconic art.'
  },
  {
    id: '8',
    name: 'Space Explorer',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=500&fit=crop',
    prompt: 'Imagine this person as an astronaut exploring a distant nebula. Reflection on the helmet visor, cosmic dust, and brilliant starlight.',
    description: 'Journey to the stars.'
  },
  {
    id: '9',
    name: 'Grand Theft Auto',
    imageUrl: 'https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?w=400&h=500&fit=crop',
    prompt: 'Illustrate this person in the iconic GTA loading screen art style. Heavy outlines, cel-shaded coloring, and a West Coast urban background.',
    description: 'Video game loading screen style.'
  },
  {
    id: '10',
    name: 'Disney Pixar 3D',
    imageUrl: 'https://images.unsplash.com/photo-1580133500002-1b1a95d3c566?w=400&h=500&fit=crop',
    prompt: 'Recreate this person as a 3D animated character from a Pixar movie. Large expressive eyes, smooth subsurface scattering skin, and high-quality fur/cloth rendering.',
    description: 'Expressive 3D animation.'
  }
];

const DEFAULT_ADMIN: AdminSettings = {
  username: 'admin',
  passwordHash: 'admin123',
  payment: {
    gateway: 'Stripe',
    merchantId: 'm_test_123',
    currency: 'USD',
    enabled: true,
    photoPrice: 9.99
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
  }
};

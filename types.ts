
export interface StyleTemplate {
  id: string;
  name: string;
  imageUrl: string;
  prompt: string;
  description: string;
}

export interface ApiKeyRecord {
  id: string;
  key: string;
  label: string;
  status: 'active' | 'exhausted' | 'invalid';
  addedAt: number;
}

export interface PaymentConfig {
  gateway: 'Razorpay';
  keyId: string;
  keySecret: string;
  currency: string;
  enabled: boolean;
  photoPrice: number;
}

export interface AdminSettings {
  passwordHash: string;
  username: string;
  payment: PaymentConfig;
}

export interface CartItem {
  id: string;
  styledImage: string;
  styleName: string;
  price: number;
}

// Fix: Added missing User interface to resolve import errors in components/UserView.tsx and services/authService.ts
export interface User {
  email: string;
  isLoggedIn: boolean;
}

export type ViewType = 'home' | 'admin' | 'about' | 'contact';

export interface StyleTemplate {
  id: string;
  name: string;
  imageUrl: string;
  prompt: string;
  description: string;
  created_at?: string;
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
  geminiApiKey?: string;
  geminiApiKeys?: ApiKeyRecord[]; // Supporting a pool of keys
}

export interface CartItem {
  id: string;
  styledImage: string;
  styleName: string;
  price: number;
}

export interface User {
  email: string;
  isLoggedIn: boolean;
}

export interface TransactionRecord {
  id?: string;
  razorpay_payment_id: string;
  user_email: string;
  amount: number;
  items: string[];
  status: 'success' | 'failed';
  created_at?: string;
}

export type ViewType = 'home' | 'admin' | 'about' | 'contact';

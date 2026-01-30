
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
  gateway: string;
  merchantId: string;
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

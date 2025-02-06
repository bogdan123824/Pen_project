export interface Pen {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  seller_id: number;
}

export interface User {
  id: number;
  wallet_address: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
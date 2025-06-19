export interface ApiError {
  error: string;
  details?: unknown;
}
// Enums
export type OrderStatus = "completed" | "ready" | "cooking" | "pending";
export type PaymentStatus = "paid" | "pending";
export type Role = "admin" | "cashier" | "kitchen" | "customer";

// User
export interface User {
  id: string;
  name?: string | null;
  email: string;
  emailVerified?: string | null;
  password?: string | null;
  role: Role;
  created_at: string;
  updated_at: string;

  accounts?: Account[];
  sessions?: Session[];
  orders?: Order[];
  favorites?: Favorite[];
  ratings?: Rating[];
}

// Account
export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;

  user?: User;
}

// Session
export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: string;

  user?: User;
}

// VerificationToken
export interface VerificationToken {
  identifier: string;
  token: string;
  expires: string;
}

// Order
export interface Order {
  id: string;
  customer_id: string;
  table_id: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  order_time: string;
  completed_time?: string | null;
  kasir_id?: string;
  created_at: string;
  updated_at: string;

  customer: User;
  kasir: User;
  table: Table;
  order_items: OrderItem[];
}

export interface Table {
  id: string;
  name: string;
  desc?: string | null;
  created_at: string;
  updated_at: string;
}
// OrderItem
export interface OrderItem {
  id: string;
  order_id: string;
  menu_id: string;
  price: number;
  quantity: number;
  subtotal: number;
  customization?: string | null;
  created_at: string;
  updated_at: string;

  order?: Order;
  menu: Menu;
}

// Category
export interface Category {
  id: string;
  name: string;
  desc?: string | null;
  menuCount?: number;
  created_at: string;
  updated_at: string;

  menus?: Menu[];
}

// Menu
export interface Menu {
  id: string;
  category_id: string;
  name: string;
  desc?: string | null;
  image?: string | null;
  is_available: boolean;
  price: number;
  created_at: string;
  updated_at: string;

  category?: Category;
  order_items?: OrderItem[];
  favorites?: Favorite[];
  ratings?: Rating[];
}

// Favorite
export interface Favorite {
  id: string;
  customer_id: string;
  menu_id: string;
  created_at: string;
  updated_at: string;

  customer?: User;
  menu?: Menu;
}

// Rating
export interface Rating {
  id: string;
  customer_id: string;
  menu_id: string;
  rating: number;
  review?: string | null;
  created_at: string;
  updated_at: string;

  customer?: User;
  menu?: Menu;
}

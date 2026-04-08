export interface Negocio {
  id: string;
  name: string;
  category: string;
  description?: string;
  rating?: number;
  tags?: string;
  lat: number;
  lng: number;
  owner_id?: string;
  image_url?: string;
  images?: string[];
  distancia_km?: number;
  status?: string;
  phone?: string | null;
  website?: string | null;
  opening_hours?: string | null;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string | null;
  available: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  menu_id: string;
  name: string;
  order_index: number;
  menu_items?: MenuItem[];
}

export interface Menu {
  id: string;
  negocio_id: string;
  name: string;
  description?: string;
  created_at: string;
  menu_categories?: MenuCategory[];
}
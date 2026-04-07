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
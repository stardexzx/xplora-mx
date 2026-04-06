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
  image_url?: string;        // imagen principal (legacy)
  images?: string[];         // múltiples imágenes (de negocio_images)
  distancia_km?: number;
  status?: string;
  phone?: string;            // teléfono / WhatsApp
  website?: string;          // sitio web
  opening_hours?: string;    // horario en texto libre, ej. "Lun–Vie 9–18h"
}
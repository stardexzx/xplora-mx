import { createClient } from '@supabase/supabase-js';
import { Menu, MenuCategory, MenuItem } from '../types/negocio';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan variables de entorno de Supabase");
}

// Una sola instancia global — evita el error de lock por múltiples instancias
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,  // evita conflictos con Next.js router
    flowType: "pkce",
    storageKey: "xploramx-auth",  // clave única para evitar conflictos de lock entre tabs/instancias
    lock: async (name, acquireTimeout, fn) => {
      // Implementación robusta de lock que no cuelga en Strict Mode
      try {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Lock timeout")), acquireTimeout)
          ),
        ]);
      } catch {
        return fn();
      }
    },
  },
});

// ─── FUNCIONES PARA MENÚS ───────────────────────────────────────────────────

export async function getMenusByNegocio(negocio_id: string): Promise<Menu[]> {
  try {
    console.log("📡 Intentando cargar menús sin items primero...");
    // Primero, trae solo menus y menu_categories (sin items)
    const { data, error } = await supabase
      .from('menus')
      .select(`*, menu_categories(*)`)
      .eq('negocio_id', negocio_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("❌ Supabase error fetching menus:", error);
      return [];
    }
    
    console.log("✅ Menús y categorías cargados:", data);
    
    // Ahora intenta cargar items por separado si es necesario
    if (data && data.length > 0) {
      const menusWithItems = await Promise.all(
        data.map(async (menu: any) => {
          if (menu.menu_categories && menu.menu_categories.length > 0) {
            const categoriesWithItems = await Promise.all(
              menu.menu_categories.map(async (cat: any) => {
                try {
                  const { data: items } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('category_id', cat.id);
                  return { ...cat, menu_items: items ?? [] };
                } catch (err) {
                  console.error(`⚠️  Error loading items for category ${cat.id}:`, err);
                  return { ...cat, menu_items: [] };
                }
              })
            );
            return { ...menu, menu_categories: categoriesWithItems };
          }
          return menu;
        })
      );
      return menusWithItems as Menu[];
    }
    
    return (data ?? []) as Menu[];
  } catch (err) {
    console.error("❌ Exception fetching menus:", err);
    return [];
  }
}

export async function createMenu(negocio_id: string, name: string, description?: string): Promise<Menu | null> {
  try {
    const { data, error } = await supabase
      .from('menus')
      .insert({ negocio_id, name, description: description || null })
      .select()
      .single();
    if (error) {
      console.error("❌ Supabase error creating menu:", error);
      return null;
    }
    return data as Menu;
  } catch (err) {
    console.error("❌ Exception creating menu:", err);
    return null;
  }
}

export async function updateMenu(menu_id: string, name: string, description?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('menus')
      .update({ name, description: description || null })
      .eq('id', menu_id);
    if (error) {
      console.error("❌ Supabase error updating menu:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("❌ Exception updating menu:", err);
    return false;
  }
}

export async function deleteMenu(menu_id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', menu_id);
    if (error) {
      console.error("❌ Supabase error deleting menu:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("❌ Exception deleting menu:", err);
    return false;
  }
}

// ─── FUNCIONES PARA CATEGORÍAS DE MENÚ ───────────────────────────────────────

export async function createMenuCategory(menu_id: string, name: string, order_index: number = 0): Promise<MenuCategory | null> {
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({ menu_id, name, order_index })
      .select()
      .single();
    if (error) {
      console.error("❌ Supabase error creating category:", error);
      return null;
    }
    return data as MenuCategory;
  } catch (err) {
    console.error("❌ Exception creating category:", err);
    return null;
  }
}

export async function updateMenuCategory(category_id: string, name: string, order_index?: number): Promise<boolean> {
  const update: any = { name };
  if (order_index !== undefined) update.order_index = order_index;
  const { error } = await supabase
    .from('menu_categories')
    .update(update)
    .eq('id', category_id);
  return !error;
}

export async function deleteMenuCategory(category_id: string): Promise<boolean> {
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', category_id);
  return !error;
}

// ─── FUNCIONES PARA ITEMS DE MENÚ ───────────────────────────────────────────

export async function createMenuItem(
  category_id: string,
  name: string,
  price: number,
  description?: string,
  image_url?: string
): Promise<MenuItem | null> {
  try {
    console.log("📝 createMenuItem - Insertando:", { category_id, name, price, description, image_url });
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        category_id,
        name,
        price,
        description: description || null,
        image_url: image_url || null,
        available: true,
      })
      .select()
      .single();
    if (error) {
      console.error("❌ Supabase error creating menu item:", error);
      return null;
    }
    console.log("✅ Menu item creado:", data);
    return data as MenuItem;
  } catch (err) {
    console.error("❌ Exception creating menu item:", err);
    return null;
  }
}

export async function updateMenuItem(
  item_id: string,
  name: string,
  price: number,
  description?: string,
  available: boolean = true,
  image_url?: string
): Promise<boolean> {
  try {
    console.log("📝 updateMenuItem - Actualizando:", { item_id, name, price, description, available, image_url });
    const { error } = await supabase
      .from('menu_items')
      .update({
        name,
        price,
        description: description || null,
        available,
        image_url: image_url || null,
      })
      .eq('id', item_id);
    if (error) {
      console.error("❌ Supabase error updating menu item:", error);
      return false;
    }
    console.log("✅ Menu item actualizado");
    return true;
  } catch (err) {
    console.error("❌ Exception updating menu item:", err);
    return false;
  }
}

export async function deleteMenuItem(item_id: string): Promise<boolean> {
  try {
    console.log("🗑️ deleteMenuItem - Eliminando:", item_id);
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', item_id);
    if (error) {
      console.error("❌ Supabase error deleting menu item:", error);
      return false;
    }
    console.log("✅ Menu item eliminado");
    return true;
  } catch (err) {
    console.error("❌ Exception deleting menu item:", err);
    return false;
  }
}
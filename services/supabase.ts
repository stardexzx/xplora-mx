import { createClient } from '@supabase/supabase-js';

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
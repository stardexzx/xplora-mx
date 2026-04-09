import { useState, useEffect, useRef } from "react";
import { Negocio } from "../types/negocio";

type CacheItem = {
  name: string;
  description: string;
  tags?: string;
  category?: string;
  opening_hours?: string;
};

const cache = new Map<string, CacheItem>();

export function useTranslatedNegocios(negocios: Negocio[], lang: string) {
  const [translated, setTranslated] = useState<Negocio[]>(negocios);
  const pendingRef = useRef(false);

  useEffect(() => {
    // 1. Casos base: Español o lista vacía
    if (lang === "es" || negocios.length === 0) {
      setTranslated(negocios);
      return;
    }

    const translate = async () => {
      if (pendingRef.current) return;

      // 2. Filtrar negocios que no están en caché
      const toTranslate = negocios.filter(n => !cache.has(`${lang}:${n.id}`));

      if (toTranslate.length > 0) {
        pendingRef.current = true;
        
        // 3. Preparar los textos (4 strings por negocio)
        const textsToFetch = toTranslate.flatMap(n => [
          n.description || "",
          n.tags || "",
          n.category || "",
          n.opening_hours || ""
        ]);

        try {
          const res = await fetch("/api/translateUI", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: textsToFetch, lang }),
          });
          
          const data = await res.json();
          const translations: string[] = data.translations || textsToFetch;

          // 4. Guardar resultados en caché
          toTranslate.forEach((n, i) => {
            const baseIndex = i * 4;
            cache.set(`${lang}:${n.id}`, {
              name: n.name, // El nombre no se traduce según tu comentario
              description: translations[baseIndex] || n.description || "",
              tags: translations[baseIndex + 1] || n.tags || "",
              category: translations[baseIndex + 2] || n.category || "",
              opening_hours: translations[baseIndex + 3] || n.opening_hours || ""
            });
          });
        } catch (error) {
          console.error("Error translating:", error);
          // Opcional: llenar caché con originales para evitar re-intentos infinitos
        } finally {
          pendingRef.current = false;
        }
      }

      // 5. Construir la lista final combinando datos originales + caché
      const result = negocios.map((n) => {
        const cached = cache.get(`${lang}:${n.id}`);
        if (!cached) return n;
        
        return {
          ...n,
          description: cached.description,
          tags: cached.tags,
          category: cached.category,
          opening_hours: cached.opening_hours,
        };
      });

      setTranslated(result);
    };

    translate();
  }, [negocios, lang]);

  return translated;
}
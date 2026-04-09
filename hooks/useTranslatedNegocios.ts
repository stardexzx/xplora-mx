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

  // Clave estable: no usamos el array como dependencia directa
  // sino un string con los IDs — solo cambia cuando cambian los negocios reales
  const negociosKey = negocios.map(n => n.id).join(",");

  useEffect(() => {
    // 1. Casos base: Español o lista vacía — comparar con translated actual para no hacer loop
    if (lang === "es" || negocios.length === 0) {
      setTranslated(prev =>
        prev.length === negocios.length &&
        prev.every((p, i) => p.id === negocios[i]?.id)
          ? prev   // sin cambios → no dispara re-render
          : negocios
      );
      return;
    }

    const translate = async () => {
      if (pendingRef.current) return;

      // 2. Filtrar negocios que no están en caché
      const toTranslate = negocios.filter(n => !cache.has(`${lang}:${n.id}`));

      if (toTranslate.length > 0) {
        pendingRef.current = true;

        const textsToFetch = toTranslate.flatMap(n => [
          n.description || "",
          n.tags || "",
          n.category || "",
          n.opening_hours || "",
        ]);

        try {
          const res = await fetch("/api/translateUI", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: textsToFetch, lang }),
          });

          const data = await res.json();
          const translations: string[] = data.translations || textsToFetch;

          toTranslate.forEach((n, i) => {
            const baseIndex = i * 4;
            cache.set(`${lang}:${n.id}`, {
              name: n.name,
              description: translations[baseIndex] || n.description || "",
              tags: translations[baseIndex + 1] || n.tags || "",
              category: translations[baseIndex + 2] || n.category || "",
              opening_hours: translations[baseIndex + 3] || n.opening_hours || "",
            });
          });
        } catch (error) {
          console.error("Error translating:", error);
          // Llenar caché con originales para evitar re-intentos infinitos
          toTranslate.forEach(n => {
            if (!cache.has(`${lang}:${n.id}`)) {
              cache.set(`${lang}:${n.id}`, {
                name: n.name,
                description: n.description || "",
                tags: n.tags || "",
                category: n.category || "",
                opening_hours: n.opening_hours || "",
              });
            }
          });
        } finally {
          pendingRef.current = false;
        }
      }

      // 3. Construir lista final
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negociosKey, lang]);

  return translated;
}
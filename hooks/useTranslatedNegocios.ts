// hooks/useTranslatedNegocios.ts
import { useState, useEffect, useRef } from "react";
import { Negocio } from "../types/negocio";

const cache = new Map<string, { name: string; description: string }>();

export function useTranslatedNegocios(negocios: Negocio[], lang: string) {
  const [translated, setTranslated] = useState<Negocio[]>(negocios);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (lang === "es") {
      setTranslated(negocios);
      return;
    }
    if (negocios.length === 0) {
      setTranslated([]);
      return;
    }
    if (pendingRef.current) return;

    const translate = async () => {
      pendingRef.current = true;

      // Separar los que ya están en caché
      const toTranslate = negocios.filter(
        (n) => !cache.has(`${lang}:${n.id}`)
      );

      if (toTranslate.length > 0) {
        // Mandar nombres y descripciones en una sola llamada (intercalados)
        const texts = toTranslate.flatMap((n) => [
          n.name ?? "",
          n.description?.split(".")[0] ?? "", // Solo primer párrafo
        ]);

        try {
          const res = await fetch("/api/translateUI", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts, lang }),
          });
          const data = await res.json();
          const translations: string[] = data.translations ?? texts;

          // Guardar en caché de a pares
          toTranslate.forEach((n, i) => {
            cache.set(`${lang}:${n.id}`, {
              name: translations[i * 2] ?? n.name,
              description: translations[i * 2 + 1] ?? n.description ?? "",
            });
          });
        } catch {
          // Si falla, usar originales
          toTranslate.forEach((n) => {
            cache.set(`${lang}:${n.id}`, {
              name: n.name,
              description: n.description ?? "",
            });
          });
        }
      }

      // Aplicar caché a todos
      const result = negocios.map((n) => {
        const cached = cache.get(`${lang}:${n.id}`);
        if (!cached) return n;
        return {
          ...n,
          name: cached.name,
          description: cached.description,
        };
      });

      setTranslated(result);
      pendingRef.current = false;
    };

    translate();
  }, [negocios, lang]);

  return translated;
}
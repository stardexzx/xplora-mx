import { useState, useEffect, useRef } from "react";
import { Menu } from "../types/negocio";

export function useTranslatedMenus(menus: Menu[], lang: string) {
  const [translatedMenus, setTranslatedMenus] = useState<Menu[]>(menus);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (lang === "es" || menus.length === 0) {
      setTranslatedMenus(menus);
      return;
    }

    const translateMenus = async () => {
      if (pendingRef.current) return;
      pendingRef.current = true;

      const textsToFetch: string[] = [];
      menus.forEach((menu) => {
        textsToFetch.push(menu.name);
        textsToFetch.push(menu.description || "");
        menu.menu_categories?.forEach((category) => {
          textsToFetch.push(category.name);
          category.menu_items?.forEach((item) => {
            textsToFetch.push(item.description || "");
          });
        });
      });

      try {
        const res = await fetch("/api/translateUI", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: textsToFetch, lang }),
        });

        const data = await res.json();
        const translations: string[] = data.translations || textsToFetch;

        let index = 0;
        const result = menus.map((menu) => {
          const translatedMenu: Menu = {
            ...menu,
            name: translations[index++] || menu.name,
            description: translations[index++] || menu.description || "",
            menu_categories: menu.menu_categories?.map((category) => ({
              ...category,
              name: translations[index++] || category.name,
              menu_items: category.menu_items?.map((item) => ({
                ...item,
                description: translations[index++] || item.description || "",
              })),
            })),
          };
          return translatedMenu;
        });

        setTranslatedMenus(result);
      } catch (error) {
        console.error("Error translating menus:", error);
        setTranslatedMenus(menus);
      } finally {
        pendingRef.current = false;
      }
    };

    translateMenus();
  }, [menus, lang]);

  return translatedMenus;
}

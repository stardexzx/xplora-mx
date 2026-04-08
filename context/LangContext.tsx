"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// ── Textos base en español (fuente de verdad) ────────────────────────────────
const BASE_ES = {
  searchPlaceholder: "¿Qué quieres hacer hoy?",
  search: "Buscar",
  searching: "...",
  voiceNotSupported: "Tu navegador no soporta reconocimiento de voz",
  nearby: "Cerca",
  nearbyActive: " {km}km ✕",
  nearbyCount: "📍 {n} negocio(s) a menos de {km}km",
  results: "Resultados",
  rate: "⭐ Calificar",
  rateTitle: "Calificar {name}",
  ratingLabel: "Rating:",
  commentPlaceholder: "Comentario",
  send: "Enviar",
  cancel: "Cancelar",
  loginRequired: "Debes iniciar sesión para calificar.",
  reviewError: "Error al enviar la reseña.",
  login: "Login / Registro",
  logout: "Cerrar sesión",
  registerBusiness: "Registrar negocio",
  businessName: "Nombre",
  businessCategory: "Categoría",
  create: "Crear",
  createSuccess: "¡Negocio creado exitosamente!",
  createError: "Error al crear el negocio: ",
  fillFields: "Por favor llena todos los campos.",
  loginTitle: "Login / Registro",
  emailPlaceholder: "Email",
  passwordPlaceholder: "Contraseña",
  loginBtn: "Entrar",
  registerBtn: "Registrarse",
  loginError: "Correo o contraseña incorrectos.",
  loading: "Cargando...",
  qrTitle: "Escanea para descubrir lo auténtico de México",
  qrDownload: "Descargar QR",
  qrHint: "Sin descargas. Solo escanea con la cámara de tu teléfono.",
  translating: "Traduciendo...",
  infoTab: "Información",
  reviewsTab: "Reseñas",
  routeTab: "Ruta",
  howToGetThere: "Cómo llegar",
  writeReview: "Escribir reseña",
  loadingReviews: "Cargando reseñas...",
  noReviews: "Sin reseñas aún",
  directions: "Indicaciones",
  locationRequired: "Activa tu ubicación",
  selectTransport: "Selecciona un transporte para calcular",
  profile: "Mi perfil",
  myBusinesses: "Mis negocios",
  adminPanel: "Panel admin",
  viewMenu: "Ver menú",
  loadingMenu: "Cargando menú...",
  menuUnavailable: "Este negocio no tiene menú disponible",
  noMenuItems: "Sin ítems aún"
};

export type T = typeof BASE_ES;

// Reemplaza {key} en una cadena con valores
export function interpolate(str: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    str
  );
}

// Cache en memoria para no repetir llamadas a DeepL por sesión
const translationCache: Record<string, T> = { es: BASE_ES };

interface LangContextType {
  lang: string;        // código ISO del idioma actual (ej: "fr", "ja")
  t: T;                // traducciones activas
  ready: boolean;      // false mientras se carga la traducción
  setLang: (lang: string) => void;
}

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState("es");
  const [t, setT] = useState<T>(BASE_ES);
  const [ready, setReady] = useState(false);

  const loadTranslation = useCallback(async (targetLang: string) => {
    const code = targetLang.slice(0, 2).toLowerCase();

    // Español: usar base directamente
    if (code === "es") {
      setT(BASE_ES);
      setLangState("es");
      setReady(true);
      return;
    }

    // Cache hit
    if (translationCache[code]) {
      setT(translationCache[code]);
      setLangState(code);
      setReady(true);
      return;
    }

    setReady(false);

    try {
      const keys = Object.keys(BASE_ES) as (keyof T)[];
      const texts = keys.map((k) => BASE_ES[k]);

      const res = await fetch("/api/translateUI", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, lang: code }),
      });

      if (!res.ok) throw new Error("translateUI failed");

      const data = await res.json();
      const translated = Object.fromEntries(
        keys.map((k, i) => [k, data.translations[i] ?? BASE_ES[k]])
      ) as T;

      translationCache[code] = translated;
      setT(translated);
      setLangState(code);
    } catch {
      // Fallback silencioso: usar español
      setT(BASE_ES);
      setLangState("es");
    } finally {
      setReady(true);
    }
  }, []);

  // Detectar idioma del navegador al montar
  useEffect(() => {
    const browserLang = navigator.language?.slice(0, 2).toLowerCase() ?? "es";
    loadTranslation(browserLang);
  }, [loadTranslation]);

  const setLang = (newLang: string) => loadTranslation(newLang);

  return (
    <LangContext.Provider value={{ lang, t, ready, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang debe usarse dentro de LangProvider");
  return ctx;
}
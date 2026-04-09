"use client";

import { createContext, useContext, ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

// Bibliotecas definidas UNA sola vez — si se llama useJsApiLoader con distintas
// libraries y el mismo id, Google Maps lanza "Loader must not be called again with different options".
// Solución: un único provider en el árbol que carga el script; todos los consumidores
// leen isLoaded desde el contexto sin volver a llamar al loader.
const LIBRARIES: ("marker" | "maps" | "places")[] = ["marker"];

interface MapsCtx { isLoaded: boolean; }
const MapsContext = createContext<MapsCtx>({ isLoaded: false });

export function MapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    id: "google-map-script",
    libraries: LIBRARIES,
  });

  return (
    <MapsContext.Provider value={{ isLoaded }}>
      {children}
    </MapsContext.Provider>
  );
}

export function useMaps() {
  return useContext(MapsContext);
}

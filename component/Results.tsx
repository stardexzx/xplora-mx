"use client";

import { Negocio } from "../types/negocio";
import ImageCarousel from "./ImageCarousel";
import { useLang } from "../context/LangContext";

const CAT_LABELS: Record<string, string> = {
  comida: "Comida", tours: "Tours", hospedaje: "Hospedaje",
  artesanias: "Artesanías", entretenimiento: "Entretenimiento",
};

function StarRating({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px" }}>
      {[1,2,3,4,5].map(s => (
        <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s <= Math.round(value) ? "#222" : "#ddd"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  );
}

interface Props {
  negocios: Negocio[];
  selectedId: string | null;
  onSelect: (negocio: Negocio) => void;
}

export default function Results({ negocios, selectedId, onSelect }: Props) {
  const { t } = useLang();

  if (!negocios.length) return (
    <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--muted)" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" style={{ marginBottom: "12px" }}>
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <p style={{ fontSize: "0.9rem" }}>No se encontraron negocios</p>
      <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>Intenta con otra búsqueda</p>
    </div>
  );

  return (
    <div style={{ padding: "12px" }}>
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "10px", paddingLeft: "4px" }}>
        {negocios.length} resultado{negocios.length !== 1 ? "s" : ""}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {negocios.map(negocio => {
          const images = negocio.images?.length ? negocio.images : negocio.image_url ? [negocio.image_url] : [];
          const isSelected = negocio.id === selectedId;

          return (
            <div key={negocio.id} onClick={() => onSelect(negocio)}
              className="card card-hover"
              style={{
                cursor: "pointer",
                outline: isSelected ? "2px solid var(--text)" : "none",
                outlineOffset: "2px",
              }}>

              {/* Imagen */}
              {images.length > 0 ? (
                <ImageCarousel images={images} alt={negocio.name} height={160} />
              ) : (
                <div style={{ height: "120px", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
              )}

              <div style={{ padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.3 }}>{negocio.name}</p>
                  {negocio.rating != null && negocio.rating > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0, marginLeft: "8px" }}>
                      <StarRating value={negocio.rating} />
                      <span style={{ fontSize: "0.78rem", color: "var(--text)", fontWeight: 600 }}>{negocio.rating}</span>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: negocio.distancia_km !== undefined ? "6px" : "0" }}>
                  {CAT_LABELS[negocio.category] ?? negocio.category}
                  {negocio.description ? ` · ${negocio.description.slice(0, 60)}${negocio.description.length > 60 ? "…" : ""}` : ""}
                </p>

                {negocio.distancia_km !== undefined && (
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    {negocio.distancia_km.toFixed(1)} km
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
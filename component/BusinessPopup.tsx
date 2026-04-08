"use client";

import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { Negocio } from "../types/negocio";
import { useLang } from "../context/LangContext";
import { LatLng } from "../services/geo";
import { TravelMode, RouteRequest } from "./Map";
import type { RouteResult } from "../app/api/route/route";

interface Props {
  negocio: Negocio;
  onClose: () => void;
  userLocation?: LatLng | null;
  onRouteRequest?: (req: RouteRequest | null) => void;
  routeResult?: RouteResult | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reply?: string | null;
}

const CAT_LABELS: Record<string, string> = {
  comida: "Comida y bebidas", tours: "Tours y experiencias",
  hospedaje: "Hospedaje", artesanias: "Artesanías",
  entretenimiento: "Entretenimiento",
};

function StarRating({ value, size = 10 }: { value: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24"
          fill={s <= Math.round(value) ? "#F0D224" : "rgba(255,255,255,0.15)"}
          stroke={s <= Math.round(value) ? "#F0D224" : "rgba(255,255,255,0.2)"}
          strokeWidth="1">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

type Tab = "info" | "reviews" | "ruta";

// ── Colores del tema navy ────────────────────────────────────────────────────
const NAVY = {
  bg:       "#03112a",
  surface:  "#04193d",
  surface2: "#061f4a",
  border:   "rgba(28, 66, 232, 0.25)",
  text:     "#ffffff",
  text2:    "rgba(255,255,255,0.72)",
  muted:    "rgba(255,255,255,0.38)",
  blue:     "#1C42E8",
  lightBlue:"#1CA8F7",
  yellow:   "#F0D224",
  danger:   "#FF594D",
};

export default function BusinessPopup({ negocio, onClose, userLocation, onRouteRequest, routeResult }: Props) {
  const { t } = useLang();
  const [imgIndex, setImgIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("info");
  const [travelMode, setTravelMode] = useState<TravelMode>("TRANSIT");
  const [routeRequested, setRouteRequested] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const images = negocio.images?.length
    ? negocio.images
    : negocio.image_url ? [negocio.image_url] : [];

  const tags = negocio.tags
    ? negocio.tags.split(",").map(t => t.trim()).filter(Boolean)
    : [];

  const loadReviews = async () => {
    setLoadingReviews(true);
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, reply")
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false });
    setReviews((data ?? []) as Review[]);
    setLoadingReviews(false);
  };

  useEffect(() => {
    if (tab === "reviews") loadReviews();
    if (tab !== "ruta") { onRouteRequest?.(null); setRouteRequested(false); }
  }, [tab, negocio.id]);

  const requestRoute = (mode: TravelMode) => {
    setTravelMode(mode);
    setRouteRequested(true);
    if (userLocation) {
      onRouteRequest?.({ origin: userLocation, destination: { lat: negocio.lat, lng: negocio.lng }, mode });
    }
  };

  const submitReview = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setReviewMsg(t.loginRequired ?? "Inicia sesión para reseñar"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert([{
      negocio_id: negocio.id, user_id: userData.user.id, rating, comment,
    }]);
    setSubmitting(false);
    if (error) {
      setReviewMsg("Error al enviar. Inténtalo de nuevo.");
    } else {
      setReviewMsg("¡Reseña enviada! Gracias.");
      setShowWriteReview(false);
      setComment(""); setRating(5);
      loadReviews();
    }
    setTimeout(() => setReviewMsg(""), 3500);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px 0", fontSize: "0.8rem",
    fontWeight: active ? 700 : 500,
    color: active ? NAVY.lightBlue : NAVY.muted,
    background: "none", border: "none",
    borderBottom: `2px solid ${active ? NAVY.blue : "transparent"}`,
    cursor: "pointer", transition: "all 0.15s",
    fontFamily: "var(--font-body)",
  });

  return (
    <>
      {/* Backdrop en móvil */}
      {isMobile && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 499, backdropFilter: "blur(3px)",
        }} />
      )}

      <div
        className="animate-slide-up"
        style={isMobile ? {
          position: "fixed", bottom: 0, left: 0, right: 0, width: "100%",
          background: NAVY.bg,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(2,8,20,0.8)",
          border: `1px solid ${NAVY.border}`,
          borderBottom: "none",
          overflow: "hidden", zIndex: 500,
          display: "flex", flexDirection: "column",
          maxHeight: "82vh",
        } : {
          position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          width: "min(440px, calc(100vw - 48px))",
          background: NAVY.bg,
          borderRadius: "20px",
          boxShadow: "0 12px 48px rgba(2,8,20,0.8)",
          border: `1px solid ${NAVY.border}`,
          overflow: "hidden", zIndex: 500,
          display: "flex", flexDirection: "column",
          maxHeight: "calc(100vh - 120px)",
        }}
      >
        {/* Drag handle móvil */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: NAVY.border }} />
          </div>
        )}

        {/* ── Imagen ── */}
        <div style={{ position: "relative", height: isMobile ? "160px" : "190px", background: NAVY.surface2, flexShrink: 0 }}>
          {images.length > 0 ? (
            <img src={images[imgIndex]} alt={negocio.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={NAVY.border} strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}

          {images.length > 1 && (
            <>
              <button onClick={() => setImgIndex(i => (i-1+images.length)%images.length)}
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
                  width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer",
                  background: "rgba(3,17,42,0.75)", color: NAVY.text,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(4px)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button onClick={() => setImgIndex(i => (i+1)%images.length)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                  width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer",
                  background: "rgba(3,17,42,0.75)", color: NAVY.text,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(4px)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "4px" }}>
                {images.map((_, i) => (
                  <div key={i} onClick={() => setImgIndex(i)}
                    style={{ width: i === imgIndex ? 16 : 6, height: 6, borderRadius: 3,
                      background: "rgba(255,255,255,0.85)", cursor: "pointer", transition: "width 0.2s" }} />
                ))}
              </div>
            </>
          )}

          {/* Botón cerrar */}
          <button onClick={onClose}
            style={{ position: "absolute", top: "10px", right: "10px",
              width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer",
              background: "rgba(3,17,42,0.75)", color: NAVY.text,
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>

          {/* Badge categoría */}
          <div style={{ position: "absolute", top: "10px", left: "10px",
            background: "rgba(3,17,42,0.75)", backdropFilter: "blur(4px)",
            borderRadius: "20px", padding: "4px 10px", fontSize: "0.72rem",
            fontWeight: 600, color: NAVY.text, border: `1px solid ${NAVY.border}` }}>
            {CAT_LABELS[negocio.category] ?? negocio.category}
          </div>
        </div>

        {/* ── Header del negocio ── */}
        <div style={{ padding: "14px 18px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: NAVY.text, lineHeight: 1.3, margin: 0 }}>
              {negocio.name}
            </h3>
            {negocio.rating != null && negocio.rating > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0, marginLeft: "8px" }}>
                <StarRating value={negocio.rating} />
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: NAVY.yellow }}>
                  {negocio.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${NAVY.border}`, margin: "10px 18px 0", flexShrink: 0 }}>
          <button style={tabStyle(tab === "info")} onClick={() => setTab("info")}>Información</button>
          <button style={tabStyle(tab === "reviews")} onClick={() => setTab("reviews")}>
            Reseñas{tab === "reviews" && reviews.length > 0 ? ` (${reviews.length})` : ""}
          </button>
          <button style={tabStyle(tab === "ruta")} onClick={() => setTab("ruta")}>🗺 Ruta</button>
        </div>

        {/* ── Contenido scrollable ── */}
        <div style={{ overflowY: "auto", padding: "14px 18px 18px", flex: 1 }}>

          {/* TAB INFO */}
          {tab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {negocio.description && (
                <p style={{ fontSize: "0.85rem", color: NAVY.text2, lineHeight: 1.55, margin: 0 }}>
                  {negocio.description}
                </p>
              )}

              {tags.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {tags.map(tag => (
                    <span key={tag} style={{
                      display: "inline-flex", alignItems: "center", padding: "3px 10px",
                      borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600,
                      background: "rgba(28,66,232,0.15)", color: NAVY.lightBlue,
                      border: `1px solid ${NAVY.border}`,
                    }}>{tag}</span>
                  ))}
                </div>
              )}

              {negocio.opening_hours && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.83rem", color: NAVY.text2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NAVY.lightBlue} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{negocio.opening_hours}</span>
                </div>
              )}

              {negocio.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.83rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NAVY.lightBlue} strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  <a href={`tel:${negocio.phone}`} style={{ color: NAVY.text, textDecoration: "none", fontWeight: 500 }}>
                    {negocio.phone}
                  </a>
                </div>
              )}

              {negocio.website && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.83rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NAVY.lightBlue} strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                  </svg>
                  <a href={negocio.website.startsWith("http") ? negocio.website : `https://${negocio.website}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: NAVY.lightBlue, textDecoration: "none", fontWeight: 500,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "270px" }}>
                    {negocio.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              {negocio.distancia_km !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: NAVY.muted, fontSize: "0.82rem" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {negocio.distancia_km.toFixed(1)} km de distancia
                </div>
              )}

              <a href={`https://www.google.com/maps/dir/?api=1&destination=${negocio.lat},${negocio.lng}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  marginTop: "4px", padding: "11px 20px", borderRadius: "999px",
                  background: NAVY.blue, color: "#fff", textDecoration: "none",
                  fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.875rem",
                  boxShadow: "0 4px 20px rgba(28,66,232,0.35)", transition: "all 0.18s",
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M13 6l6 6-6 6"/></svg>
                Cómo llegar
              </a>
            </div>
          )}

          {/* TAB RESEÑAS */}
          {tab === "reviews" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {reviewMsg && (
                <div style={{ background: "rgba(10,191,79,0.12)", border: "1px solid rgba(10,191,79,0.25)",
                  borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem", color: "#2de07a" }}>
                  {reviewMsg}
                </div>
              )}

              {!showWriteReview ? (
                <button onClick={() => setShowWriteReview(true)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "999px",
                    border: `1.5px solid ${NAVY.border}`, background: "transparent",
                    color: NAVY.text2, fontFamily: "var(--font-body)", fontWeight: 600,
                    fontSize: "0.875rem", cursor: "pointer", transition: "all 0.15s",
                  }}>
                  ✏️ Escribir una reseña
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px",
                  background: NAVY.surface, borderRadius: "14px", padding: "14px",
                  border: `1px solid ${NAVY.border}` }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, color: NAVY.text2, margin: 0 }}>Tu calificación</p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                        <svg width="28" height="28" viewBox="0 0 24 24"
                          fill={s <= (hoverRating || rating) ? NAVY.yellow : "none"}
                          stroke={s <= (hoverRating || rating) ? NAVY.yellow : NAVY.muted}
                          strokeWidth="1.5">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                  <textarea placeholder="Comparte tu experiencia..." rows={3}
                    value={comment} onChange={e => setComment(e.target.value)}
                    style={{ resize: "none", fontSize: "0.85rem", width: "100%",
                      background: NAVY.surface2, border: `1.5px solid ${NAVY.border}`,
                      borderRadius: "10px", padding: "10px 12px", color: NAVY.text,
                      fontFamily: "var(--font-body)", outline: "none" }} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={submitReview} disabled={submitting}
                      style={{ flex: 1, padding: "10px", borderRadius: "999px", border: "none",
                        background: NAVY.blue, color: "#fff", fontFamily: "var(--font-body)",
                        fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
                        opacity: submitting ? 0.6 : 1 }}>
                      {submitting ? "Enviando..." : "Publicar"}
                    </button>
                    <button onClick={() => setShowWriteReview(false)}
                      style={{ padding: "10px 18px", borderRadius: "999px",
                        border: `1.5px solid ${NAVY.border}`, background: "transparent",
                        color: NAVY.text2, fontFamily: "var(--font-body)", fontWeight: 600,
                        fontSize: "0.875rem", cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {loadingReviews ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: NAVY.muted, fontSize: "0.85rem" }}>
                  Cargando reseñas...
                </div>
              ) : reviews.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: NAVY.muted }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                    style={{ opacity: 0.3, display: "block", margin: "0 auto 8px" }}>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <p style={{ fontSize: "0.85rem", margin: 0 }}>Aún no hay reseñas. ¡Sé el primero!</p>
                </div>
              ) : reviews.map(review => (
                <div key={review.id} style={{ borderBottom: `1px solid ${NAVY.border}`, paddingBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <StarRating value={review.rating} size={13} />
                    <span style={{ fontSize: "0.75rem", color: NAVY.muted }}>
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.comment && (
                    <p style={{ fontSize: "0.84rem", color: NAVY.text, lineHeight: 1.5, margin: "4px 0 0" }}>
                      {review.comment}
                    </p>
                  )}
                  {review.reply && (
                    <div style={{ marginTop: "8px", background: NAVY.surface, borderRadius: "8px",
                      padding: "8px 10px", borderLeft: `3px solid ${NAVY.blue}` }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: NAVY.lightBlue, margin: "0 0 2px" }}>
                        Respuesta del negocio
                      </p>
                      <p style={{ fontSize: "0.82rem", color: NAVY.text2, margin: 0, lineHeight: 1.45 }}>
                        {review.reply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB RUTA */}
          {tab === "ruta" && (() => {
            const modeConfig: { mode: TravelMode; label: string; icon: React.ReactNode; color: string }[] = [
              {
                mode: "TRANSIT", label: "Transporte", color: "#1a73e8",
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 19h8M12 16v3"/><path d="M8 9h8M8 12h4"/></svg>,
              },
              {
                mode: "WALKING", label: "A pie", color: "#34a853",
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="4" r="1.5"/><path d="M8 17l1-5 3 2 2-5M8 12l-2 5M16 12l2 5"/></svg>,
              },
              {
                mode: "DRIVING", label: "En auto", color: "#ea4335",
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="2" rx="1"/><path d="M5 11h14M7 7l2-4h6l2 4"/></svg>,
              },
            ];

            const fmtDuration = (secs: number) => {
              if (secs < 60) return `${secs} seg`;
              const m = Math.round(secs / 60);
              return m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60}min`;
            };
            const fmtDist = (meters: number) =>
              meters >= 1000 ? `${(meters/1000).toFixed(1)} km` : `${meters} m`;
            const stepDuration = (dur: string) => {
              const s = parseInt(dur.replace("s",""), 10);
              return isNaN(s) ? dur : fmtDuration(s);
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Selector de modo */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {modeConfig.map(({ mode, label, icon, color }) => (
                    <button key={mode} onClick={() => requestRoute(mode)} style={{
                      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                      gap: "4px", padding: "10px 4px", borderRadius: "12px",
                      border: `2px solid ${travelMode === mode && routeRequested ? color : NAVY.border}`,
                      background: travelMode === mode && routeRequested ? `${color}22` : NAVY.surface,
                      color: travelMode === mode && routeRequested ? color : NAVY.text2,
                      cursor: "pointer", transition: "all 0.15s", fontSize: "0.7rem",
                      fontWeight: 600, fontFamily: "var(--font-body)",
                    }}>
                      {icon}{label}
                    </button>
                  ))}
                </div>

                {!userLocation && (
                  <div style={{ background: "rgba(255,89,77,0.1)", border: `1px solid rgba(255,89,77,0.25)`,
                    borderRadius: "8px", padding: "10px 12px", fontSize: "0.82rem",
                    color: NAVY.danger, display: "flex", gap: "8px", alignItems: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Activa tu ubicación para ver rutas
                  </div>
                )}

                {userLocation && !routeRequested && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: NAVY.muted, fontSize: "0.85rem" }}>
                    Selecciona un modo de transporte
                  </div>
                )}

                {userLocation && routeRequested && !routeResult && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: NAVY.muted, fontSize: "0.85rem" }}>
                    <div style={{ width: "20px", height: "20px", border: `2px solid ${NAVY.border}`,
                      borderTopColor: NAVY.blue, borderRadius: "50%",
                      animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
                    Calculando ruta...
                  </div>
                )}

                {routeResult && (
                  <>
                    <div style={{ background: NAVY.surface, borderRadius: "12px", padding: "12px 14px",
                      border: `1px solid ${NAVY.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: "1.1rem", fontWeight: 700, color: NAVY.text, margin: 0 }}>
                          {fmtDuration(routeResult.durationSeconds)}
                        </p>
                        <p style={{ fontSize: "0.8rem", color: NAVY.muted, margin: "2px 0 0" }}>
                          {fmtDist(routeResult.distanceMeters)}
                        </p>
                      </div>
                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation!.lat},${userLocation!.lng}&destination=${negocio.lat},${negocio.lng}&travelmode=${travelMode.toLowerCase()}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: "6px",
                          background: NAVY.blue, color: "white", borderRadius: "8px",
                          padding: "8px 12px", fontSize: "0.78rem", fontWeight: 600,
                          textDecoration: "none", boxShadow: "0 4px 12px rgba(28,66,232,0.3)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                        Google Maps
                      </a>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: NAVY.muted,
                        margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Indicaciones
                      </p>
                      {routeResult.steps.map((step, i) => {
                        const modeColors: Record<string, string> = { WALKING:"#34a853", TRANSIT:"#1a73e8", DRIVING:"#ea4335", WALK:"#34a853", DRIVE:"#ea4335" };
                        const accentColor = modeColors[step.travelMode] ?? NAVY.blue;
                        const linea = step.transitDetails?.transitLine;
                        return (
                          <div key={i} style={{ display: "flex", gap: "10px", paddingBottom: "12px", position: "relative" }}>
                            {i < routeResult.steps.length - 1 && (
                              <div style={{ position: "absolute", left: "11px", top: "22px", bottom: 0,
                                width: "2px", background: NAVY.border }} />
                            )}
                            <div style={{ width: "22px", height: "22px", borderRadius: "50%",
                              background: accentColor, flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                              <span style={{ color: "white", fontSize: "0.65rem", fontWeight: 700 }}>{i+1}</span>
                            </div>
                            <div style={{ paddingTop: "2px", flex: 1 }}>
                              <p style={{ fontSize: "0.82rem", color: NAVY.text, margin: 0, lineHeight: 1.45 }}>
                                {step.instruction || (linea ? `Tomar ${linea.name ?? linea.nameShort}` : "Continuar")}
                              </p>
                              {linea && (
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "4px",
                                  background: linea.color ? linea.color+"22" : NAVY.surface2,
                                  border: `1px solid ${linea.color ?? NAVY.border}`,
                                  borderRadius: "20px", padding: "2px 8px" }}>
                                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: linea.color ?? NAVY.lightBlue }}>
                                    {linea.nameShort ?? linea.name}
                                  </span>
                                  {linea.vehicle?.type && (
                                    <span style={{ fontSize: "0.68rem", color: NAVY.muted }}>· {linea.vehicle.type}</span>
                                  )}
                                </div>
                              )}
                              {step.transitDetails?.headsign && (
                                <p style={{ fontSize: "0.72rem", color: NAVY.text2, margin: "2px 0 0" }}>
                                  Dirección: {step.transitDetails.headsign}
                                </p>
                              )}
                              <p style={{ fontSize: "0.72rem", color: NAVY.muted, margin: "2px 0 0" }}>
                                {stepDuration(step.duration)} · {fmtDist(step.distanceMeters)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
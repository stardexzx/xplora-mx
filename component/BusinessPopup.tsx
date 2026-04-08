"use client";

import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { Negocio } from "../types/negocio";
import { useLang } from "../context/LangContext";

interface Props {
  negocio: Negocio;
  onClose: () => void;
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

// ── Tokens de color (paleta Coppel oscura) ──────────────────────────────────
const C = {
  bg:        "#020c1f",
  surface:   "#0a1628",
  surface2:  "#111e36",
  border:    "rgba(28,66,232,0.3)",
  text:      "#ffffff",
  text2:     "rgba(255,255,255,0.7)",
  muted:     "rgba(255,255,255,0.42)",
  blue:      "#1C42E8",
  blueA:     "rgba(28,66,232,0.18)",
  blueLight: "#1CA8F7",
  yellow:    "#F0D224",
  danger:    "#FF594D",
};

function StarRating({ value, size = 10 }: { value: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24"
          fill={s <= Math.round(value) ? C.yellow : "rgba(255,255,255,0.15)"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

type Tab = "info" | "reviews";

export default function BusinessPopup({ negocio, onClose }: Props) {
  const { t } = useLang();
  const [imgIndex, setImgIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("info");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const images = negocio.images?.length
    ? negocio.images
    : negocio.image_url ? [negocio.image_url] : [];

  const tags = negocio.tags
    ? negocio.tags.split(",").map(t => t.trim()).filter(Boolean)
    : [];

  // Parsear horario JSON o mostrarlo como texto plano
  const renderHours = () => {
    if (!negocio.opening_hours) return null;
    try {
      const sched = JSON.parse(negocio.opening_hours);
      const days = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {days.map(day => {
            const d = sched[day];
            if (!d) return null;
            return (
              <div key={day} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: C.text2, minWidth: "90px" }}>{day}</span>
                <span style={{ color: d.open ? C.text : C.muted, fontWeight: d.open ? 500 : 400 }}>
                  {d.open ? `${d.from} – ${d.to}` : "Cerrado"}
                </span>
              </div>
            );
          })}
        </div>
      );
    } catch {
      return <span style={{ color: C.text2 }}>{negocio.opening_hours}</span>;
    }
  };

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
  }, [tab, negocio.id]);

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
    flex: 1, padding: "10px 0", fontSize: "0.8rem", fontWeight: active ? 700 : 500,
    color: active ? C.blueLight : C.muted,
    background: "none", border: "none",
    borderBottom: `2px solid ${active ? C.blueLight : "transparent"}`,
    cursor: "pointer", transition: "all 0.15s",
    fontFamily: "inherit",
  });

  const popupStyle: React.CSSProperties = isMobile ? {
    position: "fixed", bottom: 0, left: 0, right: 0, width: "100%",
    background: C.bg,
    borderRadius: "20px 20px 0 0",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
    border: `1px solid ${C.border}`,
    borderBottom: "none",
    overflow: "hidden", zIndex: 500,
    display: "flex", flexDirection: "column",
    maxHeight: "82vh",
  } : {
    position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)",
    width: "min(440px, calc(100vw - 48px))",
    background: C.bg,
    borderRadius: "20px",
    boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
    border: `1px solid ${C.border}`,
    overflow: "hidden", zIndex: 500,
    display: "flex", flexDirection: "column",
    maxHeight: "calc(100vh - 120px)",
  };

  return (
    <>
      {isMobile && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 499, backdropFilter: "blur(2px)",
        }} />
      )}

      <div className="animate-slide-up" style={popupStyle}>

        {/* Drag handle móvil */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: C.border }} />
          </div>
        )}

        {/* ── Imagen ── */}
        <div style={{ position: "relative", height: isMobile ? "160px" : "190px", background: C.surface2, flexShrink: 0 }}>
          {images.length > 0 ? (
            <img src={images[imgIndex]} alt={negocio.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}

          {/* Flechas carrusel */}
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIndex(i => (i-1+images.length)%images.length)}
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
                  width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer",
                  background: "rgba(2,12,31,0.7)", color: C.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button onClick={() => setImgIndex(i => (i+1)%images.length)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                  width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer",
                  background: "rgba(2,12,31,0.7)", color: C.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "4px" }}>
                {images.map((_, i) => (
                  <div key={i} onClick={() => setImgIndex(i)}
                    style={{ width: i === imgIndex ? 16 : 6, height: 6, borderRadius: 3,
                      background: i === imgIndex ? C.blueLight : "rgba(255,255,255,0.5)",
                      cursor: "pointer", transition: "width 0.2s" }} />
                ))}
              </div>
            </>
          )}

          {/* Botón cerrar */}
          <button onClick={onClose}
            style={{ position: "absolute", top: "10px", right: "10px",
              width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer",
              background: "rgba(2,12,31,0.75)", color: C.text,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Badge categoría */}
          <div style={{ position: "absolute", top: "10px", left: "10px",
            background: C.blueA, border: `1px solid ${C.border}`,
            backdropFilter: "blur(6px)",
            borderRadius: "20px", padding: "4px 10px",
            fontSize: "0.72rem", fontWeight: 600, color: C.blueLight }}>
            {CAT_LABELS[negocio.category] ?? negocio.category}
          </div>
        </div>

        {/* ── Header ── */}
        <div style={{ padding: "14px 18px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: C.text, lineHeight: 1.3, margin: 0 }}>
              {negocio.name}
            </h3>
            {negocio.rating != null && negocio.rating > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, marginLeft: "8px" }}>
                <StarRating value={negocio.rating} />
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.yellow }}>
                  {negocio.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, margin: "10px 18px 0", flexShrink: 0 }}>
          <button style={tabStyle(tab === "info")} onClick={() => setTab("info")}>Información</button>
          <button style={tabStyle(tab === "reviews")} onClick={() => setTab("reviews")}>
            Reseñas{tab === "reviews" && reviews.length > 0 ? ` (${reviews.length})` : ""}
          </button>
        </div>

        {/* ── Contenido scrollable ── */}
        <div style={{ overflowY: "auto", padding: "14px 18px 18px", flex: 1 }}>

          {/* TAB INFO */}
          {tab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {negocio.description && (
                <p style={{ fontSize: "0.85rem", color: C.text2, lineHeight: 1.6, margin: 0 }}>
                  {negocio.description}
                </p>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {tags.map(tag => (
                    <span key={tag} style={{
                      padding: "3px 10px", borderRadius: "20px",
                      fontSize: "0.75rem", fontWeight: 500,
                      background: C.blueA, color: C.blueLight,
                      border: `1px solid ${C.border}`,
                    }}>{tag}</span>
                  ))}
                </div>
              )}

              {/* Horario */}
              {negocio.opening_hours && (
                <div style={{ background: C.surface, borderRadius: "10px", padding: "10px 12px", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.blueLight} strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.blueLight, textTransform: "uppercase", letterSpacing: "0.04em" }}>Horario</span>
                  </div>
                  {renderHours()}
                </div>
              )}

              {/* Teléfono */}
              {negocio.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.83rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blueLight} strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  <a href={`tel:${negocio.phone}`} style={{ color: C.text, textDecoration: "none", fontWeight: 500 }}>
                    {negocio.phone}
                  </a>
                </div>
              )}

              {/* Sitio web */}
              {negocio.website && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.83rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blueLight} strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                  </svg>
                  <a href={negocio.website.startsWith("http") ? negocio.website : `https://${negocio.website}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: C.blueLight, textDecoration: "none", fontWeight: 500,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "270px" }}>
                    {negocio.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              {/* Distancia */}
              {negocio.distancia_km !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: C.muted, fontSize: "0.82rem" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {negocio.distancia_km.toFixed(1)} km de distancia
                </div>
              )}

              {/* Botón Cómo llegar */}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${negocio.lat},${negocio.lng}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "11px", borderRadius: "12px", marginTop: "4px",
                  background: C.blue, color: "#fff",
                  textDecoration: "none", fontWeight: 600, fontSize: "0.88rem",
                  boxShadow: "0 4px 16px rgba(28,66,232,0.4)",
                  transition: "background 0.2s",
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12h18M13 6l6 6-6 6"/>
                </svg>
                Cómo llegar
              </a>
            </div>
          )}

          {/* TAB RESEÑAS */}
          {tab === "reviews" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {reviewMsg && (
                <div style={{ background: "rgba(28,168,247,0.08)", border: `1px solid rgba(28,168,247,0.25)`,
                  borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem", color: C.blueLight }}>
                  {reviewMsg}
                </div>
              )}

              {!showWriteReview ? (
                <button onClick={() => setShowWriteReview(true)} style={{
                  width: "100%", padding: "10px", borderRadius: "12px", cursor: "pointer",
                  border: `1.5px solid ${C.border}`, background: C.surface,
                  color: C.text2, fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 500,
                  transition: "border-color 0.2s, color 0.2s",
                }}>
                  ✏️ Escribir una reseña
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px",
                  background: C.surface, borderRadius: "12px", padding: "12px",
                  border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, color: C.text2, margin: 0 }}>Tu calificación</p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                        <svg width="26" height="26" viewBox="0 0 24 24"
                          fill={s <= (hoverRating || rating) ? C.yellow : "rgba(255,255,255,0.1)"}
                          stroke={C.yellow} strokeWidth="1.5">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                  <textarea placeholder="Comparte tu experiencia..." rows={3}
                    value={comment} onChange={e => setComment(e.target.value)}
                    style={{
                      resize: "none", fontSize: "0.85rem", fontFamily: "inherit",
                      padding: "8px 12px", borderRadius: "8px",
                      background: C.surface2, color: C.text,
                      border: `1.5px solid ${C.border}`, outline: "none",
                    }} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={submitReview} disabled={submitting} style={{
                      flex: 1, padding: "10px", borderRadius: "10px", border: "none",
                      background: C.blue, color: "#fff", fontWeight: 600,
                      fontFamily: "inherit", fontSize: "0.88rem", cursor: "pointer",
                      opacity: submitting ? 0.7 : 1,
                    }}>
                      {submitting ? "Enviando..." : "Publicar"}
                    </button>
                    <button onClick={() => setShowWriteReview(false)} style={{
                      padding: "10px 16px", borderRadius: "10px", cursor: "pointer",
                      border: `1.5px solid ${C.border}`, background: "transparent",
                      color: C.text2, fontFamily: "inherit", fontSize: "0.85rem",
                    }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {loadingReviews ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: "0.85rem" }}>
                  Cargando reseñas...
                </div>
              ) : reviews.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: C.muted }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                    style={{ opacity: 0.3, display: "block", margin: "0 auto 8px" }}>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <p style={{ fontSize: "0.85rem", margin: 0 }}>Aún no hay reseñas. ¡Sé el primero!</p>
                </div>
              ) : reviews.map(review => (
                <div key={review.id} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <StarRating value={review.rating} size={12} />
                    <span style={{ fontSize: "0.75rem", color: C.muted }}>
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.comment && (
                    <p style={{ fontSize: "0.84rem", color: C.text, lineHeight: 1.5, margin: "4px 0 0" }}>
                      {review.comment}
                    </p>
                  )}
                  {review.reply && (
                    <div style={{ marginTop: "8px", background: C.surface, borderRadius: "8px",
                      padding: "8px 10px", borderLeft: `3px solid ${C.blue}` }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: C.blueLight, margin: "0 0 2px" }}>
                        Respuesta del negocio
                      </p>
                      <p style={{ fontSize: "0.82rem", color: C.text2, margin: 0, lineHeight: 1.45 }}>
                        {review.reply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
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

function StarRating({ value, size = 10 }: { value: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= Math.round(value) ? "#222" : "#ddd"}>
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
    : negocio.image_url
    ? [negocio.image_url]
    : [];

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
    color: active ? "var(--text)" : "var(--text2)",
    background: "none", border: "none",
    borderBottom: `2px solid ${active ? "var(--text)" : "transparent"}`,
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <>
      {/* Backdrop en móvil */}
      {isMobile && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
          zIndex: 499, backdropFilter: "blur(2px)",
        }} />
      )}
    <div
      className="animate-slide-up"
      style={isMobile ? {
        position: "fixed", bottom: 0, left: 0, right: 0,
        width: "100%",
        background: "white", borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        overflow: "hidden", zIndex: 500,
        display: "flex", flexDirection: "column",
        maxHeight: "82vh",
      } : {
        position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        width: "min(440px, calc(100vw - 48px))",
        background: "white", borderRadius: "var(--radius-xl)",
        boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
        overflow: "hidden", zIndex: 500,
        display: "flex", flexDirection: "column",
        maxHeight: "calc(100vh - 120px)",
      }}
    >
      {/* Drag handle visible solo en móvil */}
      {isMobile && (
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "var(--border)" }} />
        </div>
      )}
      {/* ── Imagen ── */}
      <div style={{ position: "relative", height: isMobile ? "160px" : "190px", background: "var(--surface2)", flexShrink: 0 }}>
        {images.length > 0 ? (
          <img src={images[imgIndex]} alt={negocio.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button onClick={() => setImgIndex(i => (i-1+images.length)%images.length)}
              className="btn-icon" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "32px", height: "32px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={() => setImgIndex(i => (i+1)%images.length)}
              className="btn-icon" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "32px", height: "32px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "4px" }}>
              {images.map((_, i) => (
                <div key={i} onClick={() => setImgIndex(i)}
                  style={{ width: i === imgIndex ? 16 : 6, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.9)", cursor: "pointer", transition: "width 0.2s" }} />
              ))}
            </div>
          </>
        )}
        <button onClick={onClose} className="btn-icon"
          style={{ position: "absolute", top: "10px", right: "10px", width: "32px", height: "32px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div style={{ position: "absolute", top: "10px", left: "10px", background: "white", borderRadius: "20px", padding: "4px 10px", fontSize: "0.72rem", fontWeight: 600, color: "var(--text)" }}>
          {CAT_LABELS[negocio.category] ?? negocio.category}
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{ padding: "14px 18px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.3, margin: 0 }}>
            {negocio.name}
          </h3>
          {negocio.rating != null && negocio.rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, marginLeft: "8px" }}>
              <StarRating value={negocio.rating} />
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>
                {negocio.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", margin: "10px 18px 0", flexShrink: 0 }}>
        <button style={tabStyle(tab === "info")} onClick={() => setTab("info")}>Información</button>
        <button style={tabStyle(tab === "reviews")} onClick={() => setTab("reviews")}>
          Reseñas{tab === "reviews" && reviews.length > 0 ? ` (${reviews.length})` : ""}
        </button>
      </div>

      {/* ── Contenido scrollable ── */}
      <div style={{ overflowY: "auto", padding: "14px 18px 18px", flex: 1 }}>

        {/* TAB INFO */}
        {tab === "info" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {negocio.description && (
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.55, margin: 0 }}>
                {negocio.description}
              </p>
            )}

            {tags.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {tags.map(tag => <span key={tag} className="badge badge-gray">{tag}</span>)}
              </div>
            )}

            {negocio.opening_hours && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.83rem", color: "var(--text2)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{negocio.opening_hours}</span>
              </div>
            )}

            {negocio.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.83rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                <a href={`tel:${negocio.phone}`} style={{ color: "var(--text)", textDecoration: "none", fontWeight: 500 }}>
                  {negocio.phone}
                </a>
              </div>
            )}

            {negocio.website && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.83rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                <a href={negocio.website.startsWith("http") ? negocio.website : `https://${negocio.website}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--text)", textDecoration: "none", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "270px" }}>
                  {negocio.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}

            {negocio.distancia_km !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)", fontSize: "0.82rem" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {negocio.distancia_km.toFixed(1)} km de distancia
              </div>
            )}

            <a href={`https://www.google.com/maps/dir/?api=1&destination=${negocio.lat},${negocio.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-primary" style={{ textDecoration: "none", justifyContent: "center", marginTop: "4px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M13 6l6 6-6 6"/></svg>
              Cómo llegar
            </a>
          </div>
        )}

        {/* TAB RESEÑAS */}
        {tab === "reviews" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {reviewMsg && (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: "0.82rem", color: "#16a34a" }}>
                {reviewMsg}
              </div>
            )}

            {!showWriteReview ? (
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setShowWriteReview(true)}>
                ✏️ Escribir una reseña
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "var(--surface)", borderRadius: "var(--radius)", padding: "12px" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text2)", margin: 0 }}>Tu calificación</p>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRating(s)}
                      onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                      <svg width="26" height="26" viewBox="0 0 24 24"
                        fill={s <= (hoverRating || rating) ? "#222" : "none"} stroke="#222" strokeWidth="1.5">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </button>
                  ))}
                </div>
                <textarea className="input" placeholder="Comparte tu experiencia..." rows={3}
                  value={comment} onChange={e => setComment(e.target.value)}
                  style={{ resize: "none", fontSize: "0.85rem" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={submitReview} disabled={submitting}>
                    {submitting ? "Enviando..." : "Publicar"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowWriteReview(false)}>Cancelar</button>
                </div>
              </div>
            )}

            {loadingReviews ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text2)", fontSize: "0.85rem" }}>
                Cargando reseñas...
              </div>
            ) : reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text2)" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{ opacity: 0.3, display: "block", margin: "0 auto 8px" }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <p style={{ fontSize: "0.85rem", margin: 0 }}>Aún no hay reseñas. ¡Sé el primero!</p>
              </div>
            ) : reviews.map(review => (
              <div key={review.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <StarRating value={review.rating} size={12} />
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    {formatDate(review.created_at)}
                  </span>
                </div>
                {review.comment && (
                  <p style={{ fontSize: "0.84rem", color: "var(--text)", lineHeight: 1.5, margin: "4px 0 0" }}>
                    {review.comment}
                  </p>
                )}
                {review.reply && (
                  <div style={{ marginTop: "8px", background: "var(--surface)", borderRadius: "var(--radius-sm)", padding: "8px 10px", borderLeft: "3px solid var(--border)" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text2)", margin: "0 0 2px" }}>
                      Respuesta del negocio
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "var(--text)", margin: 0, lineHeight: 1.45 }}>
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

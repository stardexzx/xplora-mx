"use client";

import { useState, useEffect } from "react";
import { supabase, getMenusByNegocio } from "../services/supabase";
import { Negocio, Menu } from "../types/negocio";
import { useLang } from "../context/LangContext";
import { LatLng } from "../services/geo";
import { TravelMode, RouteRequest } from "./Map";
import type { RouteResult } from "../app/api/route/route";
import { useTranslatedNegocios } from "../hooks/useTranslatedNegocios";
import { useTranslatedMenus } from "../hooks/useTranslatedMenus";
import { useExchangeRate } from "../hooks/useExchangeRate";

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

function StarRating({ value, size = 10 }: { value: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24"
          fill={s <= Math.round(value) ? "#F0D224" : "rgba(255,255,255,0.15)"}
          stroke={s <= Math.round(value) ? "#F0D224" : "rgba(255,255,255,0.2)"}
          strokeWidth="1">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

const NAVY = {
  bg: "#03112a",
  surface: "#04193d",
  surface2: "#061f4a",
  border: "rgba(28, 66, 232, 0.25)",
  text: "#ffffff",
  text2: "rgba(255,255,255,0.72)",
  muted: "rgba(255,255,255,0.38)",
  blue: "#1C42E8",
  lightBlue: "#1CA8F7",
  yellow: "#F0D224",
  danger: "#FF594D",
};

export default function BusinessPopup({ negocio, onClose, userLocation, onRouteRequest, routeResult }: Props) {
  const { t, lang } = useLang(); 
  const translatedNegocio = useTranslatedNegocios([negocio], lang)[0];
  const [imgIndex, setImgIndex] = useState(0);
  const [tab, setTab] = useState<"info" | "reviews" | "ruta">("info");
  const [travelMode, setTravelMode] = useState<TravelMode>("TRANSIT");
  const [routeRequested, setRouteRequested] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [isMobile, setIsMobile] = useState(false);
  
  // Estados para menú modal
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menus, setMenus] = useState<Menu[]>([]);
  const translatedMenus = useTranslatedMenus(menus, lang);
  const { rate: usdRate } = useExchangeRate("MXN", "USD");
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);

  const formatUsd = (mxn: number) => {
    const rate = usdRate ?? 18.5;
    return (mxn / rate).toFixed(2);
  };

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

  const formatDate = (iso: string) => {
    const locale = lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-MX";
    return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  };

  const images = negocio.images?.length
    ? negocio.images
    : negocio.image_url ? [negocio.image_url] : [];

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

  const loadMenus = async () => {
    setLoadingMenus(true);
    try {
      const data = await getMenusByNegocio(negocio.id);
      setMenus(data);
      if (data.length > 0) {
        setExpandedMenuId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading menus:", error);
      setMenus([]);
    }
    setLoadingMenus(false);
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
    if (!userData.user) { 
      setReviewMsg(t.loginRequired); 
      return; 
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert([{
      negocio_id: negocio.id, user_id: userData.user.id, rating, comment,
    }]);
    setSubmitting(false);
    if (error) {
      setReviewMsg(t.reviewError); 
    } else {
      setReviewMsg(t.createSuccess); 
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
      {isMobile && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 499, backdropFilter: "blur(3px)",
        }} />
      )}

      <div className="animate-slide-up" style={isMobile ? {
          position: "fixed", bottom: 0, left: 0, right: 0, width: "100%",
          background: NAVY.bg, borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(2,8,20,0.8)", border: `1px solid ${NAVY.border}`,
          borderBottom: "none", overflow: "hidden", zIndex: 500,
          display: "flex", flexDirection: "column", maxHeight: "82vh",
        } : {
          position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          width: "min(440px, calc(100vw - 48px))", background: NAVY.bg,
          borderRadius: "20px", boxShadow: "0 12px 48px rgba(2,8,20,0.8)",
          border: `1px solid ${NAVY.border}`, overflow: "hidden", zIndex: 500,
          display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 120px)",
        }}>
        
        <div style={{ position: "relative", height: isMobile ? "160px" : "190px", background: NAVY.surface2, flexShrink: 0 }}>
          {images.length > 0 ? (
            <img src={images[imgIndex]} alt={negocio.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={NAVY.border} strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}

          <div style={{
            position: "absolute", top: "10px", left: "10px",
            background: "rgba(3,17,42,0.75)", backdropFilter: "blur(4px)",
            borderRadius: "20px", padding: "4px 10px", fontSize: "0.72rem",
            fontWeight: 600, color: NAVY.text, border: `1px solid ${NAVY.border}`
          }}>
            {/* Categoría traducida por el hook useTranslatedNegocios */}
            {translatedNegocio.category}
          </div>
          
          <button onClick={onClose} style={{
              position: "absolute", top: "10px", right: "10px",
              width: "32px", height: "32px", borderRadius: "50%", border: "none", cursor: "pointer",
              background: "rgba(3,17,42,0.75)", color: NAVY.text,
              display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)"
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ padding: "14px 18px 0", flexShrink: 0 }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: NAVY.text, margin: 0 }}>{negocio.name}</h3>
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${NAVY.border}`, margin: "10px 18px 0", flexShrink: 0 }}>
          {/* Usamos fallbacks por si las llaves no existen en BASE_ES */}
          <button style={tabStyle(tab === "info")} onClick={() => setTab("info")}>
            {t.infoTab}
          </button>
          <button style={tabStyle(tab === "reviews")} onClick={() => setTab("reviews")}>
            {t.reviewsTab}
          </button>
          <button style={tabStyle(tab === "ruta")} onClick={() => setTab("ruta")}>
            🗺 {t.routeTab}
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "14px 18px 18px", flex: 1 }}>
          {tab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Descripción traducida por el hook useTranslatedNegocios */}
              <p style={{ fontSize: "0.85rem", color: NAVY.text2, lineHeight: 1.55, margin: 0 }}>
                {translatedNegocio.description}
              </p>
              
              {translatedNegocio.opening_hours && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.83rem", color: NAVY.text2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NAVY.lightBlue} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{translatedNegocio.opening_hours}</span>
                </div>
              )}

              <a href={`https://www.google.com/maps/dir/?api=1&destination=${negocio.lat},${negocio.lng}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  marginTop: "4px", padding: "11px 20px", borderRadius: "999px",
                  background: NAVY.blue, color: "#fff", textDecoration: "none",
                  fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 20px rgba(28,66,232,0.35)"
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M13 6l6 6-6 6" /></svg>
                {t.search}
              </a>

              <button onClick={() => { setShowMenuModal(true); loadMenus(); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  marginTop: "8px", width: "100%", padding: "11px 20px", borderRadius: "999px",
                  background: "rgba(240, 210, 36, 0.12)", color: NAVY.yellow, border: `1.5px solid rgba(240, 210, 36, 0.4)`,
                  fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.875rem",
                  cursor: "pointer", transition: "all 0.18s",
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16v12H4z"/><path d="M4 4L2 2m20 0l2-2m-9 16v4m-4 0h8"/></svg>
                 {t.viewMenu}
              </button>
            </div>
          )}

          {tab === "reviews" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {reviewMsg && (
                <div style={{ background: "rgba(28,168,247,0.1)", padding: "8px", borderRadius: "8px", color: NAVY.lightBlue, fontSize: "0.8rem" }}>
                  {reviewMsg}
                </div>
              )}
              
              {!showWriteReview ? (
                <button onClick={() => setShowWriteReview(true)} style={{
                    width: "100%", padding: "10px", borderRadius: "999px",
                    border: `1.5px solid ${NAVY.border}`, background: "transparent", color: NAVY.text2,
                    fontWeight: 600, cursor: "pointer"
                  }}>
                  {t.rate}
                </button>
              ) : (
                <div style={{ background: NAVY.surface, padding: "14px", borderRadius: "14px", border: `1px solid ${NAVY.border}` }}>
                  {/* Star picker */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px", justifyContent: "center" }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          fontSize: "1.6rem",
                          cursor: "pointer",
                          color: star <= (hoverRating || rating) ? "#f59e0b" : NAVY.muted,
                          transition: "color 0.15s, transform 0.1s",
                          transform: star <= (hoverRating || rating) ? "scale(1.2)" : "scale(1)",
                          display: "inline-block",
                          userSelect: "none",
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <textarea 
                    placeholder={t.commentPlaceholder} 
                    value={comment} 
                    onChange={e => setComment(e.target.value)}
                    style={{ 
                      width: "100%", background: NAVY.surface2, color: "#fff", padding: "10px", 
                      borderRadius: "8px", border: `1px solid ${NAVY.border}`, resize: "none",
                      fontFamily: "inherit" 
                    }}
                    rows={3}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button onClick={submitReview} disabled={submitting} style={{ flex: 1, background: NAVY.blue, color: "#fff", padding: "10px", borderRadius: "999px", border: "none", fontWeight: 600, opacity: submitting ? 0.6 : 1 }}>
                      {submitting ? t.searching : t.send}
                    </button>
                    <button onClick={() => setShowWriteReview(false)} style={{ flex: 1, background: "transparent", color: "#fff", border: `1px solid ${NAVY.border}`, borderRadius: "999px", fontWeight: 600 }}>
                      {t.cancel}
                    </button>
                  </div>
                </div>
              )}

              {loadingReviews ? <div style={{ color: NAVY.muted, textAlign: "center" }}>{t.loading}</div> : reviews.length === 0 ? (
                <div style={{ color: NAVY.muted, textAlign: "center", fontSize: "0.85rem", padding: "20px" }}>
                  {t.noReviews}
                </div>
              ) : reviews.map(review => (
                <div key={review.id} style={{ borderBottom: `1px solid ${NAVY.border}`, padding: "10px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <StarRating value={review.rating} />
                    <span style={{ color: NAVY.muted, fontSize: "0.75rem" }}>{formatDate(review.created_at)}</span>
                  </div>
                  <p style={{ fontSize: "0.85rem", marginTop: "5px", color: NAVY.text }}>{review.comment}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "ruta" && (
            <div style={{ textAlign: "center", color: NAVY.muted, padding: "20px" }}>
              {!userLocation ? (
                <div style={{ color: NAVY.danger, fontSize: "0.85rem" }}>{t.loginRequired}</div>
              ) : (
                <div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "12px" }}>
                    {t.selectTransport}
                  </div>
                  {/* Botones de modo de transporte */}
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
                    {(["TRANSIT", "WALKING", "DRIVING"] as TravelMode[]).map((mode) => {
                      const icons: Record<TravelMode, string> = { TRANSIT: "🚌", WALKING: "🚶", DRIVING: "🚗" };
                      const labels: Record<TravelMode, string> = { TRANSIT: "Transporte", WALKING: "Caminando", DRIVING: "En auto" };
                      const colors: Record<TravelMode, string> = { TRANSIT: "#1a73e8", WALKING: "#34a853", DRIVING: "#ea4335" };
                      const isActive = travelMode === mode && routeRequested;
                      return (
                        <button
                          key={mode}
                          onClick={() => requestRoute(mode)}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            gap: "4px", padding: "10px 14px", borderRadius: "12px", border: "none",
                            cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                            background: isActive ? colors[mode] : NAVY.surface2,
                            color: isActive ? "#fff" : NAVY.text2,
                            transition: "all 0.2s",
                          }}
                        >
                          <span style={{ fontSize: "1.4rem" }}>{icons[mode]}</span>
                          {labels[mode]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Resultado de la ruta */}
                  {routeResult && routeRequested && (
                    <div style={{ textAlign: "left", fontSize: "0.8rem", color: NAVY.text2, marginTop: "8px" }}>
                      <div style={{ marginBottom: "8px", fontWeight: 700, color: NAVY.text, fontSize: "0.9rem" }}>
                        📍 {Math.round(routeResult.distanceMeters / 100) / 10} km ·{" "}
                        {Math.round(routeResult.durationSeconds / 60)} min
                      </div>
                      {routeResult.steps.map((step, i) => (
                        <div key={i} style={{ padding: "5px 0", borderBottom: `1px solid ${NAVY.border}`, lineHeight: 1.4 }}>
                          {step.instruction}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL DE VER MENÚ ─────────────────────────────────────────┐ */}
      {showMenuModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: "16px"
        }} onClick={() => setShowMenuModal(false)}>
          <div style={{
            background: NAVY.bg, border: `1px solid ${NAVY.border}`, borderRadius: "16px",
            maxWidth: "500px", width: "100%", maxHeight: "80vh", overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Encabezado del modal */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px", borderBottom: `1px solid ${NAVY.border}`
            }}>
              <h2 style={{ margin: 0, color: NAVY.text, fontSize: "1.2rem", fontWeight: 700 }}>
                📋 {negocio.name}
              </h2>
              <button onClick={() => setShowMenuModal(false)} 
                style={{
                  background: "none", border: "none", color: NAVY.muted, cursor: "pointer",
                  fontSize: "1.5rem", padding: "0", width: "32px", height: "32px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "color 0.18s"
                }} onMouseEnter={(e) => e.currentTarget.style.color = NAVY.lightBlue}
                onMouseLeave={(e) => e.currentTarget.style.color = NAVY.muted}>
                ✕
              </button>
            </div>

            {/* Contenido del modal */}
            <div style={{ padding: "20px" }}>
              {loadingMenus ? (
                <div style={{ textAlign: "center", color: NAVY.muted, padding: "40px 20px" }}>
                  <p>{t.loadingMenu}</p>
                </div>
              ) : translatedMenus.length === 0 ? (
                <div style={{ textAlign: "center", color: NAVY.muted, padding: "40px 20px" }}>
                  <p>{t.menuUnavailable}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {translatedMenus.map((menu) => (
                    <div key={menu.id} style={{ border: `1px solid ${NAVY.border}`, borderRadius: "8px", overflow: "hidden" }}>
                      
                      {/* Encabezado del menú */}
                      <button onClick={() => setExpandedMenuId(expandedMenuId === menu.id ? null : menu.id)}
                        style={{
                          width: "100%", border: "none",
                          padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center",
                          justifyContent: "space-between", background: NAVY.surface, transition: "background 0.18s"
                        }} onMouseEnter={(e) => e.currentTarget.style.background = NAVY.surface2}
                        onMouseLeave={(e) => e.currentTarget.style.background = NAVY.surface}>
                        <div style={{ textAlign: "left" }}>
                          <p style={{ margin: 0, color: NAVY.text, fontWeight: 600, fontSize: "0.95rem" }}>
                            🍽️ {menu.name}
                          </p>
                          {menu.description && (
                            <p style={{ margin: "4px 0 0", color: NAVY.muted, fontSize: "0.8rem" }}>
                              {menu.description}
                            </p>
                          )}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY.lightBlue} strokeWidth="2"
                          style={{ flexShrink: 0, transition: "transform 0.18s", 
                            transform: expandedMenuId === menu.id ? "rotate(180deg)" : "rotate(0deg)" }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>

                      {/* Contenido expandible del menú */}
                      {expandedMenuId === menu.id && menu.menu_categories && menu.menu_categories.length > 0 && (
                        <div style={{ background: NAVY.bg, borderTop: `1px solid ${NAVY.border}`, padding: "12px" }}>
                          {menu.menu_categories.map((category) => (
                            <div key={category.id} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: `1px solid ${NAVY.border}` }}>
                              
                              {/* Categoría */}
                              <p style={{ margin: 0, color: NAVY.yellow, fontWeight: 600, fontSize: "0.9rem", marginBottom: "8px" }}>
                                📌 {category.name}
                              </p>

                              {/* Ítems de la categoría */}
                              {category.menu_items && category.menu_items.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {category.menu_items.map((item) => (
                                    <div key={item.id} style={{
                                      display: "flex", gap: "12px", padding: "8px",
                                      background: NAVY.surface, borderRadius: "6px", alignItems: "flex-start"
                                    }}>
                                      {/* Imagen del item */}
                                      {item.image_url && (
                                        <img src={item.image_url} alt={item.name} style={{
                                          width: "50px", height: "50px", borderRadius: "4px", 
                                          objectFit: "cover", flexShrink: 0
                                        }} />
                                      )}
                                      
                                      {/* Info del item */}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                          <p style={{ margin: 0, color: NAVY.text, fontWeight: 500, fontSize: "0.85rem" }}>
                                            {item.name}
                                          </p>
                                          {item.price != null && (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                              <span style={{ color: NAVY.yellow, fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                                                ${item.price.toFixed(2)} MXN
                                              </span>
                                              <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.72rem", marginTop: "2px" }}>
                                                US$ {formatUsd(item.price)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        {item.description && (
                                          <p style={{ margin: "4px 0 0", color: NAVY.muted, fontSize: "0.75rem", lineHeight: 1.3 }}>
                                            {item.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ margin: "0 8px", color: NAVY.muted, fontSize: "0.8rem", fontStyle: "italic" }}>
                                  {t.noMenuItems}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
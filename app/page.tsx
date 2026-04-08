"use client";
import ChatbotWidget from "../component/ChatbotWidget";
import { useEffect, useState, useCallback } from "react";
import BusinessMap from "../component/Map";
import BusinessPopup from "../component/BusinessPopup";
import { CATEGORIES, CATEGORY_LABELS_ES } from "../component/CategoryFilter";
import { supabase } from "../services/supabase";
import { interpretQuery } from "../services/ia";
import { translateText } from "../services/translate";
import { getUserLocation, getDistanceKm, LatLng } from "../services/geo";
import { useLang, interpolate } from "../context/LangContext";
import { Negocio } from "../types/negocio";
import { useTranslatedNegocios } from "../hooks/useTranslatedNegocios";
import "./Home.css";

const RADIO_KM = 5;

const LANGUAGES = [
  { code: "es", flag: "MX" },
  { code: "en", flag: "EN" },
  { code: "pt", flag: "PT" },
  { code: "fr", flag: "FR" },
  { code: "de", flag: "DE" },
  { code: "ja", flag: "JA" },
  { code: "ko", flag: "KO" },
  { code: "ar", flag: "AR" },
];

const CAT_EMOJI: Record<string, string> = {
  comida: "🌮",
  tours: "🧭",
  hospedaje: "🏨",
  artesanias: "🏺",
  entretenimiento: "🎭",
};

// ── Calcula promedios desde reviews ─────────────────────────────────────────
async function fetchRatings(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("reviews")
    .select("negocio_id, rating");

  if (!data) return {};

  // Agrupa por negocio_id y calcula promedio
  const map: Record<string, { sum: number; count: number }> = {};
  for (const r of data) {
    if (!map[r.negocio_id]) map[r.negocio_id] = { sum: 0, count: 0 };
    map[r.negocio_id].sum += r.rating;
    map[r.negocio_id].count += 1;
  }

  const result: Record<string, number> = {};
  for (const [id, { sum, count }] of Object.entries(map)) {
    result[id] = Math.round((sum / count) * 10) / 10; // 1 decimal
  }
  return result;
}

// ── Star rating display ──────────────────────────────────────────────────────
function StarRating({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "1px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width="11" height="11" viewBox="0 0 24 24"
          fill={s <= Math.round(value) ? "#F0D224" : "rgba(255,255,255,0.15)"}
          stroke={s <= Math.round(value) ? "#F0D224" : "rgba(255,255,255,0.2)"}
          strokeWidth="1">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const { t, lang, setLang, ready } = useLang();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const negociosToShow = useTranslatedNegocios(negocios, lang);
  const [todosLosNegocios, setTodos] = useState<Negocio[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [selectedNegocio, setSelected] = useState<Negocio | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationError, setLocationError] = useState("");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>(CATEGORY_LABELS_ES);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [isMobile, setIsMobile] = useState(false);
  const [activeNav, setActiveNav] = useState<"mapa" | "asistente" | "negocio" | "perfil">("mapa");
  const [routeRequest, setRouteRequest] = useState<import("../component/Map").RouteRequest | null>(null);
  const [routeResult, setRouteResult] = useState<import("../app/api/route/route").RouteResult | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles").select("role").eq("id", data.user.id).single();
        setIsAdmin(profile?.role === "admin");
      }
    });
  }, []);

  // Carga negocios y ratings en paralelo
  useEffect(() => {
    Promise.all([
      supabase
        .from("negocios")
        .select("*, negocio_images(url, order_index)")
        .eq("status", "approved"),
      fetchRatings(),
    ]).then(([{ data, error }, ratingMap]) => {
      if (!error && data) {
        const enriched = data.map((n: any) => ({
          ...n,
          images: (n.negocio_images ?? [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((i: any) => i.url),
        })) as Negocio[];
        setTodos(enriched);
        setNegocios(enriched);
      }
      setRatings(ratingMap);
    });
  }, []);

  // Recarga ratings después de una nueva reseña
  const refreshRatings = useCallback(async () => {
    const ratingMap = await fetchRatings();
    setRatings(ratingMap);
  }, []);

  useEffect(() => {
    if (!ready || lang === "es") { setCategoryLabels(CATEGORY_LABELS_ES); return; }
    const texts = CATEGORIES.map((c) => CATEGORY_LABELS_ES[c.key]);
    fetch("/api/translateUI", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, lang }),
    })
      .then((r) => r.json())
      .then((data) => {
        const labels: Record<string, string> = {};
        CATEGORIES.forEach((c, i) => { labels[c.key] = data.translations[i] ?? CATEGORY_LABELS_ES[c.key]; });
        setCategoryLabels(labels);
      })
      .catch(() => setCategoryLabels(CATEGORY_LABELS_ES));
  }, [lang, ready]);

  const applyCategory = (all: Negocio[], cat: string) =>
    cat === "all" ? all : all.filter((n) =>
      n.category?.toLowerCase().includes(cat === "artesanias" ? "artesa" : cat)
    );

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setNegocios(applyCategory(todosLosNegocios, cat));
    setSelected(null);
  };

  const handleGetLocation = async () => {
    setLocationError("");
    try {
      const loc = await getUserLocation();
      setUserLocation(loc);
      const cercanos = applyCategory(todosLosNegocios, activeCategory)
        .filter((n) => n.lat && n.lng)
        .map((n) => ({ ...n, distancia_km: getDistanceKm(loc, { lat: n.lat, lng: n.lng }) }))
        .filter((n) => n.distancia_km! <= RADIO_KM)
        .sort((a, b) => a.distancia_km! - b.distancia_km!);
      setNegocios(cercanos);
      setNearbyOnly(true);
    } catch {
      setLocationError("No se pudo obtener la ubicación.");
    }
  };

  const handleShowAll = () => {
    setNegocios(applyCategory(todosLosNegocios, activeCategory));
    setNearbyOnly(false);
    setUserLocation(null);
  };

  const searchByText = async (text: string) => {
    setLoading(true);
    try {
      const translated = await translateText(text);
      const filters = await interpretQuery(translated);
      const hasFilters = filters.category || filters.tags?.length > 0;
      let resultados: Negocio[] = [];

      if (!hasFilters) {
        const { data } = await supabase
          .from("negocios").select("*, negocio_images(url, order_index)").eq("status", "approved")
          .or(`name.ilike.%${text}%,description.ilike.%${text}%,category.ilike.%${text}%`);
        resultados = (data ?? []).map((n: any) => ({
          ...n,
          images: (n.negocio_images ?? []).sort((a: any, b: any) => a.order_index - b.order_index).map((i: any) => i.url),
        }));
      } else {
        let qb = supabase.from("negocios").select("*, negocio_images(url, order_index)").eq("status", "approved");
        if (filters.category) qb = qb.ilike("category", `%${filters.category}%`);
        if (filters.tags?.length > 0) {
          for (const tag of filters.tags) qb = qb.ilike("tags", `%${tag}%`);
        }
        const { data } = await qb;
        resultados = (data ?? []).map((n: any) => ({
          ...n,
          images: (n.negocio_images ?? []).sort((a: any, b: any) => a.order_index - b.order_index).map((i: any) => i.url),
        }));
      }

      if (userLocation) {
        resultados = resultados
          .filter((n) => n.lat && n.lng)
          .map((n) => ({ ...n, distancia_km: getDistanceKm(userLocation, { lat: n.lat, lng: n.lng }) }))
          .filter((n) => n.distancia_km! <= RADIO_KM)
          .sort((a, b) => a.distancia_km! - b.distancia_km!);
      }

      setNegocios(resultados);
      setActiveCategory("all");
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => { if (!query) return; await searchByText(query); };

  const handleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert(t.voiceNotSupported); return; }
    const r = new SR();
    const vLangs: Record<string, string> = { es:"es-MX", en:"en-US", pt:"pt-BR", fr:"fr-FR", de:"de-DE", ja:"ja-JP", ko:"ko-KR", ar:"ar-SA" };
    r.lang = vLangs[lang] ?? "es-MX";
    setListening(true);
    r.start();
    r.onresult = async (e: any) => { const txt = e.results[0][0].transcript; setQuery(txt); setListening(false); await searchByText(txt); };
    r.onerror = () => setListening(false);
  };

  const fmtDist = (km?: number) => !km ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

  if (!ready)
    return (
      <div className="cp-loading">
        <div className="cp-loading__icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <p className="cp-loading__title">XploraMX</p>
        <p className="cp-loading__sub">{t.translating}</p>
      </div>
    );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="cp" style={{ height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* ══ HEADER ══ */}
        <header className="cp-header">
          <div className="cp-header__row">
            <div style={{ display:"flex", alignItems:"center", gap:"8px", flex:1 }}>
              <div className="cp-logo-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span className="cp-logo-text">
                Xplora<span className="cp-logo-badge">MX</span>
              </span>
            </div>

            <button className={`cp-ibtn${nearbyOnly ? " on" : ""}`} onClick={nearbyOnly ? handleShowAll : handleGetLocation} title="Cerca de mí">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </button>

            <div style={{ position:"relative" }}>
              <button className="cp-ibtn" onClick={() => { setShowLangMenu(!showLangMenu); setShowUserMenu(false); }}>
                {LANGUAGES.find((l) => l.code === lang)?.flag ?? "ES"}
              </button>
              {showLangMenu && (
                <div className="cp-drop" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2px", minWidth:"120px" }}>
                  {LANGUAGES.map((l) => (
                    <button key={l.code} className="cp-dbtn center"
                      style={{ color: l.code === lang ? "var(--light-blue)" : undefined }}
                      onClick={() => { setLang(l.code); setShowLangMenu(false); }}>
                      {l.flag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <div style={{ position:"relative" }}>
                <button className="cp-ibtn" onClick={() => { setShowUserMenu(!showUserMenu); setShowLangMenu(false); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="cp-drop">
                    {[
                      { label:"Mis negocios", href:"/mis-negocios" },
                      { label:"Registrar negocio", href:"/dashboard" },
                      ...(isAdmin ? [{ label:"Panel admin", href:"/admin" }] : []),
                    ].map((item) => (
                      <button key={item.href} className="cp-dbtn" onClick={() => { window.location.href = item.href; setShowUserMenu(false); }}>
                        {item.label}
                      </button>
                    ))}
                    <div style={{ height:"1px", background:"var(--border-solid)", margin:"4px 0" }} />
                    <button className="cp-dbtn danger" onClick={async () => { await supabase.auth.signOut(); location.reload(); }}>
                      {t.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="cp-ibtn" style={{ width:"auto", padding:"0 12px", borderRadius:"18px" }}
                onClick={() => (window.location.href = "/login")}>
                {t.login}
              </button>
            )}
          </div>

          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <div style={{ position:"relative", flex:1 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"
                style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input className="cp-search" value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t.searchPlaceholder} />
            </div>
            <button className={`cp-voice${listening ? " on" : ""}`} onClick={handleVoice}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>
          </div>
        </header>

        {/* ══ CATEGORY BAR ══ */}
        <div className="cp-catbar">
          <button className={`cp-pill${activeCategory === "all" ? " active" : ""}`} onClick={() => handleCategoryChange("all")}>
            🗺️ {categoryLabels["all"] ?? "Todos"}
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.key} className={`cp-pill${activeCategory === c.key ? " active" : ""}`} onClick={() => handleCategoryChange(c.key)}>
              {c.emoji} {categoryLabels[c.key]}
            </button>
          ))}
        </div>

        {locationError && (
          <div style={{ padding:"8px 16px", background:"rgba(239,68,68,0.1)", borderBottom:"1px solid rgba(239,68,68,0.2)", color:"var(--danger)", fontSize:"0.82rem", flexShrink:0 }}>
            {locationError}
          </div>
        )}

        {/* ══ BODY ══ */}
        <div style={{ display:"flex", flex:1, overflow:"hidden", flexDirection:"column" }}>

          {isMobile && (
            <div className="cp-tabs">
              {(["list", "map"] as const).map((v) => (
                <button key={v} className={`cp-tab${mobileView === v ? " active" : ""}`} onClick={() => setMobileView(v)}>
                  {v === "list" ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      Lista {negocios.length > 0 && `(${negocios.length})`}
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      Mapa
                    </>
                  )}
                </button>
              ))}
            </div>
          )}

          <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

            {/* ── LIST PANEL ── */}
            <div className="cp-list" style={{ display: isMobile && mobileView !== "list" ? "none" : "flex" }}>
              {nearbyOnly && (
                <div className="cp-nearby-banner">
                  {interpolate(t.nearbyCount, { n: negocios.length, km: RADIO_KM })}
                </div>
              )}

              {negocios.length === 0 ? (
                <div className="cp-empty">
                  <span style={{ fontSize:"2.5rem" }}>🔍</span>
                  <p style={{ fontSize:"0.9rem", fontWeight:600, color:"var(--text2)" }}>Sin resultados</p>
                  <p style={{ fontSize:"0.8rem", textAlign:"center" }}>Prueba con otro filtro o búsqueda</p>
                </div>
              ) : (
                negociosToShow.map((n) => {
                  const emoji = CAT_EMOJI[n.category?.toLowerCase().split(" ")[0]] ?? "🏪";
                  const dist = fmtDist(n.distancia_km);
                  // Promedio calculado desde reviews en memoria
                  const avgRating = ratings[n.id];
                  return (
                    <div key={n.id} className={`cp-card${selectedNegocio?.id === n.id ? " sel" : ""}`}
                      onClick={() => { setSelected(n); if (isMobile) setMobileView("map"); }}>
                      <div className="cp-thumb">
                        {n.image_url ? <img src={n.image_url} alt={n.name} /> : <span>{emoji}</span>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p className="cp-card__name">{n.name}</p>
                        <p className="cp-card__desc">{n.description?.split(".")[0] ?? n.category}</p>
                        {/* ── Estrellas calculadas desde reseñas ── */}
                        <div style={{ display:"flex", alignItems:"center", gap:"5px", marginTop:"4px" }}>
                          <StarRating value={avgRating ?? 0} />
                          {avgRating != null ? (
                            <span style={{ fontSize:"0.75rem", fontWeight:700, color:"#F0D224" }}>
                              {avgRating.toFixed(1)}
                            </span>
                          ) : (
                            <span style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)", fontWeight:500 }}>
                              Sin reseñas
                            </span>
                          )}
                        </div>
                      </div>
                      {dist && (
                        <div style={{ flexShrink:0 }}>
                          <span style={{ fontSize:"0.75rem", color:"var(--muted)", fontWeight:500 }}>{dist}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── MAP ── */}
            <div style={{ flex:1, position:"relative", display: isMobile && mobileView !== "map" ? "none" : "block" }}>
              <BusinessMap
                negocios={negociosToShow}
                selectedId={selectedNegocio?.id ?? null}
                userLocation={userLocation}
                onSelectNegocio={(n) => { setSelected(n); setRouteRequest(null); setRouteResult(null); }}
                routeRequest={routeRequest}
                onRouteResult={setRouteResult}
              />
              {selectedNegocio && (
                <BusinessPopup
                  negocio={selectedNegocio}
                  onClose={() => { setSelected(null); setRouteRequest(null); setRouteResult(null); }}
                  userLocation={userLocation}
                  onRouteRequest={setRouteRequest}
                  routeResult={routeResult}
                  onReviewSubmitted={refreshRatings}
                />
              )}
              <button className="cp-qr" onClick={() => (window.location.href = "/qr")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="4" height="4" />
                </svg>
                QR
              </button>
              {user && (
                <button className="cp-fab" onClick={() => (window.location.href = "/dashboard")}>
                  + Registrar negocio
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ══ BOTTOM NAV ══ */}
        {isMobile && (
          <nav className="cp-nav">
            {(
              [
                {
                  key: "mapa", label: "Mapa",
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
                  fn: () => { setActiveNav("mapa"); setMobileView("map"); },
                },
                {
                  key: "asistente", label: "Asistente",
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>,
                  fn: () => { setActiveNav("asistente"); handleVoice(); },
                },
                {
                  key: "negocio", label: "Negocio",
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
                  fn: () => { setActiveNav("negocio"); window.location.href = user ? "/mis-negocios" : "/login"; },
                },
                {
                  key: "perfil", label: "Perfil",
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
                  fn: () => { setActiveNav("perfil"); window.location.href = user ? "/perfil" : "/login"; },
                },
              ] as const
            ).map((nav) => (
              <button key={nav.key} className={`cp-nbtn${activeNav === nav.key ? " active" : ""}`} onClick={nav.fn}>
                {nav.icon}
                {nav.label}
              </button>
            ))}
          </nav>
        )}
        <ChatbotWidget />   {/* ← aquí */}
      </div>
    </>
  );
}
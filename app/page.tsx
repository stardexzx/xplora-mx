"use client";

import { useEffect, useState } from "react";
import BusinessMap from "../component/Map";
import BusinessPopup from "../component/BusinessPopup";
import { CATEGORIES, CATEGORY_LABELS_ES } from "../component/CategoryFilter";
import { supabase } from "../services/supabase";
import { interpretQuery } from "../services/ia";
import { translateText } from "../services/translate";
import { getUserLocation, getDistanceKm, LatLng } from "../services/geo";
import { useLang, interpolate } from "../context/LangContext";
import { Negocio } from "../types/negocio";

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

// ── Price badge ──────────────────────────────────────────────────────────────
function PriceBadge({ tags }: { tags?: string }) {
  if (!tags) return null;
  const t = tags.toLowerCase();
  if (
    t.includes("económico") ||
    t.includes("barato") ||
    t.includes("economico")
  )
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: "10px",
          background: "rgba(16,185,129,0.15)",
          color: "#10b981",
          fontSize: "0.72rem",
          fontWeight: 700,
        }}
      >
        $ Económico
      </span>
    );
  if (t.includes("moderado"))
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: "10px",
          background: "rgba(245,158,11,0.15)",
          color: "#f59e0b",
          fontSize: "0.72rem",
          fontWeight: 700,
        }}
      >
        $$ Moderado
      </span>
    );
  if (t.includes("premium") || t.includes("lujoso"))
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: "10px",
          background: "rgba(239,68,68,0.15)",
          color: "#ef4444",
          fontSize: "0.72rem",
          fontWeight: 700,
        }}
      >
        $$$ Premium
      </span>
    );
  return null;
}

const CAT_EMOJI: Record<string, string> = {
  comida: "🌮",
  tours: "🧭",
  hospedaje: "🏨",
  artesanias: "🏺",
  entretenimiento: "🎭",
};

// ── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const { t, lang, setLang, ready } = useLang();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [todosLosNegocios, setTodos] = useState<Negocio[]>([]);
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
  const [categoryLabels, setCategoryLabels] =
    useState<Record<string, string>>(CATEGORY_LABELS_ES);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [isMobile, setIsMobile] = useState(false);
  const [activeNav, setActiveNav] = useState<
    "mapa" | "asistente" | "negocio" | "perfil"
  >("mapa");

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
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      }
    });
  }, []);

  useEffect(() => {
    supabase
      .from("negocios")
      .select("*, negocio_images(url, order_index)")
      .eq("status", "approved")
      .then(({ data, error }) => {
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
      });
  }, []);

  useEffect(() => {
    if (!ready || lang === "es") {
      setCategoryLabels(CATEGORY_LABELS_ES);
      return;
    }
    const texts = CATEGORIES.map((c) => CATEGORY_LABELS_ES[c.key]);
    fetch("/api/translateUI", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, lang }),
    })
      .then((r) => r.json())
      .then((data) => {
        const labels: Record<string, string> = {};
        CATEGORIES.forEach((c, i) => {
          labels[c.key] = data.translations[i] ?? CATEGORY_LABELS_ES[c.key];
        });
        setCategoryLabels(labels);
      })
      .catch(() => setCategoryLabels(CATEGORY_LABELS_ES));
  }, [lang, ready]);

  const applyCategory = (all: Negocio[], cat: string) =>
    cat === "all"
      ? all
      : all.filter((n) =>
          n.category
            ?.toLowerCase()
            .includes(cat === "artesanias" ? "artesa" : cat),
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
        .map((n) => ({
          ...n,
          distancia_km: getDistanceKm(loc, { lat: n.lat, lng: n.lng }),
        }))
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

      console.log("🔍 Filtros obtenidos:", filters);

      // Si no hay filtros, buscar por texto libre en name/description
      const hasFilters = filters.category || filters.tags?.length > 0;

      let resultados: Negocio[] = [];

      if (!hasFilters) {
        // Búsqueda por texto libre
        const { data } = await supabase
          .from("negocios")
          .select("*, negocio_images(url, order_index)")
          .eq("status", "approved")
          .or(
            `name.ilike.%${text}%,description.ilike.%${text}%,category.ilike.%${text}%`,
          );

        resultados = (data ?? []).map((n: any) => ({
          ...n,
          images: (n.negocio_images ?? [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((i: any) => i.url),
        }));
      } else {
        let qb = supabase
          .from("negocios")
          .select("*, negocio_images(url, order_index)")
          .eq("status", "approved");

        if (filters.category) {
          qb = qb.ilike("category", `%${filters.category}%`);
        }

        if (filters.tags?.length > 0) {
          // Fix: cada tag necesita su propio .or encadenado
          for (const tag of filters.tags) {
            qb = qb.ilike("tags", `%${tag}%`);
          }
        }

        const { data } = await qb;
        resultados = (data ?? []).map((n: any) => ({
          ...n,
          images: (n.negocio_images ?? [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((i: any) => i.url),
        }));
      }

      if (userLocation) {
        resultados = resultados
          .filter((n) => n.lat && n.lng)
          .map((n) => ({
            ...n,
            distancia_km: getDistanceKm(userLocation, {
              lat: n.lat,
              lng: n.lng,
            }),
          }))
          .filter((n) => n.distancia_km! <= RADIO_KM)
          .sort((a, b) => a.distancia_km! - b.distancia_km!);
      }

      console.log("📍 Resultados:", resultados.length);
      setNegocios(resultados);
      setActiveCategory("all");
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query) return;
    await searchByText(query);
  };

  const handleVoice = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert(t.voiceNotSupported);
      return;
    }
    const r = new SR();
    const vLangs: Record<string, string> = {
      es: "es-MX",
      en: "en-US",
      pt: "pt-BR",
      fr: "fr-FR",
      de: "de-DE",
      ja: "ja-JP",
      ko: "ko-KR",
      ar: "ar-SA",
    };
    r.lang = vLangs[lang] ?? "es-MX";
    setListening(true);
    r.start();
    r.onresult = async (e: any) => {
      const txt = e.results[0][0].transcript;
      setQuery(txt);
      setListening(false);
      await searchByText(txt);
    };
    r.onerror = () => setListening(false);
  };

  const fmtDist = (km?: number) =>
    !km ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

  if (!ready)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "12px",
          background: "#0a1412",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: "#1d8a8c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <p
          style={{
            fontWeight: 800,
            fontSize: "1rem",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          XploraMX
        </p>
        <p
          style={{
            color: "#5a8a84",
            fontSize: "0.82rem",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {t.translating}
        </p>
      </div>
    );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .xp {
          --bg:         #0a1412;
          --surface:    #0f1f1c;
          --surface2:   #152a26;
          --surface3:   #1c3530;
          --border:     rgba(29,138,140,0.2);
          --teal:       #1d8a8c;
          --teal-dk:    #14626a;
          --teal-lt:    #2ab5b8;
          --teal-a:     rgba(29,138,140,0.15);
          --orange:     #e07830;
          --orange-dk:  #c06020;
          --orange-a:   rgba(224,120,48,0.15);
          --text:       #e8f0ee;
          --text-soft:  #a8c0bc;
          --muted:      #5a8080;
          --danger:     #ef4444;
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
        }
        .xp ::-webkit-scrollbar { width:4px; height:4px; }
        .xp ::-webkit-scrollbar-track { background:transparent; }
        .xp ::-webkit-scrollbar-thumb { background:var(--surface3); border-radius:99px; }

        /* Search */
        .xp .xp-search {
          width:100%; height:42px; padding:0 16px 0 42px;
          background:rgba(255,255,255,0.07); border:1.5px solid rgba(255,255,255,0.1);
          border-radius:21px; color:var(--text);
          font-family:'DM Sans',sans-serif; font-size:0.88rem;
          outline:none; box-sizing:border-box; transition:border-color .2s,background .2s;
        }
        .xp .xp-search:focus { border-color:var(--teal); background:rgba(29,138,140,0.08); }
        .xp .xp-search::placeholder { color:var(--muted); }

        /* Category pill */
        .xp .xp-pill {
          display:inline-flex; align-items:center; gap:6px; padding:7px 16px;
          border-radius:20px; white-space:nowrap; border:1.5px solid var(--border);
          background:var(--surface2); color:var(--text-soft);
          font-family:'DM Sans',sans-serif; font-weight:600; font-size:0.82rem;
          cursor:pointer; transition:all .18s; flex-shrink:0;
        }
        .xp .xp-pill:hover { border-color:var(--teal); color:var(--teal-lt); }
        .xp .xp-pill.active {
          background:var(--teal); border-color:var(--teal); color:#fff;
          box-shadow:0 3px 12px rgba(29,138,140,0.4);
        }

        /* Business card */
        .xp .xp-card {
          display:flex; align-items:flex-start; gap:14px; padding:14px 16px;
          margin:0 12px 10px; border-radius:14px; cursor:pointer;
          background:var(--surface); border:1px solid var(--border);
          transition:all .15s;
        }
        .xp .xp-card:hover { background:var(--surface2); border-color:var(--teal); }
        .xp .xp-card.sel { background:var(--teal-a); border-color:var(--teal); box-shadow:0 0 0 1px var(--teal); }

        /* Thumbnail */
        .xp .xp-thumb {
          width:52px; height:52px; border-radius:10px; flex-shrink:0;
          background:var(--surface2); border:1px solid var(--border);
          display:flex; align-items:center; justify-content:center;
          font-size:1.4rem; overflow:hidden;
        }
        .xp .xp-thumb img { width:100%; height:100%; object-fit:cover; }

        /* Icon button */
        .xp .xp-ibtn {
          width:36px; height:36px; border-radius:50%; flex-shrink:0;
          background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
          color:var(--text-soft); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:all .18s; font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:700;
        }
        .xp .xp-ibtn:hover { background:var(--teal-a); border-color:var(--teal); color:var(--teal-lt); }
        .xp .xp-ibtn.on { background:var(--teal-a); border-color:var(--teal); color:var(--teal-lt); }

        /* Dropdown */
        .xp .xp-drop {
          position:absolute; top:110%; right:0; z-index:2000;
          background:var(--surface2); border:1px solid var(--border);
          border-radius:14px; padding:6px;
          box-shadow:0 10px 40px rgba(0,0,0,0.6); min-width:170px;
          animation:xpFade .15s ease both;
        }
        @keyframes xpFade { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
        .xp .xp-dbtn {
          display:block; width:100%; text-align:left; padding:9px 14px;
          border:none; border-radius:8px; background:transparent;
          cursor:pointer; font-size:0.875rem; color:var(--text);
          font-family:'DM Sans',sans-serif; font-weight:500; transition:background .15s;
        }
        .xp .xp-dbtn:hover { background:var(--surface3); }
        .xp .xp-dbtn.danger { color:var(--danger); }
        .xp .xp-dbtn.center { text-align:center; font-weight:700; }

        /* Voice */
        .xp .xp-voice {
          width:42px; height:42px; border-radius:50%; flex-shrink:0;
          background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
          color:var(--text-soft); cursor:pointer;
          display:flex; align-items:center; justify-content:center; transition:all .2s;
        }
        .xp .xp-voice:hover { border-color:var(--teal); color:var(--teal-lt); }
        .xp .xp-voice.on { border-color:var(--danger); background:rgba(239,68,68,0.12); color:var(--danger); animation:xpPulse 1s infinite; }
        @keyframes xpPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }

        /* Bottom nav */
        .xp .xp-nav {
          display:flex; align-items:stretch; background:var(--surface);
          border-top:1px solid var(--border);
          position:fixed; bottom:0; left:0; right:0; z-index:200; height:60px;
        }
        .xp .xp-nbtn {
          flex:1; display:flex; flex-direction:column; align-items:center;
          justify-content:center; gap:3px; border:none; background:transparent;
          cursor:pointer; color:var(--muted); font-family:'DM Sans',sans-serif;
          font-size:0.68rem; font-weight:600; transition:color .15s;
        }
        .xp .xp-nbtn.active { color:var(--teal); }

        /* FAB + QR */
        .xp .xp-fab {
          position:absolute; bottom:80px; right:20px; padding:11px 20px;
          border-radius:24px; border:none; background:var(--orange); color:#fff;
          font-family:'DM Sans',sans-serif; font-weight:700; font-size:0.875rem;
          cursor:pointer; box-shadow:0 4px 20px rgba(224,120,48,.5); z-index:10;
          transition:all .2s;
        }
        .xp .xp-fab:hover { background:var(--orange-dk); transform:translateY(-2px); }
        .xp .xp-qr {
          position:absolute; bottom:16px; right:16px; padding:8px 14px;
          border-radius:10px; border:none; background:var(--orange); color:#fff;
          font-family:'DM Sans',sans-serif; font-weight:700; font-size:0.82rem;
          cursor:pointer; box-shadow:0 4px 14px rgba(224,120,48,.5); z-index:10;
          display:flex; align-items:center; gap:6px; transition:all .2s;
        }
        .xp .xp-qr:hover { background:var(--orange-dk); transform:translateY(-1px); }
      `}</style>

      <div
        className="xp"
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ══ HEADER ══ */}
        <header
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            padding: isMobile ? "10px 14px" : "12px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flexShrink: 0,
            zIndex: 100,
          }}
        >
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flex: 1,
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "9px",
                  background: "var(--teal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  color: "var(--text)",
                  letterSpacing: "-0.01em",
                }}
              >
                Xplora
                <span
                  style={{
                    background: "var(--orange)",
                    color: "#fff",
                    padding: "1px 7px 2px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    marginLeft: "5px",
                  }}
                >
                  MX
                </span>
              </span>
            </div>

            {/* Nearby */}
            <button
              className={`xp-ibtn${nearbyOnly ? " on" : ""}`}
              onClick={nearbyOnly ? handleShowAll : handleGetLocation}
              title="Cerca de mí"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </button>

            {/* Language */}
            <div style={{ position: "relative" }}>
              <button
                className="xp-ibtn"
                onClick={() => {
                  setShowLangMenu(!showLangMenu);
                  setShowUserMenu(false);
                }}
              >
                {LANGUAGES.find((l) => l.code === lang)?.flag ?? "ES"}
              </button>
              {showLangMenu && (
                <div
                  className="xp-drop"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2px",
                    minWidth: "120px",
                  }}
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      className="xp-dbtn center"
                      style={{
                        color: l.code === lang ? "var(--teal-lt)" : undefined,
                      }}
                      onClick={() => {
                        setLang(l.code);
                        setShowLangMenu(false);
                      }}
                    >
                      {l.flag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User */}
            {user ? (
              <div style={{ position: "relative" }}>
                <button
                  className="xp-ibtn"
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowLangMenu(false);
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="xp-drop">
                    {[
                      { label: "Mis negocios", href: "/mis-negocios" },
                      { label: "Registrar negocio", href: "/dashboard" },
                      ...(isAdmin
                        ? [{ label: "Panel admin", href: "/admin" }]
                        : []),
                    ].map((item) => (
                      <button
                        key={item.href}
                        className="xp-dbtn"
                        onClick={() => {
                          window.location.href = item.href;
                          setShowUserMenu(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                    <div
                      style={{
                        height: "1px",
                        background: "var(--border)",
                        margin: "4px 0",
                      }}
                    />
                    <button
                      className="xp-dbtn danger"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        location.reload();
                      }}
                    >
                      {t.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="xp-ibtn"
                style={{
                  width: "auto",
                  padding: "0 12px",
                  borderRadius: "18px",
                }}
                onClick={() => (window.location.href = "/login")}
              >
                {t.login}
              </button>
            )}
          </div>

          {/* Search row */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--muted)"
                strokeWidth="2"
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="xp-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t.searchPlaceholder}
              />
            </div>
            <button
              className={`xp-voice${listening ? " on" : ""}`}
              onClick={handleVoice}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>
          </div>
        </header>

        {/* ══ CATEGORY BAR ══ */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
            overflowX: "auto",
            flexShrink: 0,
            scrollbarWidth: "none",
          }}
        >
          <button
            className={`xp-pill${activeCategory === "all" ? " active" : ""}`}
            onClick={() => handleCategoryChange("all")}
          >
            🗺️ {categoryLabels["all"] ?? "Todos"}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`xp-pill${activeCategory === c.key ? " active" : ""}`}
              onClick={() => handleCategoryChange(c.key)}
            >
              {c.emoji} {categoryLabels[c.key]}
            </button>
          ))}
        </div>

        {locationError && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(239,68,68,0.1)",
              borderBottom: "1px solid rgba(239,68,68,0.2)",
              color: "var(--danger)",
              fontSize: "0.82rem",
              flexShrink: 0,
            }}
          >
            {locationError}
          </div>
        )}

        {/* ══ BODY ══ */}
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            flexDirection: "column",
          }}
        >
          {/* Mobile list/map tabs */}
          {isMobile && (
            <div
              style={{
                display: "flex",
                background: "var(--surface)",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              {(["list", "map"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setMobileView(v)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    fontWeight: mobileView === v ? 700 : 500,
                    fontSize: "0.82rem",
                    color: mobileView === v ? "var(--teal-lt)" : "var(--muted)",
                    borderBottom: `2px solid ${mobileView === v ? "var(--teal)" : "transparent"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    transition: "all .15s",
                  }}
                >
                  {v === "list" ? (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      Lista {negocios.length > 0 && `(${negocios.length})`}
                    </>
                  ) : (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
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

          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* ── LIST PANEL ── */}
            <div
              style={{
                width: isMobile ? "100%" : "380px",
                flexShrink: 0,
                borderRight: isMobile ? "none" : "1px solid var(--border)",
                overflowY: "auto",
                background: "var(--bg)",
                display: isMobile && mobileView !== "list" ? "none" : "flex",
                flexDirection: "column",
                paddingTop: "10px",
                paddingBottom: isMobile ? "70px" : "10px",
              }}
            >
              {nearbyOnly && (
                <div
                  style={{
                    margin: "0 12px 10px",
                    padding: "8px 14px",
                    borderRadius: "10px",
                    background: "var(--teal-a)",
                    border: "1px solid var(--border)",
                    fontSize: "0.78rem",
                    color: "var(--text-soft)",
                    fontWeight: 500,
                  }}
                >
                  {interpolate(t.nearbyCount, {
                    n: negocios.length,
                    km: RADIO_KM,
                  })}
                </div>
              )}

              {negocios.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "3rem 1rem",
                    color: "var(--muted)",
                  }}
                >
                  <span style={{ fontSize: "2.5rem" }}>🔍</span>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--text-soft)",
                    }}
                  >
                    Sin resultados
                  </p>
                  <p style={{ fontSize: "0.8rem", textAlign: "center" }}>
                    Prueba con otro filtro o búsqueda
                  </p>
                </div>
              ) : (
                negocios.map((n) => {
                  const emoji =
                    CAT_EMOJI[n.category?.toLowerCase().split(" ")[0]] ?? "🏪";
                  const dist = fmtDist(n.distancia_km);
                  return (
                    <div
                      key={n.id}
                      className={`xp-card${selectedNegocio?.id === n.id ? " sel" : ""}`}
                      onClick={() => {
                        setSelected(n);
                        if (isMobile) setMobileView("map");
                      }}
                    >
                      <div className="xp-thumb">
                        {n.image_url ? (
                          <img src={n.image_url} alt={n.name} />
                        ) : (
                          <span>{emoji}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: "0 0 2px",
                            fontWeight: 700,
                            fontSize: "0.92rem",
                            color: "var(--text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.name}
                        </p>
                        <p
                          style={{
                            margin: "0 0 7px",
                            fontSize: "0.78rem",
                            color: "var(--muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.description?.split(".")[0] ?? n.category}
                        </p>
                        <PriceBadge tags={n.tags} />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "5px",
                          flexShrink: 0,
                        }}
                      >
                        {n.rating != null && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="#f59e0b"
                              stroke="#f59e0b"
                              strokeWidth="1"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                color: "var(--text-soft)",
                              }}
                            >
                              {n.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {dist && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--muted)",
                              fontWeight: 500,
                            }}
                          >
                            {dist}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── MAP ── */}
            <div
              style={{
                flex: 1,
                position: "relative",
                display: isMobile && mobileView !== "map" ? "none" : "block",
              }}
            >
              <BusinessMap
                negocios={negocios}
                selectedId={selectedNegocio?.id ?? null}
                userLocation={userLocation}
                onSelectNegocio={(n) => setSelected(n)}
              />
              {selectedNegocio && (
                <BusinessPopup
                  negocio={selectedNegocio}
                  onClose={() => setSelected(null)}
                />
              )}
              <button
                className="xp-qr"
                onClick={() => (window.location.href = "/qr")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="4" height="4" />
                </svg>
                QR
              </button>
              {user && (
                <button
                  className="xp-fab"
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  + Registrar negocio
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ══ BOTTOM NAV ══ */}
        {isMobile && (
          <nav className="xp-nav">
            {(
              [
                {
                  key: "mapa",
                  label: "Mapa",
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  ),
                  fn: () => {
                    setActiveNav("mapa");
                    setMobileView("map");
                  },
                },
                {
                  key: "asistente",
                  label: "Asistente",
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                    </svg>
                  ),
                  fn: () => {
                    setActiveNav("asistente");
                    handleVoice();
                  },
                },
                {
                  key: "negocio",
                  label: "Negocio",
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  ),
                  fn: () => {
                    setActiveNav("negocio");
                    window.location.href = user ? "/mis-negocios" : "/login";
                  },
                },
                {
                  key: "perfil",
                  label: "Perfil",
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ),
                  fn: () => {
                    setActiveNav("perfil");
                    window.location.href = user ? "/perfil" : "/login";
                  },
                },
              ] as const
            ).map((nav) => (
              <button
                key={nav.key}
                className={`xp-nbtn${activeNav === nav.key ? " active" : ""}`}
                onClick={nav.fn}
              >
                {nav.icon}
                {nav.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}

"use client";

import ChatbotNegocios from "@/component/ChatbotWidgetNegocios";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { supabase } from "../../services/supabase";
import { uploadImage } from "../../services/cloudinary";
import { useMaps } from "../../context/MapsContext";
import type { AsesoriaResult, AsesoriaMessage } from "../api/asesoria/route";
import s from "./MisNegocios.module.css";

// ─── Available tags from API ──────────────────────────────────────────────────

const AVAILABLE_TAGS = [
  "barato",
  "lujo",
  "seguro",
  "familiar",
  "romantico",
  "turistico",
  "gastronomico",
  "cultural",
  "vida nocturna",
  "al aire libre",
  "con niños",
  "pet friendly",
  "sin gluten",
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

type NegocioImg = { id: string; url: string; order_index: number };

type Negocio = {
  id: string; name: string; category: string; description: string;
  tags: string; lat: number; lng: number; status: string;
  image_url: string | null; rating: number | null;
  negocio_images: NegocioImg[];
  phone?: string | null; website?: string | null; opening_hours?: string | null;
};

type Review = {
  id: string; rating: number; comment: string; created_at: string;
  reply?: string | null; user_id: string;
};

const CATS = [
  { value: "comida",          label: "Comida" },
  { value: "tours",           label: "Tours" },
  { value: "hospedaje",       label: "Hospedaje" },
  { value: "artesanias",      label: "Artesanías" },
  { value: "entretenimiento", label: "Entretenimiento" },
];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "En revisión", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  approved: { label: "Publicado",   color: "#10b981", bg: "var(--teal-a)" },
  rejected: { label: "Rechazado",   color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0a0f0d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b9e82" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2820" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1f18" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#111a15" }] },
];

// ─── Schedule types and constants ─────────────────────────────────────────────

type WeekSchedule = Record<string, { open: boolean; from: string; to: string }>;

const DEFAULT_SCHEDULE: WeekSchedule = {
  lunes: { open: true, from: "09:00", to: "20:00" },
  martes: { open: true, from: "09:00", to: "20:00" },
  miercoles: { open: true, from: "09:00", to: "20:00" },
  jueves: { open: true, from: "09:00", to: "20:00" },
  viernes: { open: true, from: "09:00", to: "20:00" },
  sabado: { open: true, from: "10:00", to: "18:00" },
  domingo: { open: false, from: "10:00", to: "18:00" },
};

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

const TAGS_OPTIONS = AVAILABLE_TAGS;

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MisNegocios() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded: mapLoaded } = useMaps();

  const [authChecked, setAuthChecked]   = useState(false);
  const [userId, setUserId]             = useState<string | null>(null);

  // Login inline state
  const [loginEmail, setLoginEmail]     = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError]     = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPw, setShowPw]             = useState(false);
  const [loginTab, setLoginTab]         = useState<"login" | "register">("login");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName]   = useState("");
  const [regPhone, setRegPhone]         = useState("");
  const [regEmail, setRegEmail]         = useState("");
  const [regPassword, setRegPassword]   = useState("");
  const [regError, setRegError]         = useState("");
  const [regLoading, setRegLoading]     = useState(false);
  const [negocios, setNegocios]         = useState<Negocio[]>([]);
  const [loadingNegocios, setLoadingNegocios] = useState(true);

  // Panel activo: null = lista, string = id del negocio en edición
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<"info" | "fotos" | "resenas" | "crecer">("info");

  // Estado del asistente Coppel Emprende
  const [crecerAsesoria, setCrecerAsesoria]     = useState<AsesoriaResult | null>(null);
  const [crecerLoading, setCrecerLoading]       = useState(false);
  const [crecerHistorial, setCrecerHistorial]   = useState<AsesoriaMessage[]>([]);
  const [crecerMsgs, setCrecerMsgs]             = useState<{ role: "user" | "assistant"; content: string; accion?: string; structured?: import("../api/asesoria/route").AsesoriaResult }[]>([]);
  const [crecerInput, setCrecerInput]           = useState("");

  // Campos de edición
  const [editName, setEditName]         = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags]         = useState("");
  const [editPhone, setEditPhone]       = useState("");
  const [editWebsite, setEditWebsite]   = useState("");
  const [editOpeningHours, setEditOpeningHours] = useState("");
  const [editLat, setEditLat]           = useState("");
  const [editLng, setEditLng]           = useState("");
  const [editMarker, setEditMarker]     = useState<{ lat: number; lng: number } | null>(null);
  const [editCenter, setEditCenter]     = useState({ lat: 19.0414, lng: -98.2063 });

  const [selectedTags, setSelectedTags]   = useState<string[]>([]);
  const [schedule, setSchedule]           = useState<WeekSchedule>({ ...DEFAULT_SCHEDULE });

  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [currentImages, setCurrentImages]     = useState<NegocioImg[]>([]);
  const [newFiles, setNewFiles]               = useState<File[]>([]);
  const [newPreviews, setNewPreviews]         = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Reseñas
  const [reviews, setReviews]           = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [replyText, setReplyText]       = useState<Record<string, string>>({});
  const [savingReply, setSavingReply]   = useState<string | null>(null);

  // ── Responsive ──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      setAuthChecked(true);
    });
  }, []);

  // ── Cargar negocios del usuario ──
  useEffect(() => {
    if (!userId) return;
    setLoadingNegocios(true);
    supabase.from("negocios")
      .select("*, negocio_images(id, url, order_index)")
      .eq("owner_id", userId)
      .order("id", { ascending: false })
      .then(({ data }) => {
        setNegocios((data ?? []) as Negocio[]);
        setLoadingNegocios(false);
      });
  }, [userId]);

  // ── Abrir editor ──
  const openEdit = (n: Negocio) => {
    setEditingId(n.id);
    setActiveTab("info");
    // Reset asistente Coppel al cambiar de negocio
    setCrecerAsesoria(null); setCrecerMsgs([]); setCrecerHistorial([]); setCrecerInput("");
    setEditName(n.name);
    setEditCategory(n.category);
    setEditDescription(n.description ?? "");
    setEditTags(n.tags ?? "");
    setEditPhone(n.phone ?? "");
    setEditWebsite(n.website ?? "");
    setEditOpeningHours(n.opening_hours ?? "");
    setEditLat(String(n.lat ?? ""));
    setEditLng(String(n.lng ?? ""));
    if (n.lat && n.lng) {
      setEditMarker({ lat: n.lat, lng: n.lng });
      setEditCenter({ lat: n.lat, lng: n.lng });
    }
    setCurrentImages([...n.negocio_images].sort((a, b) => a.order_index - b.order_index));
    setNewFiles([]); setNewPreviews([]);
    setSaveMsg("");
    loadReviews(n.id);
  };

  const closeEdit = () => { setEditingId(null); setSaveMsg(""); };

  // ── Asistente Coppel Emprende ──
  const initCrecer = (negocio: Negocio) => {
    if (crecerAsesoria || crecerLoading) return;
    setCrecerLoading(true);
    fetch("/api/asesoria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ negocio: { ...negocio, tags: negocio.tags }, historial: [] }),
    })
      .then(r => r.json())
      .then((data: AsesoriaResult) => {
        setCrecerAsesoria(data);
        setCrecerMsgs([{ role: "assistant", content: data.respuesta, accion: data.accionPrincipal, structured: data }]);
        setCrecerHistorial([{ role: "assistant", content: data.respuesta }]);
        setCrecerLoading(false);
      })
      .catch(() => setCrecerLoading(false));
  };
  const toggleTag  = (t: string) => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleDay  = (day: string) => setSchedule((p: WeekSchedule) => ({ ...p, [day]: { ...p[day], open: !p[day].open } }));
  const setDayTime = (day: string, field: "from" | "to", val: string) =>
    setSchedule((p: WeekSchedule) => ({ ...p, [day]: { ...p[day], [field]: val } }));

  const sendCrecer = async (pregunta: string, negocio: Negocio) => {
    if (!pregunta.trim() || crecerLoading) return;
    setCrecerInput("");
    const userMsg = { role: "user" as const, content: pregunta };
    setCrecerMsgs(prev => [...prev, userMsg]);
    const newHistorial = [...crecerHistorial, userMsg];
    setCrecerHistorial(newHistorial);
    setCrecerLoading(true);
    try {
      const res = await fetch("/api/asesoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocio: { ...negocio, tags: negocio.tags }, pregunta, historial: newHistorial }),
      });
      const data: AsesoriaResult = await res.json();
      setCrecerMsgs(prev => [...prev, { role: "assistant", content: data.respuesta, accion: data.accionPrincipal }]);
      setCrecerHistorial(prev => [...prev, { role: "assistant", content: data.respuesta }]);
      setCrecerAsesoria(data);
    } catch { /* silent */ }
    finally { setCrecerLoading(false); }
  };

  // ── Guardar info ──
  const saveInfo = async () => {
    if (!editingId) return;
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.from("negocios").update({
      name: editName, category: editCategory,
      description: editDescription, tags: editTags,
      lat: parseFloat(editLat), lng: parseFloat(editLng),
      phone: editPhone.trim() || null,
      website: editWebsite.trim() || null,
      opening_hours: editOpeningHours.trim() || null,
    }).eq("id", editingId);

    if (error) { setSaveMsg("Error: " + error.message); }
    else {
      setSaveMsg("Cambios guardados");
      setNegocios(prev => prev.map(n =>
        n.id === editingId ? { ...n, name: editName, category: editCategory, description: editDescription, tags: editTags, lat: parseFloat(editLat), lng: parseFloat(editLng) } : n
      ));
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  // ── Mapa click ──
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = parseFloat(e.latLng.lat().toFixed(7));
    const lng = parseFloat(e.latLng.lng().toFixed(7));
    setEditMarker({ lat, lng });
    setEditLat(String(lat)); setEditLng(String(lng));
  }, []);

  // ── Fotos: eliminar existente ──
  const deleteImage = async (imgId: string, url: string) => {
    await supabase.from("negocio_images").delete().eq("id", imgId);
    setCurrentImages(prev => prev.filter(i => i.id !== imgId));
    // Si era la imagen principal, actualizar
    if (editingId) {
      const remaining = currentImages.filter(i => i.id !== imgId);
      await supabase.from("negocios").update({
        image_url: remaining[0]?.url ?? null
      }).eq("id", editingId);
    }
  };

  // ── Fotos: subir nuevas ──
  const handleNewFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const available = 6 - currentImages.length;
    const toAdd = files.slice(0, available);
    setNewFiles(prev => [...prev, ...toAdd]);
    setNewPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
  };

  const uploadNewPhotos = async () => {
    if (!editingId || !newFiles.length) return;
    setUploadingPhotos(true);
    const uploaded: NegocioImg[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      try {
        const url = await uploadImage(newFiles[i]);
        const order = currentImages.length + i;
        const { data } = await supabase.from("negocio_images")
          .insert({ negocio_id: editingId, url, order_index: order })
          .select().single();
        if (data) uploaded.push(data as NegocioImg);
      } catch { /* skip */ }
    }
    // Actualizar imagen principal si no había ninguna
    if (currentImages.length === 0 && uploaded.length > 0) {
      await supabase.from("negocios").update({ image_url: uploaded[0].url }).eq("id", editingId);
    }
    setCurrentImages(prev => [...prev, ...uploaded]);
    setNewFiles([]); setNewPreviews([]);
    setUploadingPhotos(false);
  };

  // ── Reseñas ──
  const loadReviews = async (negocioId: string) => {
    setLoadingReviews(true);
    const { data } = await supabase.from("reviews")
      .select("*").eq("negocio_id", negocioId)
      .order("created_at", { ascending: false });
    setReviews((data ?? []) as Review[]);
    setLoadingReviews(false);
  };

  const saveReply = async (reviewId: string) => {
    const reply = replyText[reviewId]?.trim();
    if (!reply) return;
    setSavingReply(reviewId);
    const { error } = await supabase.from("reviews").update({ reply }).eq("id", reviewId);
    if (!error) {
      setReviews(p => p.map(r => r.id === reviewId ? { ...r, reply } : r));
      setReplyText(p => ({ ...p, [reviewId]: "" }));
    }
    setSavingReply(null);
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm("¿Eliminar esta reseña?")) return;
    await supabase.from("reviews").delete().eq("id", reviewId);
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  // ── Eliminar negocio ──
  const deleteNegocio = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" permanentemente? Esta acción no se puede deshacer.`)) return;

    // Con CASCADE activo en Supabase, eliminar el negocio
    // borra automáticamente negocio_images y reviews relacionadas
    const { error } = await supabase.from("negocios").delete().eq("id", id);

    if (error) {
      alert("Error al eliminar: " + error.message);
      return;
    }

    setNegocios(prev => prev.filter(n => n.id !== id));
    if (editingId === id) closeEdit();
  };

  // ── Login handlers ──
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) return;
    setLoginError(""); setLoginLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoginLoading(false);
    if (error) { setLoginError("Correo o contraseña incorrectos."); return; }
    setUserId(data.user.id);
  };

  const handleRegister = async () => {
    if (!regEmail || !regPassword) { setRegError("Completa email y contraseña."); return; }
    if (regPassword.length < 6) { setRegError("La contraseña debe tener al menos 6 caracteres."); return; }
    setRegError(""); setRegLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: regEmail, password: regPassword,
      options: { data: { first_name: regFirstName, last_name: regLastName, phone: regPhone, user_type: "negocio" } },
    });
    setRegLoading(false);
    if (error) { setRegError(error.message); return; }
    if (data.user) setUserId(data.user.id);
  };

  // Mostrar spinner mientras carga auth
  if (!authChecked) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: "32px", height: "32px", border: "3px solid var(--border)", borderTopColor: "var(--teal)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  // Mostrar login inline si no hay sesión
  if (!userId) return (
    <div style={{ minHeight: "100vh", background: "#0a0f0d", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: "420px", background: "#111a15", borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #14626A, #1D8A8C)", padding: "28px 32px 24px", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", margin: "0 auto 12px" }}>🌎</div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "white", margin: "0 0 4px" }}>XploraMX</p>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>Panel de negocios</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {(["login", "register"] as const).map(t => (
            <button key={t} onClick={() => { setLoginTab(t); setLoginError(""); setRegError(""); }}
              style={{ flex: 1, padding: "14px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: "0.85rem", color: loginTab === t ? "#1D8A8C" : "rgba(255,255,255,0.4)", borderBottom: `2px solid ${loginTab === t ? "#1D8A8C" : "transparent"}`, transition: "all 0.2s" }}>
              {t === "login" ? "Iniciar sesión" : "Registrarse"}
            </button>
          ))}
        </div>

        <div style={{ padding: "28px 32px 32px" }}>
          {loginTab === "login" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Email</label>
                <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} type="email" placeholder="tu@correo.com"
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Contraseña</label>
                <div style={{ position: "relative" }}>
                  <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="••••••••"
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    style={{ width: "100%", padding: "11px 44px 11px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                  <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              {loginError && <p style={{ fontSize: "0.82rem", color: "#f87171", margin: 0 }}>{loginError}</p>}
              <button onClick={handleLogin} disabled={loginLoading}
                style={{ padding: "13px", background: loginLoading ? "rgba(29,138,140,0.5)" : "#1D8A8C", color: "white", border: "none", borderRadius: "12px", fontFamily: "inherit", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", marginTop: "4px", transition: "background 0.2s" }}>
                {loginLoading ? "Entrando..." : "Entrar →"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Nombre</label>
                  <input value={regFirstName} onChange={e => setRegFirstName(e.target.value)} placeholder="Ana"
                    style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Apellido</label>
                  <input value={regLastName} onChange={e => setRegLastName(e.target.value)} placeholder="García"
                    style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Email</label>
                <input value={regEmail} onChange={e => setRegEmail(e.target.value)} type="email" placeholder="tu@correo.com"
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Teléfono (opcional)</label>
                <input value={regPhone} onChange={e => setRegPhone(e.target.value)} type="tel" placeholder="+52 55 0000 0000"
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Contraseña</label>
                <input value={regPassword} onChange={e => setRegPassword(e.target.value)} type="password" placeholder="Mínimo 6 caracteres"
                  onKeyDown={e => e.key === "Enter" && handleRegister()}
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              {regError && <p style={{ fontSize: "0.82rem", color: "#f87171", margin: 0 }}>{regError}</p>}
              <button onClick={handleRegister} disabled={regLoading}
                style={{ padding: "13px", background: regLoading ? "rgba(29,138,140,0.5)" : "#1D8A8C", color: "white", border: "none", borderRadius: "12px", fontFamily: "inherit", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", marginTop: "4px" }}>
                {regLoading ? "Creando cuenta..." : "Crear cuenta →"}
              </button>
            </div>
          )}

          <p style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.3)", textAlign: "center", margin: "16px 0 0" }}>
            Al continuar aceptas los términos y condiciones
          </p>
        </div>
      </div>
    </div>
  );

  const editingNegocio = negocios.find(n => n.id === editingId);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'DM Sans', sans-serif" }}>

        {/* HEADER */}
        <div className={`${s.header} ${isMobile ? s.headerMobile : ""}`}>
          <button className={s.logoBtn} onClick={() => router.push("/")}>
            <img src="/MexiGoLogo.png" alt="MexiGo" style={{ height: "32px", objectFit: "contain", maxWidth: "110px" }} />
            <div style={{ width: "1px", height: "20px", background: "rgba(0,0,0,0.15)", margin: "0 4px" }} />
            <img src="/CoppelLogo.png" alt="Coppel" style={{ height: "32px", objectFit: "contain", maxWidth: "110px" }} />
          </button>
          <span style={{ color: "var(--border)" }}>/</span>
          <span style={{ color: "var(--muted)", fontSize: "0.9rem", fontWeight: 600 }}>Mis negocios</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button className="btn btn-primary" style={{ fontSize: "0.82rem" }} onClick={() => router.push("/dashboard")}>
              {isMobile ? "+" : "+ Registrar"}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: "0.82rem" }} onClick={() => router.push("/")}>
              ←
            </button>
          </div>
        </div>

        {/* ── LAYOUT: sidebar | panel | chatbot ── */}
        <div className={`${s.layout} ${isMobile ? s.layoutMobile : ""}`}>

          {/* LISTA DE NEGOCIOS */}
          <div style={{
            width: isMobile ? "100%" : "320px",
            flexShrink: 0,
            borderRight: isMobile ? "none" : "1px solid var(--border)",
            borderBottom: isMobile ? "1px solid var(--border)" : "none",
            overflowY: isMobile ? "visible" : "auto",
            background: "var(--surface)",
          }}>
            {loadingNegocios ? (
              <p style={{ color: "var(--muted)", padding: "2rem", textAlign: "center" }}>Cargando...</p>
            ) : negocios.length === 0 ? (
              <div className={s.sidebarEmpty}>
                <p className={s.sidebarEmptyText}>No tienes negocios registrados</p>
                <button
                  className={s.btnPrimary}
                  style={{ fontSize: "0.85rem" }}
                  onClick={() => router.push("/dashboard")}
                >
                  Registrar mi primer negocio
                </button>
              </div>
            ) : negocios.map(n => {
              const st = STATUS_LABELS[n.status] ?? STATUS_LABELS.pending;
              return (
                <div
                  key={n.id}
                  className={`${s.negocioItem} ${editingId === n.id ? s.negocioItemActive : ""}`}
                  onClick={() => openEdit(n)}
                >
                  <div className={s.negocioThumb}>
                    {n.image_url ? <img src={n.image_url} alt={n.name} /> : "🏪"}
                  </div>
                  <div className={s.negocioInfo}>
                    <p className={s.negocioName}>{n.name}</p>
                    <p className={s.negocioCategory}>{n.category}</p>
                    <span className={s.statusBadge} style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PANEL central */}
          {editingNegocio ? (
            <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)", minHeight: isMobile ? "auto" : 0 }}>

              {/* Sub-header del negocio */}
              <div style={{ padding: isMobile ? "12px 16px" : "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", background: "var(--surface)" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{editingNegocio.name}</h2>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>{editingNegocio.category}</p>
                </div>
                <div className={s.editHeaderActions}>
                  <button
                    className={s.btnDanger}
                    onClick={() => deleteNegocio(editingNegocio.id, editingNegocio.name)}
                  >
                    Eliminar negocio
                  </button>
                  <button className="btn btn-ghost" style={{ fontSize: "0.8rem" }} onClick={closeEdit}>✕</button>
                </div>
              </div>

              {/* Tabs */}
              <div className={s.tabs}>
                {(["info", "fotos", "resenas", "crecer"] as const).map(tab => (
                  <button 
                    key={tab} 
                    className={`${s.tab} ${activeTab === tab ? s.tabActive : ""}`}
                    onClick={() => { setActiveTab(tab);
                      if (tab === "crecer" && editingNegocio) initCrecer(editingNegocio);
                    }} 
                  >
                    {tab === "info" ? "Información"
                      : tab === "fotos" ? `Fotos (${currentImages.length})`
                      : tab === "resenas" ? `Reseñas (${reviews.length})`
                      : "💡 Crecer"}
                  </button>
                ))}
              </div>

              <div style={{ padding: isMobile ? "1rem" : "1.5rem 2rem", maxWidth: "640px" }}>

                {/* ── TAB INFO ── */}
                {activeTab === "info" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                      <label style={labelStyle}>Nombre del negocio</label>
                      <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>

                    <div>
                      <label style={labelStyle}>Categoría</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        {CATS.map(c => (
                          <button
                            key={c.value}
                            className={`${s.catBtn} ${editCategory === c.value ? s.catBtnActive : ""}`}
                            onClick={() => setEditCategory(c.value)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={s.label}>Descripción</label>
                      <textarea
                        className={`${s.input} ${s.textarea}`}
                        rows={3}
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                      />
                    </div>

                    {/* ETIQUETAS */}
                    <div>
                      <label className={s.label}>Etiquetas</label>
                      <div className={s.chipGrid}>
                        {TAGS_OPTIONS.map((tag: string) => (
                          <button
                            key={tag}
                            className={`${s.chip} ${selectedTags.includes(tag) ? s.chipActive : ""}`}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <p className={s.chipHint}>Selecciona todas las que apliquen a tu negocio</p>
                    </div>

                    <div>
                      <label className={s.label}>Teléfono / WhatsApp</label>
                      <input
                        className={s.input}
                        placeholder="+52 222 123 4567"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={s.label}>Sitio web</label>
                      <input
                        className={s.input}
                        placeholder="www.minegocio.mx"
                        value={editWebsite}
                        onChange={e => setEditWebsite(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={s.label}>Horario</label>
                      <div className={s.scheduleList}>
                        {DAYS.map((day: string) => {
                          const d = schedule[day];
                          return (
                            <div
                              key={day}
                              className={`${s.scheduleRow} ${!d.open ? s.scheduleRowClosed : ""}`}
                            >
                              <label className={s.scheduleCheck}>
                                <input
                                  type="checkbox"
                                  checked={d.open}
                                  onChange={() => toggleDay(day)}
                                  className={s.checkboxInput}
                                />
                                <span className={`${s.checkboxCustom} ${d.open ? s.checkboxChecked : ""}`}>
                                  {d.open && (
                                    <svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 10, height: 10 }}>
                                      <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </span>
                                <span className={s.scheduleDay}>{day}</span>
                              </label>
                              {d.open ? (
                                <div className={s.scheduleTimes}>
                                  <input
                                    type="time"
                                    value={d.from}
                                    onChange={e => setDayTime(day, "from", e.target.value)}
                                    className={s.timeInput}
                                  />
                                  <span className={s.timeSep}>—</span>
                                  <input
                                    type="time"
                                    value={d.to}
                                    onChange={e => setDayTime(day, "to", e.target.value)}
                                    className={s.timeInput}
                                  />
                                </div>
                              ) : (
                                <span className={s.scheduleClosed}>Cerrado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mini mapa de ubicación */}
                    <div>
                      <label style={labelStyle}>Ubicación</label>
                      <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)", height: "220px", marginBottom: "10px" }}>
                        {mapLoaded ? (
                          <GoogleMap
                            mapContainerStyle={{ width: "100%", height: "100%" }}
                            center={editCenter}
                            zoom={editMarker ? 15 : 13}
                            onClick={handleMapClick}
                            options={{
                              styles: darkMapStyle,
                              zoomControl: true,
                              streetViewControl: false,
                              mapTypeControl: false,
                              fullscreenControl: false,
                            }}
                          >
                            {editMarker && (
                              <Marker
                                position={editMarker}
                                draggable
                                onDragEnd={e => {
                                  if (!e.latLng) return;
                                  const lat = parseFloat(e.latLng.lat().toFixed(7));
                                  const lng = parseFloat(e.latLng.lng().toFixed(7));
                                  setEditMarker({ lat, lng });
                                  setEditLat(String(lat));
                                  setEditLng(String(lng));
                                }}
                              />
                            )}
                          </GoogleMap>
                        ) : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>Cargando mapa...</div>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div>
                          <label className={`${s.label} ${s.labelSm}`}>Latitud</label>
                          <input
                            className={s.input}
                            value={editLat}
                            style={{ fontSize: "0.85rem" }}
                            onChange={e => {
                              setEditLat(e.target.value);
                              const n = parseFloat(e.target.value), l = parseFloat(editLng);
                              if (!isNaN(n) && !isNaN(l)) { setEditMarker({ lat: n, lng: l }); setEditCenter({ lat: n, lng: l }); }
                            }}
                          />
                        </div>
                        <div>
                          <label className={`${s.label} ${s.labelSm}`}>Longitud</label>
                          <input
                            className={s.input}
                            value={editLng}
                            style={{ fontSize: "0.85rem" }}
                            onChange={e => {
                              setEditLng(e.target.value);
                              const n = parseFloat(e.target.value), l = parseFloat(editLat);
                              if (!isNaN(n) && !isNaN(l)) { setEditMarker({ lat: l, lng: n }); setEditCenter({ lat: l, lng: n }); }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {saveMsg && (
                      <div style={{ background: saveMsg.startsWith("Error") ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${saveMsg.startsWith("Error") ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`, borderRadius: "8px", padding: "10px 14px", color: saveMsg.startsWith("Error") ? "var(--danger)" : "var(--teal-lt)", fontSize: "0.85rem" }}>
                        {saveMsg}
                      </div>
                    )}

                    <button className="btn btn-primary" onClick={saveInfo} disabled={saving}
                      style={{ width: "100%", padding: "12px" }}>
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                )}

                {/* ── TAB FOTOS ── */}
                {activeTab === "fotos" && (
                  <div className={s.editForm}>
                    <p className={s.photosHint}>
                      Tienes {currentImages.length} foto{currentImages.length !== 1 ? "s" : ""}. Máximo 6.
                    </p>
                    <div className={s.photoGrid}>
                      {currentImages.map((img, i) => (
                        <div key={img.id} style={{ position: "relative", aspectRatio: "1", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)" }}>
                          <img src={img.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button onClick={() => deleteImage(img.id, img.url)} style={{
                            position: "absolute", top: "6px", right: "6px",
                            background: "rgba(239,68,68,0.85)", color: "white",
                            border: "none", borderRadius: "50%", width: "24px", height: "24px",
                            cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center",
                          }}>✕</button>
                          {i === 0 && (
                            <div style={{ position: "absolute", bottom: "6px", left: "6px", background: "var(--teal)", color: "white", fontSize: "0.65rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                              Principal
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Nuevas fotos preview */}
                      {newPreviews.map((src, i) => (
                        <div key={`new-${i}`} className={s.photoNew}>
                          <img src={src} alt="" />
                          <div className={s.photoNewOverlay}>
                            <span className={s.photoNewLabel}>Por subir</span>
                          </div>
                        </div>
                      ))}

                      {/* Botón agregar */}
                      {(currentImages.length + newPreviews.length) < 6 && (
                        <div onClick={() => fileInputRef.current?.click()} style={{
                          aspectRatio: "1", border: "2px dashed var(--border)", borderRadius: "10px",
                          cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
                          background: "var(--surface2)", color: "var(--muted)",
                        }}>
                          <span style={{ fontSize: "1.4rem" }}>+</span>
                          <span style={{ fontSize: "0.72rem" }}>Agregar</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleNewFiles}
                      style={{ display: "none" }}
                    />
                    {newFiles.length > 0 && (
                      <button className={s.btnPrimary} onClick={uploadNewPhotos} disabled={uploadingPhotos}>
                        {uploadingPhotos
                          ? "Subiendo fotos..."
                          : `Subir ${newFiles.length} foto${newFiles.length > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </div>
                )}

                {/* ── TAB RESEÑAS ── */}
                {activeTab === "resenas" && (
                  <div className={s.editForm}>
                    {loadingReviews ? (
                      <p className={s.loadingText}>Cargando reseñas...</p>
                    ) : reviews.length === 0 ? (
                      <p style={{ color: "rgba(255,255,255,0.42)", textAlign: "center", padding: "2rem" }}>
                        Aún no tienes reseñas
                      </p>
                    ) : reviews.map(review => (
                      <div key={review.id} className={s.reviewCard}>
                        <div className={s.reviewTopRow}>
                          <div className={s.reviewStars}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <div
                                key={star}
                                className={`${s.reviewStar} ${star <= review.rating ? s.reviewStarFilled : s.reviewStarEmpty}`}
                              />
                            ))}
                            <span className={s.reviewRatingLabel}>{review.rating}/5</span>
                          </div>
                          <div className={s.reviewActions}>
                            <span className={s.reviewDate}>
                              {new Date(review.created_at).toLocaleDateString("es-MX")}
                            </span>
                            <button className={s.btnDeleteReview} onClick={() => deleteReview(review.id)}>
                              Eliminar
                            </button>
                          </div>
                        </div>
                        {review.comment && <p className={s.reviewComment}>{review.comment}</p>}
                        {review.reply && (
                          <div className={s.reviewReply}>
                            <p className={s.reviewReplyLabel}>Tu respuesta</p>
                            <p className={s.reviewReplyText}>{review.reply}</p>
                          </div>
                        )}
                        <div className={s.reviewReplyRow}>
                          <input
                            className={`${s.input} ${s.reviewReplyInput}`}
                            placeholder={review.reply ? "Editar respuesta..." : "Responder..."}
                            value={replyText[review.id] ?? ""}
                            onChange={e => setReplyText(p => ({ ...p, [review.id]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && saveReply(review.id)}
                          />
                          <button
                            className={s.btnPrimarySmall}
                            disabled={savingReply === review.id || !replyText[review.id]?.trim()}
                            onClick={() => saveReply(review.id)}
                          >
                            {savingReply === review.id ? "..." : review.reply ? "Editar" : "Responder"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* ── TAB CRECER ── */}
                {activeTab === "crecer" && editingNegocio && (() => {
                  const SUGERENCIAS = [
                    "¿Cómo acepto pagos con tarjeta?",
                    "¿Cómo mejorar mis ventas?",
                    "¿Cómo digitalizo mi negocio?",
                    "¿Cómo consigo más clientes?",
                  ];
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                      {/* Header Coppel Emprende */}
                      <a href="https://www.coppelemprende.com/coppelemprende" target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: "12px", background: "#003087", borderRadius: "10px", padding: "12px 16px", textDecoration: "none" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px" }}>🚀</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", margin: 0 }}>Asistente Coppel Emprende</p>
                          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", margin: "2px 0 0" }}>Capacitación gratuita para tu negocio · Fundación Coppel</p>
                        </div>
                        <span style={{ fontSize: "0.68rem", background: "#22c55e", color: "white", borderRadius: "20px", padding: "3px 8px", fontWeight: 700, flexShrink: 0 }}>GRATIS</span>
                      </a>

                      {/* Video oficial embebido de fundacioncoppel.org */}
                      {crecerAsesoria?.mostrarVideo && (
                        <div style={{ borderRadius: "10px", overflow: "hidden", background: "#000", position: "relative" }}>
                          <video controls style={{ width: "100%", display: "block", maxHeight: "220px", objectFit: "cover" }}
                            poster="https://www.fundacioncoppel.org/wp-content/uploads/2024/04/coppel-emprende-final-1024x576.jpg">
                            <source src="https://www.fundacioncoppel.org/wp-content/uploads/2024/02/coppel-comofuncionaenko.mp4" type="video/mp4" />
                          </video>
                          <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(0,0,0,0.65)", borderRadius: "5px", padding: "3px 8px" }}>
                            <span style={{ fontSize: "0.68rem", color: "white", fontWeight: 600 }}>▶ ¿Cómo funciona Coppel Emprende?</span>
                          </div>
                        </div>
                      )}

                      {/* Chat */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: "120px" }}>
                        {crecerMsgs.length === 0 && crecerLoading && (
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#003087", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🤖</div>
                            <div style={{ background: "var(--surface2)", borderRadius: "0 10px 10px 10px", padding: "12px 14px" }}>
                              <div style={{ display: "flex", gap: "5px" }}>
                                {[0, 0.2, 0.4].map((d, i) => (
                                  <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#003087", animation: `pulse 1s infinite ${d}s` }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {crecerMsgs.map((msg, i) => (
                          <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                            {msg.role === "assistant" && (
                              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#003087", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "14px" }}>🤖</div>
                            )}
                            <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: "6px" }}>
                              <div style={{
                                background: msg.role === "user" ? "#003087" : "var(--surface2)",
                                color: msg.role === "user" ? "white" : "var(--text)",
                                borderRadius: msg.role === "user" ? "10px 0 10px 10px" : "0 10px 10px 10px",
                                padding: "10px 14px", fontSize: "0.85rem", lineHeight: 1.55,
                              }}>
                                {msg.content}
                              </div>

                              {/* Tarjeta estructurada en el primer análisis */}
                              {msg.role === "assistant" && msg.structured && i === 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#EFF6FF", color: "#1d4ed8", borderRadius: "20px", padding: "3px 10px", border: "1px solid #BFDBFE", alignSelf: "flex-start" }}>
                                    📊 {msg.structured.categoria?.toUpperCase()}
                                  </span>
                                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "12px 14px" }}>
                                    <p style={{ fontSize: "0.74rem", fontWeight: 700, color: "#1e40af", margin: "0 0 4px" }}>✅ Recomendación</p>
                                    <p style={{ fontSize: "0.83rem", color: "#1e3a8a", margin: 0, lineHeight: 1.5 }}>{msg.structured.recomendacion}</p>
                                  </div>
                                  {msg.structured.acciones?.length > 0 && (
                                    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px" }}>
                                      <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Pasos a seguir</p>
                                      {msg.structured.acciones.map((a: string, j: number) => (
                                        <div key={j} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: j < msg.structured!.acciones.length - 1 ? "8px" : 0 }}>
                                          <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#003087", color: "white", fontSize: "0.68rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>{j + 1}</span>
                                          <p style={{ fontSize: "0.83rem", color: "var(--text)", margin: 0, lineHeight: 1.4 }}>{a}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {msg.structured.aprendizaje?.tema && (
                                    <div style={{ background: "#003087", borderRadius: "10px", padding: "12px 14px" }}>
                                      <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.65)", margin: "0 0 4px" }}>🎓 Aprende en Coppel Emprende</p>
                                      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "white", margin: "0 0 3px" }}>{msg.structured.aprendizaje.tema}</p>
                                      <p style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.4 }}>{msg.structured.aprendizaje.descripcion}</p>
                                    </div>
                                  )}
                                  {msg.accion && (
                                    <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 12px" }}>
                                      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#166534", margin: 0 }}>💡 {msg.accion}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Acción en mensajes de seguimiento */}
                              {msg.role === "assistant" && msg.accion && i > 0 && (
                                <div style={{ padding: "8px 10px", background: "#EFF6FF", borderRadius: "6px", borderLeft: "3px solid #003087" }}>
                                  <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1e3a8a", margin: 0 }}>💡 {msg.accion}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {crecerLoading && crecerMsgs.length > 0 && (
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#003087", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🤖</div>
                            <div style={{ background: "var(--surface2)", borderRadius: "0 10px 10px 10px", padding: "12px 14px" }}>
                              <div style={{ display: "flex", gap: "5px" }}>
                                {[0, 0.2, 0.4].map((d, i) => (
                                  <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#003087", animation: `pulse 1s infinite ${d}s` }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sugerencias rápidas */}
                      {crecerMsgs.length <= 1 && !crecerLoading && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {SUGERENCIAS.map((s, i) => (
                            <button key={i} onClick={() => sendCrecer(s, editingNegocio)}
                              style={{ fontSize: "0.78rem", padding: "6px 12px", borderRadius: "20px", border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1d4ed8", cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Input */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input value={crecerInput} onChange={e => setCrecerInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && sendCrecer(crecerInput, editingNegocio)}
                          placeholder="Pregunta algo sobre tu negocio..."
                          className="input" style={{ flex: 1, fontSize: "0.85rem" }} />
                        <button onClick={() => sendCrecer(crecerInput, editingNegocio)}
                          disabled={crecerLoading || !crecerInput.trim()}
                          style={{ padding: "0 16px", background: "#003087", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", opacity: crecerLoading || !crecerInput.trim() ? 0.5 : 1, fontSize: "18px" }}>
                          ➤
                        </button>
                      </div>

                      {/* Artículo oficial de Fundación Coppel */}
                      <a href="https://www.fundacioncoppel.org/2024/04/15/coppel-emprende-herramienta-para-transformar-tu-emprendimiento/"
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", gap: "12px", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", textDecoration: "none" }}>
                        <img src="https://www.fundacioncoppel.org/wp-content/uploads/2024/04/coppel-emprende-final-1024x576.jpg"
                          alt="Coppel Emprende" style={{ width: "64px", height: "44px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.35 }}>Coppel Emprende: herramienta para transformar tu emprendimiento</p>
                          <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "3px 0 0" }}>Artículo oficial · fundacioncoppel.org</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                      </a>

                      {/* CTA registro */}
                      <a href="https://www.coppelemprende.com/coppelemprende" target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#003087", color: "white", borderRadius: "10px", padding: "13px", fontSize: "0.88rem", fontWeight: 700, textDecoration: "none" }}>
                        Regístrate gratis en Coppel Emprende →
                      </a>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "0.9rem" }}>Selecciona un negocio para editar</p>
            </div>
          )}

          {/* CHATBOT — 3ª columna, solo desktop */}
          {!isMobile && <ChatbotNegocios />}

        </div>{/* fin layout */}

      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600,
  color: "var(--muted)", marginBottom: "8px",
  letterSpacing: "0.05em", textTransform: "uppercase",
};
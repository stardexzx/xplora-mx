"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { supabase } from "../../services/supabase";
import { uploadImage } from "../../services/cloudinary";
import { useMaps } from "../../context/MapsContext";

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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MisNegocios() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded: mapLoaded } = useMaps();

  const [authChecked, setAuthChecked]   = useState(false);
  const [userId, setUserId]             = useState<string | null>(null);
  const [negocios, setNegocios]         = useState<Negocio[]>([]);
  const [loadingNegocios, setLoadingNegocios] = useState(true);

  // Panel activo: null = lista, string = id del negocio en edición
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<"info" | "fotos" | "resenas">("info");

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
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState("");

  // Fotos
  const [currentImages, setCurrentImages] = useState<NegocioImg[]>([]);
  const [newFiles, setNewFiles]         = useState<File[]>([]);
  const [newPreviews, setNewPreviews]   = useState<string[]>([]);
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
      if (!data.user) { router.replace("/login"); return; }
      setUserId(data.user.id);
      setAuthChecked(true);
    });
  }, [router]);

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
    const { error } = await supabase.from("reviews")
      .update({ reply }).eq("id", reviewId);
    if (!error) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply } : r));
      setReplyText(prev => ({ ...prev, [reviewId]: "" }));
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

  if (!authChecked) return null;

  const editingNegocio = negocios.find(n => n.id === editingId);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'DM Sans', sans-serif" }}>

        {/* HEADER */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: isMobile ? "12px 16px" : "14px 24px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(10,15,13,0.95)", backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap",
        }}>
          <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, var(--teal), var(--teal-dk))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>🌎</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.95rem" }}>Xplora<span style={{ background: "var(--orange)", color: "#fff", padding: "1px 6px 2px", borderRadius: "5px", fontSize: "0.68rem", fontWeight: 700, marginLeft: "4px" }}>MX</span></span>
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

        <div style={{ display: "flex", height: isMobile ? "auto" : "calc(100vh - 57px)", flexDirection: isMobile ? "column" : "row" }}>

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
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>No tienes negocios registrados</p>
                <button className="btn btn-primary" style={{ fontSize: "0.85rem" }} onClick={() => router.push("/dashboard")}>
                  Registrar mi primer negocio
                </button>
              </div>
            ) : (
              <div>
                {negocios.map(n => {
                  const st = STATUS_LABELS[n.status] ?? STATUS_LABELS.pending;
                  const isActive = editingId === n.id;
                  return (
                    <div key={n.id} onClick={() => openEdit(n)} style={{
                      display: "flex", gap: "12px", padding: "14px 16px",
                      borderBottom: "1px solid var(--border)", cursor: "pointer",
                      background: isActive ? "rgba(29,138,140,0.06)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--teal)" : "3px solid transparent",
                      transition: "all 0.15s",
                    }}>
                      {/* Thumbnail */}
                      <div style={{ width: "52px", height: "52px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        {n.image_url ? (
                          <img src={n.image_url} alt={n.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🏪</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.name}</p>
                        <p style={{ margin: "2px 0 6px", color: "var(--muted)", fontSize: "0.78rem" }}>{n.category}</p>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PANEL DE EDICIÓN */}
          {editingNegocio ? (
            <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)", minHeight: isMobile ? "auto" : 0 }}>

              {/* Sub-header del negocio */}
              <div style={{ padding: isMobile ? "12px 16px" : "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", background: "var(--surface)" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{editingNegocio.name}</h2>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>{editingNegocio.category}</p>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                  <button className="btn btn-danger" style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                    onClick={() => deleteNegocio(editingNegocio.id, editingNegocio.name)}>
                    Eliminar negocio
                  </button>
                  <button className="btn btn-ghost" style={{ fontSize: "0.8rem" }} onClick={closeEdit}>✕</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                {(["info", "fotos", "resenas"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: "12px 20px", border: "none", background: "transparent",
                    cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: "0.85rem",
                    color: activeTab === tab ? "var(--teal)" : "var(--muted)",
                    borderBottom: activeTab === tab ? "2px solid var(--teal)" : "2px solid transparent",
                    transition: "all 0.2s",
                  }}>
                    {tab === "info" ? "Información" : tab === "fotos" ? `Fotos (${currentImages.length})` : `Reseñas (${reviews.length})`}
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
                          <button key={c.value} onClick={() => setEditCategory(c.value)} style={{
                            padding: "8px 10px", borderRadius: "8px", border: "1px solid",
                            cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit",
                            borderColor: editCategory === c.value ? "var(--teal)" : "var(--border)",
                            background: editCategory === c.value ? "var(--teal-a)" : "var(--surface2)",
                            color: editCategory === c.value ? "var(--teal-lt)" : "var(--text)",
                          }}>{c.label}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Descripción</label>
                      <textarea className="input" rows={3} value={editDescription}
                        onChange={e => setEditDescription(e.target.value)} style={{ resize: "vertical" }} />
                    </div>

                    <div>
                      <label style={labelStyle}>Etiquetas</label>
                      <input className="input" placeholder="barato, romántico, familiar..." value={editTags}
                        onChange={e => setEditTags(e.target.value)} />
                    </div>

                    <div>
                      <label style={labelStyle}>Teléfono / WhatsApp</label>
                      <input className="input" placeholder="+52 222 123 4567"
                        value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                    </div>

                    <div>
                      <label style={labelStyle}>Sitio web</label>
                      <input className="input" placeholder="www.minegocio.mx"
                        value={editWebsite} onChange={e => setEditWebsite(e.target.value)} />
                    </div>

                    <div>
                      <label style={labelStyle}>Horario</label>
                      <input className="input" placeholder="Lun–Vie 9:00–20:00, Sáb 10:00–18:00"
                        value={editOpeningHours} onChange={e => setEditOpeningHours(e.target.value)} />
                    </div>

                    {/* Mini mapa de ubicación */}
                    <div>
                      <label style={labelStyle}>Ubicación</label>
                      <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)", height: "220px", marginBottom: "10px" }}>
                        {mapLoaded ? (
                          <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }}
                            center={editCenter} zoom={editMarker ? 15 : 13}
                            onClick={handleMapClick} options={{ styles: darkMapStyle, zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}>
                            {editMarker && (
                              <Marker position={editMarker} draggable onDragEnd={e => {
                                if (!e.latLng) return;
                                const lat = parseFloat(e.latLng.lat().toFixed(7));
                                const lng = parseFloat(e.latLng.lng().toFixed(7));
                                setEditMarker({ lat, lng }); setEditLat(String(lat)); setEditLng(String(lng));
                              }} />
                            )}
                          </GoogleMap>
                        ) : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>Cargando mapa...</div>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div>
                          <label style={{ ...labelStyle, marginBottom: "4px" }}>Latitud</label>
                          <input className="input" value={editLat} onChange={e => {
                            setEditLat(e.target.value);
                            const n = parseFloat(e.target.value);
                            const lng = parseFloat(editLng);
                            if (!isNaN(n) && !isNaN(lng)) { setEditMarker({ lat: n, lng }); setEditCenter({ lat: n, lng }); }
                          }} style={{ fontSize: "0.85rem" }} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, marginBottom: "4px" }}>Longitud</label>
                          <input className="input" value={editLng} onChange={e => {
                            setEditLng(e.target.value);
                            const n = parseFloat(e.target.value);
                            const lat = parseFloat(editLat);
                            if (!isNaN(n) && !isNaN(lat)) { setEditMarker({ lat, lng: n }); setEditCenter({ lat, lng: n }); }
                          }} style={{ fontSize: "0.85rem" }} />
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                      Tienes {currentImages.length} foto{currentImages.length !== 1 ? "s" : ""}. Máximo 6.
                    </p>

                    {/* Fotos actuales */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
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
                        <div key={`new-${i}`} style={{ position: "relative", aspectRatio: "1", borderRadius: "10px", overflow: "hidden", border: "2px dashed var(--teal)", opacity: 0.8 }}>
                          <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", inset: 0, background: "var(--teal-a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "var(--teal)", fontWeight: 700, fontSize: "0.75rem" }}>Por subir</span>
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

                    <input ref={fileInputRef} type="file" accept="image/*" multiple
                      onChange={handleNewFiles} style={{ display: "none" }} />

                    {newFiles.length > 0 && (
                      <button className="btn btn-primary" onClick={uploadNewPhotos} disabled={uploadingPhotos}
                        style={{ width: "100%", padding: "12px" }}>
                        {uploadingPhotos ? "Subiendo fotos..." : `Subir ${newFiles.length} foto${newFiles.length > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </div>
                )}

                {/* ── TAB RESEÑAS ── */}
                {activeTab === "resenas" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {loadingReviews ? (
                      <p style={{ color: "var(--muted)" }}>Cargando reseñas...</p>
                    ) : reviews.length === 0 ? (
                      <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
                        Aún no tienes reseñas
                      </p>
                    ) : reviews.map(review => (
                      <div key={review.id} className="card" style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {[1,2,3,4,5].map(s => (
                              <div key={s} style={{ width: "12px", height: "12px", borderRadius: "2px", background: s <= review.rating ? "var(--teal)" : "var(--surface2)" }} />
                            ))}
                            <span style={{ fontSize: "0.78rem", color: "var(--muted)", marginLeft: "6px" }}>{review.rating}/5</span>
                          </div>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                              {new Date(review.created_at).toLocaleDateString("es-MX")}
                            </span>
                            <button onClick={() => deleteReview(review.id)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.75rem" }}>
                              Eliminar
                            </button>
                          </div>
                        </div>

                        {review.comment && (
                          <p style={{ margin: "0 0 10px", fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.5 }}>
                            {review.comment}
                          </p>
                        )}

                        {/* Respuesta existente */}
                        {review.reply && (
                          <div style={{ background: "rgba(29,138,140,0.06)", border: "1px solid var(--teal-a)", borderRadius: "8px", padding: "10px 12px", marginBottom: "8px" }}>
                            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--teal)", fontWeight: 600, marginBottom: "4px" }}>Tu respuesta</p>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)" }}>{review.reply}</p>
                          </div>
                        )}

                        {/* Input respuesta */}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input className="input" placeholder={review.reply ? "Editar respuesta..." : "Responder a esta reseña..."}
                            value={replyText[review.id] ?? ""}
                            onChange={e => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                            style={{ flex: 1, fontSize: "0.85rem" }}
                            onKeyDown={e => e.key === "Enter" && saveReply(review.id)}
                          />
                          <button className="btn btn-primary" style={{ fontSize: "0.82rem", padding: "8px 14px", whiteSpace: "nowrap" }}
                            disabled={savingReply === review.id || !replyText[review.id]?.trim()}
                            onClick={() => saveReply(review.id)}>
                            {savingReply === review.id ? "..." : review.reply ? "Editar" : "Responder"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "0.9rem" }}>Selecciona un negocio para editar</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600,
  color: "var(--muted)", marginBottom: "8px",
  letterSpacing: "0.05em", textTransform: "uppercase",
};
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { supabase } from "../../services/supabase";
import { uploadImage } from "../../services/cloudinary";
import { useMaps } from "../../context/MapsContext";
import MenuManager from "../../component/MenuManager";
import s from "./MisNegocios.module.css";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type NegocioImg = { id: string; url: string; order_index: number };

type Negocio = {
  id: string; name: string; category: string; description: string;
  tags: string; lat: number; lng: number; status: string;
  image_url: string | null; rating: number | null;
  negocio_images: NegocioImg[];
  phone?: string | null; website?: string | null;
  opening_hours?: string | null;
};

type Review = {
  id: string; rating: number; comment: string; created_at: string;
  reply?: string | null; user_id: string;
};

type DaySchedule = { open: boolean; from: string; to: string };
type WeekSchedule = Record<string, DaySchedule>;

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATS = [
  { value: "comida",          label: "Comida" },
  { value: "tours",           label: "Tours" },
  { value: "hospedaje",       label: "Hospedaje" },
  { value: "artesanias",      label: "Artesanías" },
  { value: "entretenimiento", label: "Entretenimiento" },
];

const TAGS_OPTIONS = [
  "barato", "lujo", "seguro", "familiar", "romantico", "turistico",
  "gastronomico", "cultural", "vida nocturna", "al aire libre",
  "con niños", "pet friendly", "sin gluten",
];

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const DEFAULT_SCHEDULE: WeekSchedule = {
  Lunes:     { open: true,  from: "09:00", to: "20:00" },
  Martes:    { open: true,  from: "09:00", to: "20:00" },
  Miércoles: { open: true,  from: "09:00", to: "20:00" },
  Jueves:    { open: true,  from: "09:00", to: "20:00" },
  Viernes:   { open: true,  from: "09:00", to: "20:00" },
  Sábado:    { open: true,  from: "10:00", to: "18:00" },
  Domingo:   { open: false, from: "10:00", to: "18:00" },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "En revisión", color: "#F0D224", bg: "rgba(240,210,36,0.1)" },
  approved: { label: "Publicado",   color: "#1CA8F7", bg: "rgba(28,168,247,0.1)" },
  rejected: { label: "Rechazado",   color: "#FF594D", bg: "rgba(255,89,77,0.1)"  },
};

const darkMapStyle = [
  { elementType: "geometry",         stylers: [{ color: "#020c1f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#1CA8F7" }] },
  { featureType: "road",  elementType: "geometry", stylers: [{ color: "#0a1628" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050e20" }] },
  { featureType: "poi",   elementType: "geometry", stylers: [{ color: "#0d1a30" }] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSchedule(raw: string | null | undefined): WeekSchedule {
  if (!raw) return { ...DEFAULT_SCHEDULE };
  try {
    const parsed = JSON.parse(raw);
    const result: WeekSchedule = { ...DEFAULT_SCHEDULE };
    for (const day of DAYS) { if (parsed[day]) result[day] = parsed[day]; }
    return result;
  } catch { return { ...DEFAULT_SCHEDULE }; }
}

const parseList = (raw: string | null | undefined) =>
  raw ? raw.split(",").map(t => t.trim()).filter(Boolean) : [];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function MisNegocios() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isLoaded: mapLoaded } = useMaps();

  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId]           = useState<string | null>(null);
  const [negocios, setNegocios]       = useState<Negocio[]>([]);
  const [loadingNegocios, setLoadingNegocios] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "fotos" | "resenas" | "menus">("info");

  const [editName, setEditName]               = useState("");
  const [editCategory, setEditCategory]       = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPhone, setEditPhone]             = useState("");
  const [editWebsite, setEditWebsite]         = useState("");
  const [editLat, setEditLat]                 = useState("");
  const [editLng, setEditLng]                 = useState("");
  const [editMarker, setEditMarker]           = useState<{ lat: number; lng: number } | null>(null);
  const [editCenter, setEditCenter]           = useState({ lat: 19.0414, lng: -98.2063 });

  const [selectedTags, setSelectedTags]         = useState<string[]>([]);
  const [schedule, setSchedule]                 = useState<WeekSchedule>({ ...DEFAULT_SCHEDULE });

  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [currentImages, setCurrentImages]     = useState<NegocioImg[]>([]);
  const [newFiles, setNewFiles]               = useState<File[]>([]);
  const [newPreviews, setNewPreviews]         = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [reviews, setReviews]               = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [replyText, setReplyText]           = useState<Record<string, string>>({});
  const [savingReply, setSavingReply]       = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/login"); return; }
      setUserId(data.user.id);
      setAuthChecked(true);
    });
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    setLoadingNegocios(true);
    supabase.from("negocios")
      .select("*, negocio_images(id, url, order_index)")
      .eq("owner_id", userId)
      .order("id", { ascending: false })
      .then(({ data }) => { setNegocios((data ?? []) as Negocio[]); setLoadingNegocios(false); });
  }, [userId]);

  const openEdit = (n: Negocio) => {
    setEditingId(n.id); setActiveTab("info");
    setEditName(n.name); setEditCategory(n.category);
    setEditDescription(n.description ?? "");
    setEditPhone(n.phone ?? ""); setEditWebsite(n.website ?? "");
    setEditLat(String(n.lat ?? "")); setEditLng(String(n.lng ?? ""));
    if (n.lat && n.lng) { setEditMarker({ lat: n.lat, lng: n.lng }); setEditCenter({ lat: n.lat, lng: n.lng }); }
    setSelectedTags(parseList(n.tags));
    setSchedule(parseSchedule(n.opening_hours));
    setCurrentImages([...n.negocio_images].sort((a, b) => a.order_index - b.order_index));
    setNewFiles([]); setNewPreviews([]); setSaveMsg("");
    loadReviews(n.id);
  };

  const closeEdit = () => { setEditingId(null); setSaveMsg(""); };

  const toggleTag     = (t: string) => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleDay     = (day: string) => setSchedule(p => ({ ...p, [day]: { ...p[day], open: !p[day].open } }));
  const setDayTime    = (day: string, field: "from" | "to", val: string) =>
    setSchedule(p => ({ ...p, [day]: { ...p[day], [field]: val } }));

  const saveInfo = async () => {
    if (!editingId) return;
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.from("negocios").update({
      name: editName, category: editCategory, description: editDescription,
      tags: selectedTags.join(", "),
      lat: parseFloat(editLat), lng: parseFloat(editLng),
      phone: editPhone.trim() || null, website: editWebsite.trim() || null,
      opening_hours: JSON.stringify(schedule),
    }).eq("id", editingId);
    setSaveMsg(error ? "Error: " + error.message : "Cambios guardados");
    if (!error) setNegocios(p => p.map(n => n.id === editingId ? { ...n, name: editName, category: editCategory } : n));
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = parseFloat(e.latLng.lat().toFixed(7));
    const lng = parseFloat(e.latLng.lng().toFixed(7));
    setEditMarker({ lat, lng }); setEditLat(String(lat)); setEditLng(String(lng));
  }, []);

  const deleteImage = async (imgId: string) => {
    await supabase.from("negocio_images").delete().eq("id", imgId);
    setCurrentImages(prev => {
      const r = prev.filter(i => i.id !== imgId);
      if (editingId) supabase.from("negocios").update({ image_url: r[0]?.url ?? null }).eq("id", editingId);
      return r;
    });
  };

  const handleNewFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 6 - currentImages.length);
    setNewFiles(p => [...p, ...files]);
    setNewPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };

  const uploadNewPhotos = async () => {
    if (!editingId || !newFiles.length) return;
    setUploadingPhotos(true);
    const uploaded: NegocioImg[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      try {
        const url = await uploadImage(newFiles[i]);
        const { data } = await supabase.from("negocio_images")
          .insert({ negocio_id: editingId, url, order_index: currentImages.length + i })
          .select().single();
        if (data) uploaded.push(data as NegocioImg);
      } catch { /* skip */ }
    }
    if (currentImages.length === 0 && uploaded[0])
      await supabase.from("negocios").update({ image_url: uploaded[0].url }).eq("id", editingId);
    setCurrentImages(p => [...p, ...uploaded]);
    setNewFiles([]); setNewPreviews([]); setUploadingPhotos(false);
  };

  const loadReviews = async (nid: string) => {
    setLoadingReviews(true);
    const { data } = await supabase.from("reviews").select("*").eq("negocio_id", nid).order("created_at", { ascending: false });
    setReviews((data ?? []) as Review[]);
    setLoadingReviews(false);
  };

  const saveReply = async (reviewId: string) => {
    const reply = replyText[reviewId]?.trim();
    if (!reply) return;
    setSavingReply(reviewId);
    const { error } = await supabase.from("reviews").update({ reply }).eq("id", reviewId);
    if (!error) { setReviews(p => p.map(r => r.id === reviewId ? { ...r, reply } : r)); setReplyText(p => ({ ...p, [reviewId]: "" })); }
    setSavingReply(null);
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm("¿Eliminar esta reseña?")) return;
    await supabase.from("reviews").delete().eq("id", reviewId);
    setReviews(p => p.filter(r => r.id !== reviewId));
  };

  const deleteNegocio = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" permanentemente?`)) return;
    const { error } = await supabase.from("negocios").delete().eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    setNegocios(p => p.filter(n => n.id !== id));
    if (editingId === id) closeEdit();
  };

  if (!authChecked) return null;
  const editingNegocio = negocios.find(n => n.id === editingId);

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <div className={s.root}>

        {/* HEADER */}
        <div className={`${s.header} ${mounted && isMobile ? s.headerMobile : ""}`}>
          <button className={s.logoBtn} onClick={() => router.push("/")}>
            <div className={s.logoIcon}>🌎</div>
            <span className={s.logoName}>Xplora<span className={s.logoBadge}>MX</span></span>
          </button>
          <span className={s.breadcrumb}>/</span>
          <span className={s.breadcrumbLabel}>Mis negocios</span>
          <div className={s.headerActions}>
            <button className={s.btnPrimarySmall} onClick={() => router.push("/dashboard")}>
              {mounted && isMobile ? "+" : "+ Registrar"}
            </button>
            <button className={s.btnGhost} onClick={() => router.push("/")}>←</button>
          </div>
        </div>

        {/* LAYOUT */}
        <div className={`${s.layout} ${mounted && isMobile ? s.layoutMobile : ""}`}>

          {/* SIDEBAR */}
          <div className={`${s.sidebar} ${mounted && isMobile ? s.sidebarMobile : ""}>`}>
            {loadingNegocios ? (
              <p className={s.loadingText}>Cargando...</p>
            ) : negocios.length === 0 ? (
              <div className={s.sidebarEmpty}>
                <p className={s.sidebarEmptyText}>No tienes negocios registrados</p>
                <button className={s.btnPrimary} style={{ fontSize: "0.85rem" }}
                  onClick={() => router.push("/dashboard")}>Registrar mi primer negocio</button>
              </div>
            ) : negocios.map(n => {
              const st = STATUS_LABELS[n.status] ?? STATUS_LABELS.pending;
              return (
                <div key={n.id}
                  className={`${s.negocioItem} ${editingId === n.id ? s.negocioItemActive : ""}`}
                  onClick={() => openEdit(n)}>
                  <div className={s.negocioThumb}>
                    {n.image_url ? <img src={n.image_url} alt={n.name} /> : "🏪"}
                  </div>
                  <div className={s.negocioInfo}>
                    <p className={s.negocioName}>{n.name}</p>
                    <p className={s.negocioCategory}>{n.category}</p>
                    <span className={s.statusBadge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PANEL */}
          {editingNegocio ? (
            <div className={`${s.editPanel} ${mounted && isMobile ? s.editPanelMobile : ""}`}>

              <div className={`${s.editHeader} ${mounted && isMobile ? s.editHeaderMobile : ""}`}>
                <div>
                  <h2 className={s.editTitle}>{editingNegocio.name}</h2>
                  <p className={s.editSubtitle}>{editingNegocio.category}</p>
                </div>
                <div className={s.editHeaderActions}>
                  <button className={s.btnDanger} onClick={() => deleteNegocio(editingNegocio.id, editingNegocio.name)}>
                    Eliminar negocio
                  </button>
                  <button className={s.btnGhost} onClick={closeEdit}>✕</button>
                </div>
              </div>

              {/* Tabs */}
              <div className={s.tabs}>
                {(["info", "fotos", "resenas", "menus"] as const).map(tab => (
                  <button key={tab} className={`${s.tab} ${activeTab === tab ? s.tabActive : ""}`} onClick={() => setActiveTab(tab)}>
                    {tab === "info" ? "Información" : tab === "fotos" ? `Fotos (${currentImages.length})` : tab === "resenas" ? `Reseñas (${reviews.length})` : "Menús"}
                  </button>
                ))}
              </div>

              <div className={`${s.editContent} ${mounted && isMobile ? s.editContentMobile : ""}`}>

                {/* ═══ TAB INFO ═══ */}
                {activeTab === "info" && (
                  <div className={s.editForm}>

                    <div>
                      <label className={s.label}>Nombre del negocio</label>
                      <input className={s.input} value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>

                    <div>
                      <label className={s.label}>Categoría</label>
                      <div className={s.catGrid}>
                        {CATS.map(c => (
                          <button key={c.value}
                            className={`${s.catBtn} ${editCategory === c.value ? s.catBtnActive : ""}`}
                            onClick={() => setEditCategory(c.value)}>{c.label}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={s.label}>Descripción</label>
                      <textarea className={`${s.input} ${s.textarea}`} rows={3}
                        value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                    </div>

                    {/* ETIQUETAS */}
                    <div>
                      <label className={s.label}>Etiquetas</label>
                      <div className={s.chipGrid}>
                        {TAGS_OPTIONS.map(tag => (
                          <button key={tag}
                            className={`${s.chip} ${selectedTags.includes(tag) ? s.chipActive : ""}`}
                            onClick={() => toggleTag(tag)}>{tag}</button>
                        ))}
                      </div>
                      <p className={s.chipHint}>Selecciona todas las que apliquen a tu negocio</p>
                    </div>

                    <div>
                      <label className={s.label}>Teléfono / WhatsApp</label>
                      <input className={s.input} placeholder="+52 222 123 4567"
                        value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                    </div>

                    <div>
                      <label className={s.label}>Sitio web</label>
                      <input className={s.input} placeholder="www.minegocio.mx"
                        value={editWebsite} onChange={e => setEditWebsite(e.target.value)} />
                    </div>

                    {/* HORARIO */}
                    <div>
                      <label className={s.label}>Horario</label>
                      <div className={s.scheduleList}>
                        {DAYS.map(day => {
                          const d = schedule[day];
                          return (
                            <div key={day} className={`${s.scheduleRow} ${!d.open ? s.scheduleRowClosed : ""}`}>
                              <label className={s.scheduleCheck}>
                                <input type="checkbox" checked={d.open} onChange={() => toggleDay(day)} className={s.checkboxInput} />
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
                                  <input type="time" value={d.from} onChange={e => setDayTime(day, "from", e.target.value)} className={s.timeInput} />
                                  <span className={s.timeSep}>—</span>
                                  <input type="time" value={d.to} onChange={e => setDayTime(day, "to", e.target.value)} className={s.timeInput} />
                                </div>
                              ) : (
                                <span className={s.scheduleClosed}>Cerrado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* MAPA */}
                    <div>
                      <label className={s.label}>Ubicación</label>
                      <div className={s.mapWrap}>
                        {mapLoaded ? (
                          <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }}
                            center={editCenter} zoom={editMarker ? 15 : 13} onClick={handleMapClick}
                            options={{ styles: darkMapStyle, zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}>
                            {editMarker && (
                              <Marker position={editMarker} draggable onDragEnd={e => {
                                if (!e.latLng) return;
                                const lat = parseFloat(e.latLng.lat().toFixed(7));
                                const lng = parseFloat(e.latLng.lng().toFixed(7));
                                setEditMarker({ lat, lng }); setEditLat(String(lat)); setEditLng(String(lng));
                              }} />
                            )}
                          </GoogleMap>
                        ) : "Cargando mapa..."}
                      </div>
                      <div className={s.coordGrid}>
                        <div>
                          <label className={`${s.label} ${s.labelSm}`}>Latitud</label>
                          <input className={s.input} value={editLat} style={{ fontSize: "0.85rem" }}
                            onChange={e => { setEditLat(e.target.value); const n = parseFloat(e.target.value), l = parseFloat(editLng); if (!isNaN(n) && !isNaN(l)) { setEditMarker({ lat: n, lng: l }); setEditCenter({ lat: n, lng: l }); } }} />
                        </div>
                        <div>
                          <label className={`${s.label} ${s.labelSm}`}>Longitud</label>
                          <input className={s.input} value={editLng} style={{ fontSize: "0.85rem" }}
                            onChange={e => { setEditLng(e.target.value); const n = parseFloat(e.target.value), l = parseFloat(editLat); if (!isNaN(n) && !isNaN(l)) { setEditMarker({ lat: l, lng: n }); setEditCenter({ lat: l, lng: n }); } }} />
                        </div>
                      </div>
                    </div>

                    {saveMsg && (
                      <div className={`${s.saveMsg} ${saveMsg.startsWith("Error") ? s.saveMsgErr : s.saveMsgOk}`}>
                        {saveMsg}
                      </div>
                    )}

                    <button className={s.btnPrimary} onClick={saveInfo} disabled={saving}>
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                )}

                {/* ═══ TAB FOTOS ═══ */}
                {activeTab === "fotos" && (
                  <div className={s.editForm}>
                    <p className={s.photosHint}>Tienes {currentImages.length} foto{currentImages.length !== 1 ? "s" : ""}. Máximo 6.</p>
                    <div className={s.photoGrid}>
                      {currentImages.map((img, i) => (
                        <div key={img.id} className={s.photoItem}>
                          <img src={img.url} alt="" />
                          <button className={s.photoDeleteBtn} onClick={() => deleteImage(img.id)}>✕</button>
                          {i === 0 && <div className={s.photoPrimaryBadge}>Principal</div>}
                        </div>
                      ))}
                      {newPreviews.map((src, i) => (
                        <div key={`new-${i}`} className={s.photoNew}>
                          <img src={src} alt="" />
                          <div className={s.photoNewOverlay}><span className={s.photoNewLabel}>Por subir</span></div>
                        </div>
                      ))}
                      {(currentImages.length + newPreviews.length) < 6 && (
                        <div className={s.photoAddBtn} onClick={() => fileInputRef.current?.click()}>
                          <span className={s.photoAddIcon}>+</span>
                          <span className={s.photoAddText}>Agregar</span>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleNewFiles} style={{ display: "none" }} />
                    {newFiles.length > 0 && (
                      <button className={s.btnPrimary} onClick={uploadNewPhotos} disabled={uploadingPhotos}>
                        {uploadingPhotos ? "Subiendo fotos..." : `Subir ${newFiles.length} foto${newFiles.length > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </div>
                )}

                {/* ═══ TAB RESEÑAS ═══ */}
                {activeTab === "resenas" && (
                  <div className={s.editForm}>
                    {loadingReviews ? <p className={s.loadingText}>Cargando reseñas...</p>
                      : reviews.length === 0 ? <p style={{ color: "rgba(255,255,255,0.42)", textAlign: "center", padding: "2rem" }}>Aún no tienes reseñas</p>
                      : reviews.map(review => (
                        <div key={review.id} className={s.reviewCard}>
                          <div className={s.reviewTopRow}>
                            <div className={s.reviewStars}>
                              {[1,2,3,4,5].map(star => (
                                <div key={star} className={`${s.reviewStar} ${star <= review.rating ? s.reviewStarFilled : s.reviewStarEmpty}`} />
                              ))}
                              <span className={s.reviewRatingLabel}>{review.rating}/5</span>
                            </div>
                            <div className={s.reviewActions}>
                              <span className={s.reviewDate}>{new Date(review.created_at).toLocaleDateString("es-MX")}</span>
                              <button className={s.btnDeleteReview} onClick={() => deleteReview(review.id)}>Eliminar</button>
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
                            <input className={`${s.input} ${s.reviewReplyInput}`}
                              placeholder={review.reply ? "Editar respuesta..." : "Responder..."}
                              value={replyText[review.id] ?? ""}
                              onChange={e => setReplyText(p => ({ ...p, [review.id]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && saveReply(review.id)} />
                            <button className={s.btnPrimarySmall}
                              disabled={savingReply === review.id || !replyText[review.id]?.trim()}
                              onClick={() => saveReply(review.id)}>
                              {savingReply === review.id ? "..." : review.reply ? "Editar" : "Responder"}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* ═══ TAB MENÚS ═══ */}
                {activeTab === "menus" && (
                  <div>
                    <MenuManager negocio_id={editingId || ""} />
                  </div>
                )}
              </div>
            </div>

          ) : (
            <div className={s.emptyState}>
              <p className={s.emptyStateText}>Selecciona un negocio para editar</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
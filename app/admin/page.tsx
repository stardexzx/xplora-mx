"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { supabase } from "../../services/supabase";
import { useMaps } from "../../context/MapsContext";

// ── Tipos ────────────────────────────────────────────────────────────────────
type Negocio = {
  id: string;
  name: string;
  category: string;
  description?: string;
  image_url?: string;
  images?: string[];
  status: string;
  owner_id: string;
  phone?: string;
  website?: string;
  opening_hours?: string;
  tags?: string;
  lat?: number;
  lng?: number;
};

type TabType = "pending" | "approved" | "rejected";

// ── Modal de detalle ─────────────────────────────────────────────────────────
function NegocioModal({ negocio, onClose, onApprove, onReject, onSuspend, onDelete, activeTab }: {
  negocio: Negocio;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSuspend: (id: string) => void;
  onDelete: (id: string) => void;
  activeTab: TabType;
}) {
  const { isLoaded: mapLoaded } = useMaps();
  const [imgIndex, setImgIndex] = useState(0);

  // Todas las imágenes disponibles
  const allImages = negocio.images?.length
    ? negocio.images
    : negocio.image_url
    ? [negocio.image_url]
    : [];

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const tags = negocio.tags ? negocio.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 201,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", pointerEvents: "none",
      }}>
        <div style={{
          background: "#020c1f",
          border: "1px solid rgba(28,66,232,0.3)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "all",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.2,0.64,1)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
        }}>

          {/* Header del modal */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(28,66,232,0.2)",
            flexShrink: 0,
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                {negocio.name}
              </h2>
              <span style={{
                display: "inline-block", marginTop: "4px",
                background: "rgba(28,66,232,0.2)", color: "#1CA8F7",
                border: "1px solid rgba(28,66,232,0.35)",
                borderRadius: "20px", padding: "2px 10px",
                fontSize: "0.72rem", fontWeight: 600,
              }}>
                {negocio.category}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)", cursor: "pointer",
                fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Cuerpo scrollable */}
          <div style={{ overflowY: "auto", flex: 1, padding: "20px" }}>

            {/* ── Galería de imágenes ── */}
            {allImages.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{
                  position: "relative", borderRadius: "12px", overflow: "hidden",
                  height: "220px", background: "#0c2060",
                }}>
                  <img
                    src={allImages[imgIndex]}
                    alt={`Foto ${imgIndex + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setImgIndex(i => (i - 1 + allImages.length) % allImages.length)}
                        style={arrowBtn("left")}
                      >‹</button>
                      <button
                        onClick={() => setImgIndex(i => (i + 1) % allImages.length)}
                        style={arrowBtn("right")}
                      >›</button>
                      <div style={{
                        position: "absolute", bottom: "8px", left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex", gap: "5px",
                      }}>
                        {allImages.map((_, i) => (
                          <div key={i} onClick={() => setImgIndex(i)} style={{
                            width: i === imgIndex ? "18px" : "6px",
                            height: "6px", borderRadius: "3px",
                            background: i === imgIndex ? "#F0D224" : "rgba(255,255,255,0.4)",
                            cursor: "pointer", transition: "all 0.2s",
                          }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {allImages.length > 1 && (
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    {allImages.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        onClick={() => setImgIndex(i)}
                        style={{
                          width: "52px", height: "52px", objectFit: "cover",
                          borderRadius: "8px", cursor: "pointer",
                          border: `2px solid ${i === imgIndex ? "#1C42E8" : "transparent"}`,
                          opacity: i === imgIndex ? 1 : 0.6,
                          transition: "all 0.15s",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Descripción ── */}
            {negocio.description && (
              <div style={{ marginBottom: "16px" }}>
                <Label>Descripción</Label>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                  {negocio.description}
                </p>
              </div>
            )}

            {/* ── Tags ── */}
            {tags.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <Label>Etiquetas</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {tags.map(tag => (
                    <span key={tag} style={{
                      background: "rgba(28,66,232,0.15)", color: "#1CA8F7",
                      border: "1px solid rgba(28,66,232,0.3)",
                      borderRadius: "20px", padding: "3px 10px",
                      fontSize: "0.75rem", fontWeight: 500,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Info de contacto ── */}
            {(negocio.phone || negocio.website || negocio.opening_hours) && (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px",
                marginBottom: "16px",
              }}>
                {negocio.phone && (
                  <InfoBox icon="📞" label="Teléfono" value={negocio.phone} />
                )}
                {negocio.website && (
                  <InfoBox icon="🌐" label="Sitio web" value={negocio.website} link />
                )}
                {negocio.opening_hours && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <InfoBox icon="🕐" label="Horario" value={negocio.opening_hours} />
                  </div>
                )}
              </div>
            )}

            {/* ── Owner ID ── */}
            <div style={{ marginBottom: "16px" }}>
              <Label>Owner ID</Label>
              <p style={{
                margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "0.72rem",
                fontFamily: "monospace", wordBreak: "break-all",
              }}>
                {negocio.owner_id}
              </p>
            </div>

            {/* ── Mapa ── */}
            {negocio.lat && negocio.lng && (
              <div style={{ marginBottom: "4px" }}>
                <Label>Ubicación</Label>
                <div style={{
                  borderRadius: "12px", overflow: "hidden",
                  border: "1px solid rgba(28,66,232,0.25)", height: "200px",
                }}>
                  {mapLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={{ lat: negocio.lat, lng: negocio.lng }}
                      zoom={15}
                      options={{
                        styles: darkMapStyle,
                        disableDefaultUI: true,
                        zoomControl: true,
                      }}
                    >
                      <Marker
                        position={{ lat: negocio.lat, lng: negocio.lng }}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 10,
                          fillColor: "#F0D224",
                          fillOpacity: 1,
                          strokeColor: "#ffffff",
                          strokeWeight: 2,
                        }}
                      />
                    </GoogleMap>
                  ) : (
                    <div style={{
                      height: "100%", display: "flex", alignItems: "center",
                      justifyContent: "center", color: "rgba(255,255,255,0.4)",
                      fontSize: "0.85rem", gap: "8px",
                    }}>
                      <div style={{
                        width: "14px", height: "14px",
                        border: "2px solid #1C42E8", borderTopColor: "transparent",
                        borderRadius: "50%", animation: "spin 0.8s linear infinite",
                      }} />
                      Cargando mapa...
                    </div>
                  )}
                </div>
                <p style={{
                  margin: "6px 0 0", fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.3)", textAlign: "center",
                }}>
                  {negocio.lat.toFixed(6)}, {negocio.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {/* Footer con acciones */}
          <div style={{
            borderTop: "1px solid rgba(28,66,232,0.2)",
            padding: "12px 20px",
            display: "flex", gap: "8px", flexShrink: 0,
            background: "rgba(0,0,0,0.2)",
          }}>
            {activeTab === "pending" && (<>
              <button className="btn btn-primary" style={{ fontSize: "0.85rem" }}
                onClick={() => { onApprove(negocio.id); onClose(); }}>
                ✅ Aprobar
              </button>
              <button className="btn btn-danger" style={{ fontSize: "0.85rem" }}
                onClick={() => { onReject(negocio.id); onClose(); }}>
                ❌ Rechazar
              </button>
            </>)}
            {activeTab === "rejected" && (
              <button className="btn btn-primary" style={{ fontSize: "0.85rem" }}
                onClick={() => { onApprove(negocio.id); onClose(); }}>
                ✅ Aprobar
              </button>
            )}
            {activeTab === "approved" && (
              <button className="btn" style={{
                fontSize: "0.85rem",
                background: "rgba(255,174,67,0.15)", color: "#FFAE43",
                border: "1px solid rgba(255,174,67,0.3)",
              }}
                onClick={() => { onSuspend(negocio.id); onClose(); }}>
                ⏸ Suspender
              </button>
            )}
            <button className="btn btn-danger" style={{ fontSize: "0.85rem", marginLeft: "auto" }}
              onClick={() => { onDelete(negocio.id); onClose(); }}>
              🗑 Eliminar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Helpers de UI ────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 6px", fontSize: "0.72rem", fontWeight: 600,
      color: "rgba(255,255,255,0.42)", letterSpacing: "0.05em", textTransform: "uppercase",
    }}>
      {children}
    </p>
  );
}

function InfoBox({ icon, label, value, link }: { icon: string; label: string; value: string; link?: boolean }) {
  return (
    <div style={{
      background: "rgba(28,66,232,0.08)", border: "1px solid rgba(28,66,232,0.2)",
      borderRadius: "10px", padding: "10px 12px",
    }}>
      <p style={{ margin: "0 0 2px", fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {icon} {label}
      </p>
      {link ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer"
          style={{ color: "#1CA8F7", fontSize: "0.85rem", wordBreak: "break-all" }}>
          {value}
        </a>
      ) : (
        <p style={{ margin: 0, color: "#fff", fontSize: "0.85rem", wordBreak: "break-word" }}>{value}</p>
      )}
    </div>
  );
}

function arrowBtn(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    [side]: "10px",
    width: "32px", height: "32px", borderRadius: "50%",
    background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff", cursor: "pointer", fontSize: "1.3rem",
    display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(4px)",
  };
}

// ── Panel principal ──────────────────────────────────────────────────────────
export default function AdminPanel() {
  const router = useRouter();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [actionMsg, setActionMsg] = useState("");
  const [selectedNegocio, setSelectedNegocio] = useState<Negocio | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", userData.user.id).single();
      if (profile?.role !== "admin") { router.replace("/"); return; }
      setAuthChecked(true);
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    fetchNegocios(activeTab);
  }, [authChecked, activeTab]);

  const fetchNegocios = async (status: TabType) => {
    setLoading(true);
    const { data } = await supabase
      .from("negocios")
      .select("*, negocio_images(url, order_index)")
      .eq("status", status)
      .order("id", { ascending: false });

    const enriched = (data || []).map((n: any) => ({
      ...n,
      images: (n.negocio_images ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((i: any) => i.url),
    }));

    setNegocios(enriched);
    setLoading(false);
  };

  const notify = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 2500);
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("negocios").update({ status }).eq("id", id);
    if (error) { notify("Error: " + error.message); }
    else {
      notify(status === "approved" ? "✅ Negocio aprobado" : "❌ Negocio rechazado");
      setNegocios(prev => prev.filter(n => n.id !== id));
    }
  };

  const deleteNegocio = async (id: string) => {
    if (!confirm("¿Eliminar este negocio permanentemente?")) return;
    await supabase.from("negocios").delete().eq("id", id);
    setNegocios(prev => prev.filter(n => n.id !== id));
    notify("🗑 Negocio eliminado");
  };

  if (!authChecked) return null;

  const tabs: { key: TabType; label: string; emoji: string }[] = [
    { key: "pending",  label: "Pendientes", emoji: "⏳" },
    { key: "approved", label: "Aprobados",  emoji: "✅" },
    { key: "rejected", label: "Rechazados", emoji: "❌" },
  ];

  return (
    <>
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        color: "var(--text)", fontFamily: "var(--font-body)",
      }}>

        {/* HEADER */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 24px", borderBottom: "1px solid var(--border-solid)",
          background: "var(--surface)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <button onClick={() => router.push("/")} style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "none", border: "none", cursor: "pointer", color: "var(--text)",
          }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, var(--blue), var(--dark-blue))",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem",
            }}>🌎</div>
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 800, fontSize: "0.95rem" }}>
              Xplora
              <span style={{
                background: "var(--yellow)", color: "var(--dark-blue)",
                padding: "1px 6px 2px", borderRadius: "5px",
                fontSize: "0.68rem", fontWeight: 700, marginLeft: "4px",
              }}>MX</span>
            </span>
          </button>

          <span style={{ color: "var(--muted)", fontSize: "1.2rem" }}>/</span>
          <h1 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--muted)", margin: 0 }}>
            Panel Administrador
          </h1>

          <div style={{ marginLeft: "auto" }}>
            <button className="btn btn-ghost" style={{ fontSize: "0.82rem" }}
              onClick={() => router.push("/")}>
              ← Volver al mapa
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}>

          <p style={{ color: "var(--muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            Modera los negocios registrados en Xplora MX
          </p>

          {/* TABS */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="btn"
                style={{
                  fontSize: "0.85rem",
                  background: activeTab === tab.key ? "rgba(28,66,232,0.15)" : "var(--surface2)",
                  color: activeTab === tab.key ? "#1CA8F7" : "var(--muted)",
                  border: `1px solid ${activeTab === tab.key ? "rgba(28,66,232,0.4)" : "var(--border-solid)"}`,
                  fontWeight: activeTab === tab.key ? 700 : 400,
                }}>
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {/* Mensaje de acción */}
          {actionMsg && (
            <div className="animate-fade-up" style={{
              marginBottom: "1rem", padding: "10px 16px", borderRadius: "10px",
              fontSize: "0.88rem", background: "rgba(28,66,232,0.1)",
              border: "1px solid rgba(28,66,232,0.3)", color: "#1CA8F7",
            }}>
              {actionMsg}
            </div>
          )}

          {/* LISTA */}
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "3rem", color: "var(--muted)" }}>
              <div style={{ width: "16px", height: "16px", border: "2px solid #1C42E8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Cargando...
            </div>
          ) : negocios.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>
                {activeTab === "pending" ? "⏳" : activeTab === "approved" ? "✅" : "❌"}
              </div>
              <p style={{ fontSize: "0.9rem" }}>
                No hay negocios {tabs.find(t => t.key === activeTab)?.label.toLowerCase()}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {negocios.map(negocio => (
                <div
                  key={negocio.id}
                  className="card animate-fade-up"
                  style={{ cursor: "pointer", transition: "all 0.15s" }}
                  onClick={() => setSelectedNegocio(negocio)}
                >
                  <div style={{ display: "flex", gap: "1rem", padding: "1rem" }}>
                    {/* Imagen */}
                    <div style={{ flexShrink: 0 }}>
                      {negocio.image_url ? (
                        <img src={negocio.image_url} alt={negocio.name}
                          style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "10px" }} />
                      ) : (
                        <div style={{
                          width: "72px", height: "72px", background: "var(--surface2)",
                          borderRadius: "10px", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: "1.6rem",
                          border: "1px solid var(--border-solid)",
                        }}>🏪</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
                          {negocio.name}
                        </h3>
                        <span style={{
                          background: "rgba(28,66,232,0.15)", color: "#1CA8F7",
                          border: "1px solid rgba(28,66,232,0.3)",
                          borderRadius: "20px", padding: "1px 8px",
                          fontSize: "0.68rem", fontWeight: 600, flexShrink: 0,
                        }}>
                          {negocio.category}
                        </span>
                      </div>
                      {negocio.description && (
                        <p style={{
                          margin: "0 0 6px", color: "var(--muted)", fontSize: "0.82rem",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {negocio.description}
                        </p>
                      )}
                      <p style={{ margin: 0, fontSize: "0.68rem", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                        {negocio.id}
                      </p>
                    </div>

                    {/* Flecha indicadora */}
                    <div style={{
                      display: "flex", alignItems: "center", flexShrink: 0,
                      color: "rgba(255,255,255,0.2)", fontSize: "1.2rem",
                    }}>›</div>
                  </div>

                  {/* Acciones rápidas */}
                  <div
                    style={{
                      borderTop: "1px solid var(--border-solid)", padding: "10px 1rem",
                      display: "flex", gap: "8px", background: "rgba(0,0,0,0.15)",
                    }}
                    onClick={e => e.stopPropagation()} // no abrir modal al hacer clic en botones
                  >
                    {activeTab === "pending" && (<>
                      <button className="btn btn-primary" style={{ fontSize: "0.78rem", padding: "5px 12px" }}
                        onClick={() => updateStatus(negocio.id, "approved")}>✅ Aprobar</button>
                      <button className="btn btn-danger" style={{ fontSize: "0.78rem", padding: "5px 12px" }}
                        onClick={() => updateStatus(negocio.id, "rejected")}>❌ Rechazar</button>
                    </>)}
                    {activeTab === "rejected" && (
                      <button className="btn btn-primary" style={{ fontSize: "0.78rem", padding: "5px 12px" }}
                        onClick={() => updateStatus(negocio.id, "approved")}>✅ Aprobar</button>
                    )}
                    {activeTab === "approved" && (
                      <button className="btn" style={{
                        fontSize: "0.78rem", padding: "5px 12px",
                        background: "rgba(255,174,67,0.15)", color: "#FFAE43",
                        border: "1px solid rgba(255,174,67,0.3)",
                      }}
                        onClick={() => updateStatus(negocio.id, "rejected")}>⏸ Suspender</button>
                    )}
                    <button className="btn btn-danger" style={{ fontSize: "0.78rem", padding: "5px 12px", marginLeft: "auto" }}
                      onClick={() => deleteNegocio(negocio.id)}>🗑 Eliminar</button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "0.78rem", padding: "5px 12px" }}
                      onClick={() => setSelectedNegocio(negocio)}
                    >
                      👁 Ver detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALLE */}
      {selectedNegocio && (
        <NegocioModal
          negocio={selectedNegocio}
          activeTab={activeTab}
          onClose={() => setSelectedNegocio(null)}
          onApprove={(id) => updateStatus(id, "approved")}
          onReject={(id) => updateStatus(id, "rejected")}
          onSuspend={(id) => updateStatus(id, "rejected")}
          onDelete={deleteNegocio}
        />
      )}
    </>
  );
}

// ── Mapa oscuro ──────────────────────────────────────────────────────────────
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#252525" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#b0b0b0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d0d0d" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#212121" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f2f2f" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
];
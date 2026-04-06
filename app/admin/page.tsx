"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase";

type Negocio = {
  id: string;
  name: string;
  category: string;
  description?: string;
  image_url?: string;
  status: string;
  owner_id: string;
};

type TabType = "pending" | "approved" | "rejected";

export default function AdminPanel() {
  const router = useRouter();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [actionMsg, setActionMsg] = useState("");

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
    const { data } = await supabase.from("negocios").select("*")
      .eq("status", status).order("id", { ascending: false });
    setNegocios(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("negocios").update({ status }).eq("id", id);
    if (error) { setActionMsg("❌ Error: " + error.message); }
    else {
      setActionMsg(status === "approved" ? "✅ Negocio aprobado" : "❌ Negocio rechazado");
      setNegocios(prev => prev.filter(n => n.id !== id));
      setTimeout(() => setActionMsg(""), 2500);
    }
  };

  const deleteNegocio = async (id: string) => {
    if (!confirm("¿Eliminar este negocio permanentemente?")) return;
    await supabase.from("negocios").delete().eq("id", id);
    setNegocios(prev => prev.filter(n => n.id !== id));
    setActionMsg("🗑️ Negocio eliminado");
    setTimeout(() => setActionMsg(""), 2500);
  };

  if (!authChecked) return null;

  const tabs: { key: TabType; label: string; emoji: string }[] = [
    { key: "pending",  label: "Pendientes", emoji: "⏳" },
    { key: "approved", label: "Aprobados",  emoji: "✅" },
    { key: "rejected", label: "Rechazados", emoji: "❌" },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}>

        {/* HEADER */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 24px", borderBottom: "1px solid var(--border)",
          background: "rgba(10,15,13,0.9)", backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          {/* Logo */}
          <button onClick={() => router.push("/")} style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "none", border: "none", cursor: "pointer", color: "var(--text)",
          }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, var(--brand), var(--brand-dark))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>🌎</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.95rem" }}>Xplora<span style={{ color: "var(--brand)" }}>MX</span></span>
          </button>

          <span style={{ color: "var(--border)", fontSize: "1.2rem" }}>/</span>
          <h1 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--muted)", margin: 0 }}>🛡️ Panel Admin</h1>

          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            {/* ← Volver */}
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
                  background: activeTab === tab.key ? "rgba(16,185,129,0.15)" : "var(--surface2)",
                  color: activeTab === tab.key ? "var(--brand-light)" : "var(--muted)",
                  border: `1px solid ${activeTab === tab.key ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                  fontWeight: activeTab === tab.key ? 700 : 400,
                }}>
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {/* MENSAJE ACCIÓN */}
          {actionMsg && (
            <div className="badge badge-green animate-fade-up"
              style={{ marginBottom: "1rem", padding: "10px 16px", borderRadius: "10px", fontSize: "0.88rem" }}>
              {actionMsg}
            </div>
          )}

          {/* LISTA */}
          {loading ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "3rem" }}>Cargando...</p>
          ) : negocios.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "3rem" }}>
              No hay negocios {tabs.find(t => t.key === activeTab)?.label.toLowerCase()}
            </p>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {negocios.map(negocio => (
                <div key={negocio.id} className="card animate-fade-up">
                  <div style={{ display: "flex", gap: "1rem", padding: "1rem" }}>
                    {/* Imagen */}
                    <div style={{ flexShrink: 0 }}>
                      {negocio.image_url ? (
                        <img src={negocio.image_url} alt={negocio.name}
                          style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "10px" }} />
                      ) : (
                        <div style={{
                          width: "80px", height: "80px", background: "var(--surface2)",
                          borderRadius: "10px", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: "1.8rem", border: "1px solid var(--border)",
                        }}>🏪</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>{negocio.name}</h3>
                      <span className="badge badge-green" style={{ marginBottom: "6px" }}>
                        {negocio.category}
                      </span>
                      {negocio.description && (
                        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.84rem" }}>
                          {negocio.description}
                        </p>
                      )}
                      <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "var(--border)" }}>
                        owner: {negocio.owner_id}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{
                    borderTop: "1px solid var(--border)", padding: "10px 1rem",
                    display: "flex", gap: "8px", background: "rgba(0,0,0,0.15)",
                  }}>
                    {activeTab === "pending" && (<>
                      <button className="btn btn-primary" style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                        onClick={() => updateStatus(negocio.id, "approved")}>✅ Aprobar</button>
                      <button className="btn btn-danger" style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                        onClick={() => updateStatus(negocio.id, "rejected")}>❌ Rechazar</button>
                    </>)}
                    {activeTab === "rejected" && (
                      <button className="btn btn-primary" style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                        onClick={() => updateStatus(negocio.id, "approved")}>✅ Aprobar</button>
                    )}
                    {activeTab === "approved" && (
                      <button className="btn" style={{ fontSize: "0.82rem", padding: "6px 14px", background: "rgba(245,158,11,0.15)", color: "var(--warning)", border: "1px solid rgba(245,158,11,0.3)" }}
                        onClick={() => updateStatus(negocio.id, "rejected")}>⚠️ Suspender</button>
                    )}
                    <button className="btn btn-danger" style={{ fontSize: "0.82rem", padding: "6px 14px", marginLeft: "auto" }}
                      onClick={() => deleteNegocio(negocio.id)}>🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
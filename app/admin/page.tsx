"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase";

//Define la estructura de un negocio
type Negocio = {
  id: string;
  name: string;
  category: string;
  description?: string;
  image_url?: string;
  status: string;
  owner_id: string;
};

//valores posibles para el estado de un negocio
type TabType = "pending" | "approved" | "rejected";


// Componente principal del panel de administración
export default function AdminPanel() {
  const router = useRouter();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [actionMsg, setActionMsg] = useState("");


  // Verifica que el usuario esté autenticado y sea admin
  useEffect(() => {
    const checkAdmin = async () => {
      // Verificar autenticación
      const { data: userData } = await supabase.auth.getUser();
      // Si no hay usuario, redirigir a login
      if (!userData.user) { router.replace("/login"); return; }
      // Verificar rol de admin
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", userData.user.id).single();
        // Si el rol no es admin, redirigir al mapa
      if (profile?.role !== "admin") { router.replace("/"); return; }
      setAuthChecked(true);
    };
    checkAdmin();
  }, [router]);

// Una vez verificado el admin, carga los negocios según la pestaña activa
  useEffect(() => {
    if (!authChecked) return;
    fetchNegocios(activeTab);
  }, [authChecked, activeTab]);

  // Función para cargar los negocios según su estado
  const fetchNegocios = async (status: TabType) => {
    setLoading(true);
    // Consulta a Supabase para obtener los negocios con el estado seleccionado
    const { data } = await supabase.from("negocios").select("*")
      .eq("status", status).order("id", { ascending: false });
      // Actualiza el estado con los negocios obtenidos y desactiva el loading
    setNegocios(data || []);
    setLoading(false);
  };

  // Función para actualizar el estado de un negocio (aprobar o rechazar)
  // Recibe el ID del negocio y el nuevo estado, realiza la actualización en Supabase
  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    // Actualiza el estado del negocio en la base de datos
    const { error } = await supabase.from("negocios").update({ status }).eq("id", id);
    // Si hay un error, muestra un mensaje de error. Si no, muestra un mensaje de éxito y actualiza la lista de negocios
    if (error) { setActionMsg("Error: " + error.message); }
    else {
      // Muestra un mensaje de éxito y actualiza la lista de negocios para reflejar el cambio
      setActionMsg(status === "approved" ? "Negocio aprobado" : "Negocio rechazado");
      // Actualiza la lista de negocios en el estado local para reflejar el cambio sin necesidad de recargar toda la lista
      setNegocios(prev => prev.filter(n => n.id !== id));
      // Limpia el mensaje después de 2.5 segundos
      setTimeout(() => setActionMsg(""), 2500);
    }
  };

// Función para eliminar un negocio permanentemente
  const deleteNegocio = async (id: string) => {
    if (!confirm("¿Eliminar este negocio permanentemente?")) return;
    // Elimina el negocio de la base de datos y actualiza la lista local
    await supabase.from("negocios").delete().eq("id", id);
    setNegocios(prev => prev.filter(n => n.id !== id));
    setActionMsg("Negocio eliminado");
    setTimeout(() => setActionMsg(""), 2500);
  };
// Si aún no se ha verificado la autenticación, no renderiza nada (puede mostrar un loader si se desea)
  if (!authChecked) return null;

  // Define las pestañas disponibles en el panel de administración, cada una con su clave, etiqueta y emoji correspondiente
  const tabs: { key: TabType; label: string; emoji: string }[] = [
    { key: "pending",  label: "Pendientes", emoji: "⏳" },
    { key: "approved", label: "Aprobados",  emoji: "✅" },
    { key: "rejected", label: "Rechazados", emoji: "❌" },
  ];

  return (
    // Renderiza el panel de administración con un diseño limpio y funcional, utilizando estilos en línea para mayor control sobre la apariencia
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
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, var(--teal), var(--teal-dk))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>🌎</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.95rem" }}>Xplora<span style={{ background: "var(--orange)", color: "#fff", padding: "1px 6px 2px", borderRadius: "5px", fontSize: "0.68rem", fontWeight: 700, marginLeft: "4px" }}>MX</span></span>
          </button>

          <span style={{ color: "var(--border)", fontSize: "1.2rem" }}>/</span>
          <h1 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--muted)", margin: 0 }}>Panel Administrador</h1>

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
                  background: activeTab === tab.key ? "var(--teal-a)" : "var(--surface2)",
                  color: activeTab === tab.key ? "var(--teal-lt)" : "var(--muted)",
                  border: `1px solid ${activeTab === tab.key ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                  fontWeight: activeTab === tab.key ? 700 : 400,
                }}>
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {/* Mensaje de acción (aprobación, rechazo, eliminación) */}
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
                        onClick={() => updateStatus(negocio.id, "approved")}>Aprobar</button>
                      <button className="btn btn-danger" style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                        onClick={() => updateStatus(negocio.id, "rejected")}>Rechazar</button>
                    </>)}
                    {activeTab === "rejected" && (
                      <button className="btn btn-primary" style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                        onClick={() => updateStatus(negocio.id, "approved")}>Aprobar</button>
                    )}
                    {activeTab === "approved" && (
                      <button className="btn" style={{ fontSize: "0.82rem", padding: "6px 14px", background: "rgba(245,158,11,0.15)", color: "var(--warning)", border: "1px solid rgba(245,158,11,0.3)" }}
                        onClick={() => updateStatus(negocio.id, "rejected")}>Suspender</button>
                    )}
                    <button className="btn btn-danger" style={{ fontSize: "0.82rem", padding: "6px 14px", marginLeft: "auto" }}
                      onClick={() => deleteNegocio(negocio.id)}>Eliminar</button>
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
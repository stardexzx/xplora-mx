"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase";

export default function Perfil() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/login"); return; }
      setUser(data.user);
      setAuthChecked(true);
    });
  }, [router]);

  if (!authChecked) return null;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "#f5f7fa", fontFamily: "'DM Sans', sans-serif", color: "#1a2540" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderBottom: "1px solid rgba(0,80,200,0.15)", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer" }}>
            <img src="/MexiGoLogo.png" alt="MexiGo" style={{ height: "30px", objectFit: "contain", maxWidth: "100px" }} />
            <div style={{ width: "1px", height: "18px", background: "rgba(0,0,0,0.12)", margin: "0 2px" }} />
            <img src="/CoppelLogo.png" alt="Coppel" style={{ height: "30px", objectFit: "contain", maxWidth: "100px" }} />
          </button>
          <span style={{ color: "rgba(0,80,200,0.3)" }}>/</span>
          <span style={{ color: "#6b7a99", fontSize: "0.9rem", fontWeight: 600 }}>Mi perfil</span>
        </div>

        {/* Content */}
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem 1.5rem" }}>

          {/* Avatar */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #0050c8, #003a96)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "2rem", color: "#fff" }}>
              {user.email?.[0].toUpperCase()}
            </div>
            <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user.user_metadata?.first_name ?? user.email?.split("@")[0]}</p>
            <p style={{ color: "#6b7a99", fontSize: "0.85rem", marginTop: "2px" }}>{user.email}</p>
          </div>

          {/* Info */}
          <div style={{ background: "#fff", border: "1px solid rgba(0,80,200,0.12)", borderRadius: "14px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            {user.user_metadata?.first_name && (
              <div>
                <p style={{ fontSize: "0.75rem", color: "#6b7a99", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Nombre</p>
                <p style={{ fontSize: "0.9rem" }}>{user.user_metadata.first_name} {user.user_metadata?.last_name ?? ""}</p>
              </div>
            )}
            <div>
              <p style={{ fontSize: "0.75rem", color: "#6b7a99", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Correo</p>
              <p style={{ fontSize: "0.9rem" }}>{user.email}</p>
            </div>
            {user.user_metadata?.phone && (
              <div>
                <p style={{ fontSize: "0.75rem", color: "#6b7a99", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Teléfono</p>
                <p style={{ fontSize: "0.9rem" }}>{user.user_metadata.phone}</p>
              </div>
            )}
            <div>
              <p style={{ fontSize: "0.75rem", color: "#6b7a99", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Tipo de cuenta</p>
              <p style={{ fontSize: "0.9rem", textTransform: "capitalize" }}>{user.user_metadata?.user_type ?? "turista"}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#6b7a99", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Miembro desde</p>
              <p style={{ fontSize: "0.9rem" }}>{new Date(user.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {user.user_metadata?.user_type === "negocio" && (
              <button onClick={() => router.push("/mis-negocios")} style={{
                width: "100%", padding: "13px", borderRadius: "12px", border: "1px solid rgba(0,80,200,0.25)",
                background: "rgba(0,80,200,0.06)", color: "#0050c8", fontFamily: "inherit", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
              }}>
                Mis negocios
              </button>
            )}
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} style={{
              width: "100%", padding: "13px", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.06)", color: "#ef4444", fontFamily: "inherit", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
            }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
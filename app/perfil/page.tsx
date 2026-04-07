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
      <div style={{ minHeight: "100vh", background: "#0a1412", fontFamily: "'DM Sans', sans-serif", color: "#e8f0ee" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderBottom: "1px solid rgba(29,138,140,0.2)", background: "#0f1f1c" }}>
          <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "#e8f0ee" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#1d8a8c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>🌎</div>
            <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>Xplora<span style={{ color: "#1d8a8c" }}>MX</span></span>
          </button>
          <span style={{ color: "rgba(29,138,140,0.4)" }}>/</span>
          <span style={{ color: "#5a8080", fontSize: "0.9rem", fontWeight: 600 }}>Mi perfil</span>
        </div>

        {/* Content */}
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem 1.5rem" }}>

          {/* Avatar */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#1d8a8c", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "2rem" }}>
              {user.email?.[0].toUpperCase()}
            </div>
            <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user.user_metadata?.first_name ?? user.email?.split("@")[0]}</p>
            <p style={{ color: "#5a8080", fontSize: "0.85rem", marginTop: "2px" }}>{user.email}</p>
          </div>

          {/* Info */}
          <div style={{ background: "#0f1f1c", border: "1px solid rgba(29,138,140,0.2)", borderRadius: "14px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#5a8080", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Correo</p>
              <p style={{ fontSize: "0.9rem" }}>{user.email}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#5a8080", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Miembro desde</p>
              <p style={{ fontSize: "0.9rem" }}>{new Date(user.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => router.push("/mis-negocios")} style={{
              width: "100%", padding: "13px", borderRadius: "12px", border: "1px solid rgba(29,138,140,0.3)",
              background: "rgba(29,138,140,0.08)", color: "#2ab5b8", fontFamily: "inherit", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
            }}>
              Mis negocios
            </button>
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
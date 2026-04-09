"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useLang } from "../../context/LangContext";
import { useRouter } from "next/navigation";

export default function QRPage() {
  const { t } = useLang();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const appUrl = window.location.origin;
    setUrl(appUrl);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, appUrl, {
        width: 260, margin: 2,
        color: { dark: "#e8f0ee", light: "#0f1f1c" },
      });
    }
  }, []);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "xploramx-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{
        minHeight: "100vh", background: "#0a1412", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "2rem",
        fontFamily: "'DM Sans', sans-serif", color: "#e8f0ee",
      }}>
        {/* Header con logo */}
        <button onClick={() => router.push("/")} style={{
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "2.5rem",
          background: "none", border: "none", cursor: "pointer", color: "#e8f0ee",
        }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#1d8a8c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>
            Xplora<span style={{ background: "#e07830", color: "#fff", padding: "1px 7px 2px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, marginLeft: "5px" }}>MX</span>
          </span>
        </button>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px", textAlign: "center" }}>
          {t.qrTitle}
        </h2>
        <p style={{ color: "#5a8080", fontSize: "0.85rem", marginBottom: "2rem", textAlign: "center", maxWidth: "300px" }}>
          {t.qrHint}
        </p>

        {/* QR Card */}
        <div style={{
          background: "#0f1f1c", border: "1px solid rgba(29,138,140,0.25)",
          borderRadius: "20px", padding: "2rem",
          display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "1.25rem",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        }}>
          <canvas ref={canvasRef} style={{ borderRadius: "10px" }} />
          <p style={{ fontSize: "0.75rem", color: "#5a8080", margin: 0 }}>{url}</p>

          <button onClick={handleDownload} className="btn btn-orange" style={{ width: "100%", padding: "12px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t.qrDownload}
          </button>
        </div>

        <button onClick={() => router.push("/")} style={{
          marginTop: "1.5rem", background: "none", border: "none", color: "#5a8080",
          cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit",
        }}>
          ← Volver al mapa
        </button>
      </div>
    </>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useLang } from "../../context/LangContext";

export default function QRPage() {
  const { t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const appUrl = window.location.origin;
    setUrl(appUrl);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, appUrl, {
        width: 300, margin: 3,
        color: { dark: "#065f46", light: "#ffffff" },
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
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#f0fdf4", padding: "2rem", fontFamily: "sans-serif",
    }}>
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", color: "#065f46", margin: 0 }}>🌎 Xplora MX</h1>
        <p style={{ color: "#6b7280", marginTop: "0.4rem" }}>{t.qrTitle}</p>
      </div>
      <div style={{
        background: "white", borderRadius: "16px", padding: "1.5rem",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "1rem",
      }}>
        <canvas ref={canvasRef} />
        <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: 0 }}>{url}</p>
        <button onClick={handleDownload} style={{
          backgroundColor: "#10b981", color: "white", border: "none",
          borderRadius: "8px", padding: "0.6rem 1.4rem",
          cursor: "pointer", fontWeight: "bold", fontSize: "0.95rem",
        }}>
          {t.qrDownload}
        </button>
      </div>
      <p style={{ marginTop: "1.5rem", color: "#6b7280", fontSize: "0.85rem", textAlign: "center", maxWidth: "320px" }}>
        {t.qrHint}
      </p>
    </div>
  );
}
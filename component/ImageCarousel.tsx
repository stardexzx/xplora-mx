"use client";

import { useState } from "react";

interface Props {
  images: string[];   // array de URLs
  alt: string;
  height?: number;
}

export default function ImageCarousel({ images, alt, height = 200 }: Props) {
  const [current, setCurrent] = useState(0);

  if (!images.length) return null;

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(i => (i - 1 + images.length) % images.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(i => (i + 1) % images.length);
  };

  return (
    <div style={{ position: "relative", width: "100%", height, overflow: "hidden", background: "var(--surface2)" }}>
      {/* Imagen actual */}
      <img
        src={images[current]}
        alt={`${alt} ${current + 1}`}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.2s" }}
      />

      {/* Controles — solo si hay más de 1 imagen */}
      {images.length > 1 && (
        <>
          <button onClick={prev} style={arrowStyle("left")}>‹</button>
          <button onClick={next} style={arrowStyle("right")}>›</button>

          {/* Indicadores */}
          <div style={{
            position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: "5px",
          }}>
            {images.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setCurrent(i); }}
                style={{
                  width: i === current ? "18px" : "6px", height: "6px",
                  borderRadius: "3px", background: i === current ? "white" : "rgba(255,255,255,0.5)",
                  cursor: "pointer", transition: "all 0.2s",
                }} />
            ))}
          </div>

          {/* Contador */}
          <div style={{
            position: "absolute", top: "8px", right: "8px",
            background: "rgba(0,0,0,0.5)", color: "white",
            fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px",
          }}>
            {current + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
  position: "absolute", top: "50%", transform: "translateY(-50%)",
  [side]: "8px",
  background: "rgba(0,0,0,0.45)", color: "white", border: "none",
  borderRadius: "50%", width: "28px", height: "28px",
  cursor: "pointer", fontSize: "1.1rem", display: "flex",
  alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(4px)",
});
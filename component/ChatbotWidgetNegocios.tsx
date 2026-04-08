"use client";

import { useState, useRef, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type MessageRole = "bot" | "user";
interface Message {
  id: number;
  role: MessageRole;
  text: string;
  showModules?: boolean;
}

// ── Módulos ──────────────────────────────────────────────────────────────────
const MODULES = [
  {
    key: "diagnostico", label: "Diagnóstico", sublabel: "Analiza tu negocio",
    color: "#1CA8F7", bg: "rgba(28,168,247,0.15)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    key: "coppel", label: "Coppel", status: "Activo",
    color: "#F0D224", bg: "rgba(240,210,36,0.12)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    key: "finanzas", label: "Finanzas", sublabel: "Flujo y costos",
    color: "#5b8aff", bg: "rgba(91,138,255,0.15)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 9.5C9 8.12 10.34 7 12 7s3 1.12 3 2.5c0 2.5-3 3-3 5" />
      </svg>
    ),
  },
  {
    key: "turistas", label: "Captar turistas", sublabel: "Atrae visitantes",
    color: "#34d399", bg: "rgba(52,211,153,0.12)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
];

const BOT_RESPONSES: Record<string, string> = {
  diagnostico: "Vamos a analizar el estado de tu negocio. ¿Cuál es el principal reto que enfrentas hoy?",
  coppel:      "Módulo Coppel activo. ¿En qué te puedo apoyar con tus productos o financiamiento?",
  finanzas:    "Puedo ayudarte con flujo de efectivo, costos y proyecciones. ¿Por dónde empezamos?",
  turistas:    "¡Excelente! Te ayudo a atraer más visitantes. ¿Tienes presencia en redes sociales?",
  default:     "Déjame ayudarte con eso. ¿Puedes darme más detalles?",
};

// ── Sub-components ───────────────────────────────────────────────────────────
function RobotAvatar({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width={size} height={size}>
      <rect x="3" y="8" width="18" height="13" rx="3" />
      <circle cx="9" cy="14" r="1.5" fill="white" />
      <circle cx="15" cy="14" r="1.5" fill="white" />
      <path d="M12 3v5" strokeLinecap="round" />
      <path d="M3 13h-1M22 13h-1" strokeLinecap="round" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "rgba(255,255,255,0.35)",
          display: "inline-block",
          animation: `mn-bounce 1.2s ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

function ModuleGrid({ active, onSelect }: { active: string; onSelect: (k: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
      {MODULES.map((mod) => (
        <button
          key={mod.key}
          onClick={() => onSelect(mod.key)}
          style={{
            background: active === mod.key ? "rgba(28,66,232,0.2)" : "#111e36",
            border: `1px solid ${active === mod.key ? "#1C42E8" : "rgba(28,66,232,0.35)"}`,
            borderRadius: 10, padding: "9px 9px 7px",
            cursor: "pointer", display: "flex", flexDirection: "column", gap: 3,
            textAlign: "left", transition: "all 0.15s", width: "100%",
          }}
          onMouseEnter={(e) => {
            if (active !== mod.key) {
              (e.currentTarget as HTMLButtonElement).style.background = "#1a2d52";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#1C42E8";
            }
          }}
          onMouseLeave={(e) => {
            if (active !== mod.key) {
              (e.currentTarget as HTMLButtonElement).style.background = "#111e36";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(28,66,232,0.35)";
            }
          }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: mod.bg, color: mod.color,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {mod.icon}
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#e8eaf6", lineHeight: 1.2 }}>
            {mod.label}
          </span>
          {mod.status
            ? <span style={{ fontSize: 10, fontWeight: 700, color: "#F0D224" }}>{mod.status}</span>
            : <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.38)" }}>{mod.sublabel}</span>
          }
        </button>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
// Este componente se renderiza como un panel lateral dentro del layout de MisNegocios.
// NO usa position:fixed — se integra en el flujo del layout.
// Úsalo así en MisNegocios:
//
//   <div className={s.layout}>
//     <div className={s.sidebar}>...</div>
//     {editingNegocio ? <div className={s.editPanel}>...</div> : <div className={s.emptyState}>...</div>}
//     <ChatbotNegocios />
//   </div>

export default function ChatbotNegocios() {
  const [isOpen, setIsOpen]         = useState(false);
  const [activeModule, setActiveModule] = useState("coppel");
  const [messages, setMessages]     = useState<Message[]>([
    { id: 0, role: "bot", text: "Hola 👋 ¿En qué módulo te puedo ayudar hoy?", showModules: true },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping]     = useState(false);
  const [showBadge, setShowBadge]   = useState(true);
  const bodyRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgIdRef = useRef(1);

  // Scroll al último mensaje
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, isTyping]);

  // Focus al abrir
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  // Keyframes una sola vez
  useEffect(() => {
    const id = "mn-chatbot-kf";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes mn-bounce {
        0%,80%,100%{transform:translateY(0);opacity:.4}
        40%{transform:translateY(-4px);opacity:1}
      }
      @keyframes mn-slideIn {
        from{opacity:0;transform:translateX(16px)}
        to{opacity:1;transform:translateX(0)}
      }
      .mn-input:focus{
        border-color:#1C42E8!important;
        background:#1a2d52!important;
        box-shadow:0 0 0 3px rgba(28,66,232,0.25)!important;
      }
      .mn-send:hover:not(:disabled){background:#2954ff!important;}
      .mn-toggle:hover{border-color:#1CA8F7!important;color:#1CA8F7!important;}
    `;
    document.head.appendChild(s);
  }, []);

  const addMsg = (role: MessageRole, text: string, showModules = false) => {
    const id = msgIdRef.current++;
    setMessages((p) => [...p, { id, role, text, showModules }]);
  };

  const handleModule = (key: string) => {
    if (key === activeModule) return;
    setActiveModule(key);
    const mod = MODULES.find((m) => m.key === key)!;
    addMsg("user", mod.label);
    setIsTyping(true);
    setTimeout(() => { setIsTyping(false); addMsg("bot", BOT_RESPONSES[key]); }, 1000);
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;
    setInputValue("");
    addMsg("user", text);
    setIsTyping(true);
    // TODO: reemplaza con tu llamada a la IA real
    setTimeout(() => { setIsTyping(false); addMsg("bot", BOT_RESPONSES.default); }, 1000);
  };

  // ── Panel colapsado: solo muestra el botón toggle en el borde izquierdo ──
  if (!isOpen) {
    return (
      <div style={{
        width: 48,
        flexShrink: 0,
        borderLeft: "1px solid rgba(28,66,232,0.35)",
        background: "#0a1628",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 16,
        gap: 8,
        position: "relative",
      }}>
        {/* Badge de notificación */}
        {showBadge && (
          <div style={{
            position: "absolute", top: 12, right: 8,
            width: 16, height: 16, borderRadius: "50%",
            background: "#F0D224", color: "#020c1f",
            fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #0a1628",
            zIndex: 2,
          }}>1</div>
        )}

        {/* Botón toggle con carita robot */}
        <button
          onClick={() => { setIsOpen(true); setShowBadge(false); }}
          title="Abrir asistente"
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#1C42E8",
            border: "none",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(28,66,232,0.4)",
            transition: "background 0.18s, transform 0.18s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          {/* Carita robot */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pointerEvents: "none" }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#1C42E8" }} />
                </div>
              ))}
            </div>
            <div style={{
              width: 13, height: 6,
              border: "1.5px solid white", borderTop: "none",
              borderRadius: "0 0 7px 7px",
            }} />
          </div>
        </button>

        {/* Texto rotado */}
        <span style={{
          fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          letterSpacing: "0.08em",
          marginTop: 4,
          userSelect: "none",
        }}>
          ASISTENTE
        </span>
      </div>
    );
  }

  // ── Panel abierto (320px) ────────────────────────────────────────────────
  return (
    <div style={{
      width: 320,
      flexShrink: 0,
      borderLeft: "1px solid rgba(28,66,232,0.35)",
      background: "#020c1f",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      animation: "mn-slideIn 0.22s cubic-bezier(0.34,1.1,0.64,1)",
      overflow: "hidden",
    }}>

      {/* ── Header del panel ── */}
      <div style={{
        padding: "13px 14px 11px",
        background: "#0a1628",
        borderBottom: "1px solid rgba(28,66,232,0.35)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: "#1C42E8",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <RobotAvatar size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf6", lineHeight: 1.2 }}>
            Asistente XploraMX
          </div>
          <div style={{ fontSize: 11, color: "#8fa3c8", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7fff7a", display: "inline-block" }} />
            En línea
          </div>
        </div>
        {/* Botón cerrar panel */}
        <button
          className="mn-toggle"
          onClick={() => setIsOpen(false)}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(28,66,232,0.35)",
            borderRadius: "50%", width: 26, height: 26,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#8fa3c8", flexShrink: 0, transition: "border-color 0.15s, color 0.15s",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ── Mensajes ── */}
      <div
        ref={bodyRef}
        style={{
          flex: 1, overflowY: "auto",
          padding: "14px 12px 8px",
          display: "flex", flexDirection: "column", gap: 10,
          scrollbarWidth: "thin",
          scrollbarColor: "#111e36 transparent",
        }}
      >
        {messages.map((msg) =>
          msg.role === "bot" ? (
            <div key={msg.id} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: "#1C42E8",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <RobotAvatar size={12} />
              </div>
              <div style={{
                background: "#0a1628",
                border: "1px solid rgba(28,66,232,0.35)",
                borderRadius: "14px 14px 14px 3px",
                padding: "9px 12px",
                maxWidth: 220,
              }}>
                <p style={{ fontSize: 12.5, color: "#e8eaf6", lineHeight: 1.55, margin: 0 }}>
                  {msg.text}
                </p>
                {msg.showModules && (
                  <ModuleGrid active={activeModule} onSelect={handleModule} />
                )}
              </div>
            </div>
          ) : (
            <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{
                background: "#1C42E8",
                borderRadius: "14px 14px 3px 14px",
                padding: "9px 12px", maxWidth: 200,
                boxShadow: "0 4px 16px rgba(28,66,232,0.35)",
              }}>
                <p style={{ fontSize: 12.5, color: "#fff", lineHeight: 1.55, margin: 0 }}>
                  {msg.text}
                </p>
              </div>
            </div>
          )
        )}

        {isTyping && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, background: "#1C42E8",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <RobotAvatar size={12} />
            </div>
            <div style={{
              background: "#0a1628", border: "1px solid rgba(28,66,232,0.35)",
              borderRadius: "14px 14px 14px 3px", padding: "9px 12px",
            }}>
              <TypingIndicator />
            </div>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: "10px 12px",
        borderTop: "1px solid rgba(28,66,232,0.35)",
        display: "flex", gap: 8, alignItems: "center",
        background: "#0a1628", flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          className="mn-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Escribe un mensaje..."
          style={{
            flex: 1,
            background: "#111e36",
            border: "1.5px solid rgba(28,66,232,0.5)",
            borderRadius: 20, padding: "8px 14px",
            fontSize: 12.5, color: "#e8eaf6", outline: "none",
            fontFamily: "inherit", transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
          }}
        />
        <button
          className="mn-send"
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
          style={{
            width: 34, height: 34, borderRadius: "50%",
            background: !inputValue.trim() || isTyping ? "#111e36" : "#1C42E8",
            border: `1px solid ${!inputValue.trim() || isTyping ? "rgba(28,66,232,0.35)" : "#1C42E8"}`,
            cursor: !inputValue.trim() || isTyping ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "background 0.15s",
            boxShadow: !inputValue.trim() || isTyping ? "none" : "0 4px 12px rgba(28,66,232,0.35)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="14" height="14">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
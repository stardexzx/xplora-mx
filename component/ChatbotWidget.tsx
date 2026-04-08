"use client";

import { useState, useRef, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type MessageRole = "bot" | "user";

interface Message {
  id: number;
  role: MessageRole;
  text: string;
}

// ── Paleta Coppel / Home.css ─────────────────────────────────────────────────
const C = {
  bg:          "#03112a",   // fondo principal
  bgDark:      "#020e22",   // header / nav
  bgCard:      "#04193d",   // cards
  bgCardHover: "#061f4a",   // hover cards
  blue:        "#1c42e8",   // acento principal
  blueDim:     "rgba(28,66,232,0.15)",
  blueBorder:  "rgba(28,66,232,0.25)",
  blueHover:   "#2954ff",
  lightBlue:   "#5b8aff",   // texto activo
  yellow:      "#F0D224",   // badge / acento secundario
  yellowDark:  "#c8aa00",
  text:        "#e8eaf6",   // texto principal
  text2:       "#8fa3c8",   // texto secundario
  muted:       "#4d6080",   // texto apagado
  danger:      "#ff594d",
  white:       "#ffffff",
};

// ── Icons ────────────────────────────────────────────────────────────────────
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="14" height="14">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const RobotAvatar = ({ size = 13 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width={size} height={size}>
    <rect x="3" y="8" width="18" height="13" rx="3" />
    <circle cx="9" cy="14" r="1.5" fill="white" />
    <circle cx="15" cy="14" r="1.5" fill="white" />
    <path d="M12 3v5" strokeLinecap="round" />
    <path d="M3 13h-1M22 13h-1" strokeLinecap="round" />
  </svg>
);

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: C.muted,
            display: "inline-block",
            animation: `xplora-bounce 1.2s ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Quick suggestions ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "¿Qué lugares visitar?",
  "Restaurantes cerca",
  "¿Cómo llegar al centro?",
  "Artesanías típicas",
];

// ── Main component ───────────────────────────────────────────────────────────
export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "bot",
      text: "¡Hola! 👋 Soy tu asistente de viaje en México. ¿En qué te puedo ayudar hoy?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgIdRef = useRef(1);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 250);
  }, [isOpen]);

  // Inyectar keyframes una sola vez
  useEffect(() => {
    const styleId = "xplora-chatbot-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes xplora-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-4px); opacity: 1; }
      }
      @keyframes xplora-slideUp {
        from { opacity: 0; transform: translateY(12px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes xplora-pulse {
        0%, 100% { box-shadow: 0 4px 16px rgba(28,66,232,0.45); }
        50%       { box-shadow: 0 4px 28px rgba(28,66,232,0.75); }
      }
      .xplora-suggestion:hover {
        background: rgba(28,66,232,0.15) !important;
        border-color: rgba(28,66,232,0.6) !important;
        color: #5b8aff !important;
      }
      .xplora-input:focus {
        border-color: #1c42e8 !important;
        background: rgba(28,66,232,0.08) !important;
      }
      .xplora-send:hover:not(:disabled) {
        background: #2954ff !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const addMessage = (role: MessageRole, text: string) => {
    const id = msgIdRef.current++;
    setMessages((prev) => [...prev, { id, role, text }]);
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || isTyping) return;
    setInputValue("");
    setShowSuggestions(false);
    addMessage("user", text.trim());
    setIsTyping(true);
    // TODO: reemplaza con tu llamada a interpretQuery / IA real
    setTimeout(() => {
      setIsTyping(false);
      addMessage("bot", "Déjame ayudarte con eso. ¿Puedes darme más detalles para recomendarte mejor?");
    }, 1000);
  };

  const handleSend = () => sendMessage(inputValue);
  const handleSuggestion = (text: string) => sendMessage(text);
  const handleOpen = () => { setIsOpen(true); setShowBadge(false); };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        fontFamily: "var(--font-body, 'DM Sans', -apple-system, sans-serif)",
      }}
    >
      {/* ── Panel ── */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 72,
            right: 0,
            width: 340,
            borderRadius: 16,
            overflow: "hidden",
            background: C.bg,
            border: `1px solid ${C.blueBorder}`,
            display: "flex",
            flexDirection: "column",
            maxHeight: 460,
            animation: "xplora-slideUp 0.22s cubic-bezier(0.34,1.3,0.64,1)",
            boxShadow: "0 16px 48px rgba(2,8,20,0.85)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px 12px",
              background: C.bgDark,
              borderBottom: `1px solid ${C.blueBorder}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: C.blue,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <RobotAvatar size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                Asistente XploraMX
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: C.text2,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#7fff7a",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                En línea
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${C.blueBorder}`,
                borderRadius: "50%",
                width: 28,
                height: 28,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: C.text2,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={bodyRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              scrollbarWidth: "thin",
              scrollbarColor: `${C.bgCard} transparent`,
            }}
          >
            {messages.map((msg) =>
              msg.role === "bot" ? (
                <div key={msg.id} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: C.blue,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <RobotAvatar size={13} />
                  </div>
                  <div
                    style={{
                      background: C.bgCard,
                      border: `1px solid ${C.blueBorder}`,
                      borderRadius: "16px 16px 16px 4px",
                      padding: "10px 13px",
                      maxWidth: 240,
                    }}
                  >
                    <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5, margin: 0 }}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      background: C.blue,
                      borderRadius: "16px 16px 4px 16px",
                      padding: "10px 13px",
                      maxWidth: 220,
                      boxShadow: "0 4px 20px rgba(28,66,232,0.35)",
                    }}
                  >
                    <p style={{ fontSize: 13, color: C.white, lineHeight: 1.5, margin: 0 }}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              )
            )}

            {isTyping && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: C.blue,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <RobotAvatar size={13} />
                </div>
                <div
                  style={{
                    background: C.bgCard,
                    border: `1px solid ${C.blueBorder}`,
                    borderRadius: "16px 16px 16px 4px",
                    padding: "10px 13px",
                  }}
                >
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>

          {/* Sugerencias rápidas */}
          {showSuggestions && (
            <div
              style={{
                padding: "8px 12px 10px",
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                borderTop: `1px solid ${C.blueBorder}`,
                background: C.bgDark,
              }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="xplora-suggestion"
                  onClick={() => handleSuggestion(s)}
                  style={{
                    background: C.bgCard,
                    border: `1px solid ${C.blueBorder}`,
                    borderRadius: 20,
                    padding: "5px 11px",
                    fontSize: 11,
                    color: C.text2,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 600,
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Footer input */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: `1px solid ${C.blueBorder}`,
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: C.bgDark,
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              className="xplora-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escribe un mensaje..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: `1.5px solid rgba(255,255,255,0.1)`,
                borderRadius: 21,
                padding: "8px 16px",
                fontSize: 13,
                color: C.text,
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.2s, background 0.2s",
              }}
            />
            <button
              className="xplora-send"
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: !inputValue.trim() || isTyping ? C.bgCardHover : C.blue,
                border: `1px solid ${!inputValue.trim() || isTyping ? C.blueBorder : C.blue}`,
                cursor: !inputValue.trim() || isTyping ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
                boxShadow: !inputValue.trim() || isTyping ? "none" : "0 4px 16px rgba(28,66,232,0.35)",
              }}
            >
              <IconSend />
            </button>
          </div>
        </div>
      )}

      {/* ── Burbuja flotante ── */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: isOpen ? C.bgCardHover : C.blue,
          border: `1px solid ${C.blueBorder}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          transition: "background 0.18s, transform 0.18s",
          animation: !isOpen ? "xplora-pulse 2.5s infinite" : "none",
          boxShadow: isOpen ? "none" : "0 4px 20px rgba(28,66,232,0.4)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {/* Badge amarillo */}
        {showBadge && !isOpen && (
          <div
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: C.yellow,
              color: "#03112a",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${C.bg}`,
            }}
          >
            1
          </div>
        )}

        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Carita robot
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, pointerEvents: "none" }}>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.blue }} />
                </div>
              ))}
            </div>
            <div
              style={{
                width: 18,
                height: 8,
                border: "2px solid white",
                borderTop: "none",
                borderRadius: "0 0 10px 10px",
              }}
            />
          </div>
        )}
      </button>
    </div>
  );
}
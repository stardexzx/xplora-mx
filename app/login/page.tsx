"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../services/supabase";
import styles from "./Authpage.module.css";

type Tab = "login" | "register";
type UserType = "turista" | "negocio";

function getPasswordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

function strengthClass(score: number, barIndex: number): string {
  if (barIndex >= score) return styles.pwBar;
  if (score <= 1) return `${styles.pwBar} ${styles.weak}`;
  if (score <= 2) return `${styles.pwBar} ${styles.fair}`;
  return `${styles.pwBar} ${styles.strong}`;
}

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 7 10-7" />
  </svg>
);
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={18} height={18}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={18} height={18}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [userType, setUserType] = useState<UserType>("turista");

  // Login
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw]     = useState(false);
  const [loginStatus, setLoginStatus]     = useState<"idle" | "loading" | "success">("idle");
  const [loginError, setLoginError]       = useState("");

  // Register
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName]   = useState("");
  const [regEmail, setRegEmail]         = useState("");
  const [regPhone, setRegPhone]         = useState("");
  const [regPassword, setRegPassword]   = useState("");
  const [showRegPw, setShowRegPw]       = useState(false);
  const [acceptTerms, setAcceptTerms]   = useState(false);
  const [regStatus, setRegStatus]       = useState<"idle" | "loading" | "success">("idle");
  const [regError, setRegError]         = useState("");

  const [shake, setShake] = useState(false);
  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  }, []);

  // ── Login ──
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { triggerShake(); return; }
    setLoginError(""); setLoginStatus("loading");
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      setLoginError("Correo o contraseña incorrectos.");
      setLoginStatus("idle");
      triggerShake();
    } else {
      setLoginStatus("success");
      setTimeout(() => router.push("/"), 600);
    }
  };

  // ── Registro ──
  const handleRegister = async () => {
    if (!regEmail || !regPassword || !acceptTerms) { triggerShake(); return; }
    if (regPassword.length < 6) {
      setRegError("La contraseña debe tener al menos 6 caracteres.");
      triggerShake(); return;
    }
    if (regPhone && !/^\+?[\d\s\-()]{10,15}$/.test(regPhone)) {
      setRegError("Número de teléfono inválido.");
      triggerShake(); return;
    }

    setRegError(""); setRegStatus("loading");

    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: {
          first_name: regFirstName,
          last_name:  regLastName,
          user_type:  userType,
          phone:      regPhone,
        },
      },
    });

    if (error) {
      setRegError(error.message);
      setRegStatus("idle");
      triggerShake();
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: regFirstName,
        last_name:  regLastName,
        user_type:  userType,
        phone:      regPhone,
      },
    });

    if (updateError) {
      setRegError(`Error al guardar datos: ${updateError.message}`);
      setRegStatus("idle");
      return;
    }

    setRegStatus("success");
    setTimeout(() => router.push("/"), 800);
  };

  const pwStrength = getPasswordStrength(regPassword);

  const loginBtnClass = [styles.btnMain, shake && tab === "login" ? styles.shake : ""].filter(Boolean).join(" ");
  const regBtnClass   = [styles.btnMain, userType === "negocio" ? styles.yellow : "", shake && tab === "register" ? styles.shake : ""].filter(Boolean).join(" ");

  return (
    <div className={styles.body}>
      <div className={styles.card}>

        {/* HERO */}
        <div className={styles.hero}>
          <div className={styles.logoWrap}>
            <img
              src="/logo.png"
              alt="Xplora MX logo"
              className={styles.logoImg}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                (e.currentTarget.nextSibling as HTMLElement).style.display = "flex";
              }}
            />
            <div className={styles.logoFallback}>🧭</div>
          </div>
          <div className={styles.brandName}>
            Xplora <span className={styles.brandBadge}>MX</span>
          </div>
          <div className={styles.brandSub}>Conectando turistas con lo auténtico de México</div>
        </div>

        {/* TABS */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "login" ? styles.activeTab : ""}`}
            onClick={() => { setTab("login"); setLoginError(""); }}
          >
            Iniciar sesión
          </button>
          <button
            className={`${styles.tab} ${tab === "register" ? styles.activeTab : ""}`}
            onClick={() => { setTab("register"); setRegError(""); }}
          >
            Crear cuenta
          </button>
        </div>

        {/* ── LOGIN ── */}
        {tab === "login" && (
          <>
            <div className={styles.formBody}>
              <div className={styles.field}>
                <label className={styles.label}>Correo electrónico</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><MailIcon /></span>
                  <input
                    type="email" className={styles.input}
                    placeholder="correo@ejemplo.com"
                    value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Contraseña</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><LockIcon /></span>
                  <input
                    type={showLoginPw ? "text" : "password"} className={styles.input}
                    placeholder="Tu contraseña" value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    autoComplete="current-password"
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowLoginPw(v => !v)}>
                    {showLoginPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className={styles.errorBox}>{loginError}</div>
              )}

              <button className={loginBtnClass} onClick={handleLogin} disabled={loginStatus !== "idle"}>
                {loginStatus === "loading" ? "Entrando..." : loginStatus === "success" ? "¡Bienvenido!" : "Entrar a Xplora MX"}
              </button>
            </div>

            <div className={styles.cardFooter}>
              ¿Sin cuenta? <a onClick={() => setTab("register")} style={{ cursor: "pointer" }}>Regístrate gratis</a>
            </div>
          </>
        )}

        {/* ── REGISTER ── */}
        {tab === "register" && (
          <>
            <div className={styles.typeRow}>
              <button
                className={`${styles.typeBtn} ${userType === "turista" ? styles.sel : ""}`}
                onClick={() => setUserType("turista")}
              >
                <span className={styles.ico}>🧳</span> Turista
              </button>
              <button
                className={`${styles.typeBtn} ${userType === "negocio" ? styles.selY : ""}`}
                onClick={() => setUserType("negocio")}
              >
                <span className={styles.ico}>🏪</span> Negocio
              </button>
            </div>

            <div className={styles.formBody}>
              <div className={styles.nameRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Nombre</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}><UserIcon /></span>
                    <input type="text" className={styles.input} placeholder="Juan"
                      value={regFirstName} onChange={e => setRegFirstName(e.target.value)} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Apellido</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}><UserIcon /></span>
                    <input type="text" className={styles.input} placeholder="García"
                      value={regLastName} onChange={e => setRegLastName(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Correo electrónico</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><MailIcon /></span>
                  <input type="email" className={styles.input} placeholder="correo@ejemplo.com"
                    value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRegister()}
                    autoComplete="email" />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Teléfono celular</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><PhoneIcon /></span>
                  <input type="tel" className={styles.input} placeholder="+52 55 1234 5678"
                    value={regPhone} onChange={e => setRegPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRegister()}
                    autoComplete="tel" />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Contraseña</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><LockIcon /></span>
                  <input
                    type={showRegPw ? "text" : "password"} className={styles.input}
                    placeholder="Mínimo 6 caracteres" value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRegister()}
                    autoComplete="new-password"
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowRegPw(v => !v)}>
                    {showRegPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className={styles.pwStrength}>
                  {[0, 1, 2, 3].map(i => <div key={i} className={strengthClass(pwStrength, i)} />)}
                </div>
              </div>

              <div className={styles.checkRow}>
                <input type="checkbox" id="terms-check" checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)} className={styles.checkbox} />
                <label htmlFor="terms-check">
                  Acepto los <a href="#">Términos de Uso</a> y la <a href="#">Política de Privacidad</a>
                </label>
              </div>

              {regError && (
                <div className={styles.errorBox}>{regError}</div>
              )}

              <button className={regBtnClass} onClick={handleRegister} disabled={regStatus !== "idle"}>
                {regStatus === "loading" ? "Creando cuenta..." : regStatus === "success" ? "¡Cuenta creada!" : "Crear mi cuenta"}
              </button>
            </div>

            <div className={styles.cardFooter}>
              ¿Ya tienes cuenta? <a onClick={() => setTab("login")} style={{ cursor: "pointer" }}>Inicia sesión</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
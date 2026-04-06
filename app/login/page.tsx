"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./Authpage.module.css";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "login" | "register";
type UserType = "turista" | "negocio";

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

// ─── Password strength helper ────────────────────────────────────────────────

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

// ─── Sub-components ──────────────────────────────────────────────────────────

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="m2 7 10 7 10-7" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={18} height={18}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={18} height={18}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width={18} height={18}>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AuthPage({ onLoginSuccess }: { onLoginSuccess?: () => void } = {}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");

  // Login state
  const [loginType, setLoginType] = useState<UserType>("turista");
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: "", password: "" });
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "success">("idle");

  // Register state
  const [regType, setRegType] = useState<UserType>("turista");
  const [regForm, setRegForm] = useState<RegisterForm>({
    firstName: "",
    lastName: "",
    businessName: "",
    email: "",
    password: "",
    acceptTerms: false,
  });
  const [showRegPw, setShowRegPw] = useState(false);
  const [regStatus, setRegStatus] = useState<"idle" | "loading" | "success">("idle");
  const [shake, setShake] = useState(false);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  }, []);

  // ── Login handler ──
  const handleLogin = () => {
    if (!loginForm.email || !loginForm.password) {
      triggerShake();
      return;
    }
    setLoginStatus("loading");
    setTimeout(() => {
      setLoginStatus("success");
      setTimeout(() => {
        onLoginSuccess?.();
        router.push("/..");
      }, 800);
    }, 1200);
  };

  // ── Register handler ──
  const handleRegister = () => {
    if (!regForm.password || !regForm.acceptTerms) {
      triggerShake();
      return;
    }
    setRegStatus("loading");
    setTimeout(() => {
      setRegStatus("success");
      setTimeout(() => {
        onLoginSuccess?.();
        router.push("/..");
      }, 800);
    }, 1400);
  };

  const pwStrength = getPasswordStrength(regForm.password);

  const loginBtnClass = [
    styles.btnMain,
    loginType === "negocio" ? styles.orange : "",
    shake && tab === "login" ? styles.shake : "",
  ]
    .filter(Boolean)
    .join(" ");

  const regBtnClass = [
    styles.btnMain,
    regType === "negocio" ? styles.orange : "",
    shake && tab === "register" ? styles.shake : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.body}>
      <div className={styles.card}>

        {/* ── HERO ── */}
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

        {/* ── TABS ── */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "login" ? styles.activeTab : ""}`}
            onClick={() => setTab("login")}
          >
            Iniciar sesión
          </button>
          <button
            className={`${styles.tab} ${tab === "register" ? styles.activeTab : ""}`}
            onClick={() => setTab("register")}
          >
            Crear cuenta
          </button>
        </div>

        {/* ════════════ LOGIN PANEL ════════════ */}
        {tab === "login" && (
          <>
            {/* User type */}
            <div className={styles.typeRow}>
              <button
                className={`${styles.typeBtn} ${loginType === "turista" ? styles.sel : ""}`}
                onClick={() => setLoginType("turista")}
              >
                <span className={styles.ico}>🧳</span> Turista
              </button>
              <button
                className={`${styles.typeBtn} ${loginType === "negocio" ? styles.selO : ""}`}
                onClick={() => setLoginType("negocio")}
              >
                <span className={styles.ico}>🏪</span> Negocio
              </button>
            </div>

            <div className={styles.formBody}>
              {/* Email */}
              <div className={styles.field}>
                <label className={styles.label}>Correo electrónico</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><MailIcon /></span>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="correo@ejemplo.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                    inputMode="email"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className={styles.field}>
                <label className={styles.label}>Contraseña</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><LockIcon /></span>
                  <input
                    type={showLoginPw ? "text" : "password"}
                    className={styles.input}
                    placeholder="Tu contraseña"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowLoginPw((v) => !v)}
                    style={{ color: showLoginPw ? "var(--teal)" : undefined }}
                  >
                    {showLoginPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className={styles.forgot}>
                <a href="#">¿Olvidaste tu contraseña?</a>
              </div>

              <button
                className={loginBtnClass}
                onClick={handleLogin}
                disabled={loginStatus !== "idle"}
              >
                {loginStatus === "loading"
                  ? "Entrando..."
                  : loginStatus === "success"
                  ? "✓ ¡Bienvenido a Xplora MX!"
                  : "Entrar a Xplora MX"}
              </button>

              <div className={styles.divider}>o continúa con</div>

              <div className={styles.socials}>
                <button type="button" className={styles.btnSocial}>
                  <GoogleIcon /> Google
                </button>
                <button type="button" className={styles.btnSocial}>
                  <AppleIcon /> Apple
                </button>
              </div>
            </div>

            <div className={styles.cardFooter}>
              ¿Sin cuenta?{" "}
              <a onClick={() => setTab("register")} style={{ cursor: "pointer" }}>
                Regístrate gratis
              </a>
            </div>
          </>
        )}

        {/* ════════════ REGISTER PANEL ════════════ */}
        {tab === "register" && (
          <>
            {/* User type */}
            <div className={styles.typeRow}>
              <button
                className={`${styles.typeBtn} ${regType === "turista" ? styles.sel : ""}`}
                onClick={() => setRegType("turista")}
              >
                <span className={styles.ico}>🧳</span> Turista
              </button>
              <button
                className={`${styles.typeBtn} ${regType === "negocio" ? styles.selO : ""}`}
                onClick={() => setRegType("negocio")}
              >
                <span className={styles.ico}>🏪</span> Negocio
              </button>
            </div>

            <div className={styles.formBody}>
              {/* Name row */}
              <div className={styles.nameRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Nombre</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}><UserIcon /></span>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Juan"
                      value={regForm.firstName}
                      onChange={(e) => setRegForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Apellido</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}><UserIcon /></span>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="García"
                      value={regForm.lastName}
                      onChange={(e) => setRegForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Business name (negocio only) */}
              {regType === "negocio" && (
                <div className={styles.field}>
                  <label className={styles.label}>Nombre del negocio</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}><HomeIcon /></span>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Tacos Don Memo"
                      value={regForm.businessName}
                      onChange={(e) => setRegForm((f) => ({ ...f, businessName: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className={styles.field}>
                <label className={styles.label}>Correo electrónico</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><MailIcon /></span>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="correo@ejemplo.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
                    inputMode="email"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password + strength */}
              <div className={styles.field}>
                <label className={styles.label}>Contraseña</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><LockIcon /></span>
                  <input
                    type={showRegPw ? "text" : "password"}
                    className={styles.input}
                    placeholder="Mínimo 8 caracteres"
                    value={regForm.password}
                    onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowRegPw((v) => !v)}
                    style={{ color: showRegPw ? "var(--teal)" : undefined }}
                  >
                    {showRegPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className={styles.pwStrength}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={strengthClass(pwStrength, i)} />
                  ))}
                </div>
              </div>

              {/* Terms */}
              <div className={styles.checkRow}>
                <input
                  type="checkbox"
                  id="terms-check"
                  checked={regForm.acceptTerms}
                  onChange={(e) => setRegForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
                  className={styles.checkbox}
                />
                <label htmlFor="terms-check">
                  Acepto los <a href="#">Términos de Uso</a> y la{" "}
                  <a href="#">Política de Privacidad</a> de Xplora MX
                </label>
              </div>

              <button
                className={regBtnClass}
                onClick={handleRegister}
                disabled={regStatus !== "idle"}
              >
                {regStatus === "loading"
                  ? "Creando cuenta..."
                  : regStatus === "success"
                  ? "✓ ¡Cuenta creada!"
                  : "Crear mi cuenta"}
              </button>

              <div className={styles.divider}>o regístrate con</div>

              <div className={styles.socials}>
                <button type="button" className={styles.btnSocial}>
                  <GoogleIcon /> Google
                </button>
                <button type="button" className={styles.btnSocial}>
                  <AppleIcon /> Apple
                </button>
              </div>
            </div>

            <div className={styles.cardFooter}>
              ¿Ya tienes cuenta?{" "}
              <a onClick={() => setTab("login")} style={{ cursor: "pointer" }}>
                Inicia sesión
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
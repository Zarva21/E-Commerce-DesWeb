import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { authService } from "../../services/authService";
import "./LoginPanel.css";

const EMPTY_FORM = {
  nombre: "",
  apellido: "",
  telefono: "",
  email: "",
  password: "",
  confirmarPassword: "",
};

const formatPhoneNumber = (value = "") => {
  const digits = String(value).replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
};

export default function LoginPanel({ open, initialTab, onClose, onLoginSuccess }) {
  const [tab, setTab] = useState(initialTab ?? "login");
  const [form, setForm] = useState(EMPTY_FORM);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab ?? "login");
      setForm(EMPTY_FORM);
      setError("");
      setSuccessMsg("");
      setTwoFactorCode("");
      setPendingUserId(null);
    }
  }, [open, initialTab]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setSuccessMsg("");
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setForm((f) => ({ ...f, telefono: formatted }));
    setError("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const rawPhoneDigits = form.telefono.replace(/\D/g, "");
    if (tab === "register" && rawPhoneDigits.length !== 8) {
      setError("Ingresa un número de teléfono válido de 8 dígitos (ej. 5555-5555).");
      return;
    }

    if (tab === "convert" && form.telefono && rawPhoneDigits.length !== 8) {
      setError("El número de teléfono debe tener 8 dígitos (ej. 5555-5555).");
      return;
    }

    if ((tab === "register" || tab === "convert") && form.password !== form.confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if ((tab === "register" || tab === "convert") && form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      if (tab === "login") {
        const res = await authService.login(form.email, form.password);

        if (res.requires2FA) {
          setPendingUserId(res.userId);
          setTab("2fa");
          setSuccessMsg(res.message || "Ingresa el código que enviamos a tu correo.");
        } else {
          const role = res.user?.role || "cliente";
          setForm(EMPTY_FORM);
          onLoginSuccess?.(role);
        }
      } else if (tab === "2fa") {
        const data = await authService.verify2FA(pendingUserId, twoFactorCode);
        const role = data.user?.role || "cliente";

        setForm(EMPTY_FORM);
        setTwoFactorCode("");
        setPendingUserId(null);
        onLoginSuccess?.(role);
      } else if (tab === "register") {
        await authService.register(form);
        const res = await authService.login(form.email, form.password);

        if (res.requires2FA) {
          setPendingUserId(res.userId);
          setTab("2fa");
          setSuccessMsg("Cuenta creada. Ingresa el código enviado a tu correo.");
        } else {
          const role = res.user?.role || "cliente";
          setForm(EMPTY_FORM);
          onLoginSuccess?.(role);
        }
      } else if (tab === "convert") {
        const data = await authService.convertGuest(form.email, form.password, form.telefono);
        const role = data.user?.role || "cliente";
        setSuccessMsg("¡Cuenta activada con éxito! Tus compras previas han sido vinculadas.");
        setTimeout(() => {
          setForm(EMPTY_FORM);
          onLoginSuccess?.(role);
        }, 1200);
      } else if (tab === "forgot") {
        const res = await authService.forgotPassword(form.email);
        setSuccessMsg(res.message || "Hemos enviado las instrucciones a tu correo electrónico.");
      }
    } catch (err) {
      console.error("Error de autenticación:", err);
      const serverMessage =
        err.response?.data?.message ||
        "Error al comunicarse con el servidor. Revisa tus credenciales.";

      if (
        serverMessage.toLowerCase().includes("invitado") ||
        serverMessage.toLowerCase().includes("guest")
      ) {
        setTab("convert");
        setError("Este correo tiene pedidos previos como invitado. Define tu contraseña para activar tu cuenta.");
      } else {
        setError(serverMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError("");
      const data = await authService.googleLogin(credentialResponse.credential);
      const role = data.user?.role || "cliente";
      setForm(EMPTY_FORM);
      onLoginSuccess?.(role);
    } catch (err) {
      console.error("Error en Google Sign-In:", err);
      setError(err.response?.data?.message || "No se pudo iniciar sesión con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`overlay ${open ? "overlay-visible" : ""}`} onClick={onClose} />
      <aside className={`panel ${open ? "panel-open" : ""}`}>
        <div className="panel-band" aria-hidden="true" />
        <button className="panel-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <div className="panel-head">
          <p className="panel-eyebrow">Zona de atletas</p>
          <h2>
            {tab === "forgot"
              ? "RECUPERAR ACCESO"
              : tab === "2fa"
              ? "CÓDIGO DE SEGURIDAD"
              : tab === "convert"
              ? "ACTIVAR CUENTA"
              : "ACCEDÉ A TU CUENTA"}
          </h2>
        </div>

        {(tab === "login" || tab === "register") && (
          <div className="tabs">
            <button
              className={`tab ${tab === "login" ? "tab-active" : ""}`}
              onClick={() => { setTab("login"); setError(""); setSuccessMsg(""); }}
              type="button"
            >
              Iniciar sesión
            </button>
            <button
              className={`tab ${tab === "register" ? "tab-active" : ""}`}
              onClick={() => { setTab("register"); setError(""); setSuccessMsg(""); }}
              type="button"
            >
              Crear cuenta
            </button>
          </div>
        )}

        <form className="form" onSubmit={handleSubmit}>
          {tab === "register" && (
            <div className="field-row">
              <label className="field">
                <span>Nombre</span>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  type="text"
                  required
                />
              </label>
              <label className="field">
                <span>Apellido</span>
                <input
                  name="apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  placeholder="Tu apellido"
                  type="text"
                  required
                />
              </label>
            </div>
          )}

          {tab === "convert" && (
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 1rem 0", lineHeight: "1.4" }}>
              Ingresa el correo con el que realizaste tu compra como invitado y establece una contraseña para ver tus pedidos.
            </p>
          )}

          {(tab === "login" || tab === "register" || tab === "forgot" || tab === "convert") && (
            <label className="field">
              <span>Correo electrónico</span>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tucorreo@ejemplo.com"
                type="email"
                required
              />
            </label>
          )}

          {(tab === "register" || tab === "convert") && (
            <label className="field">
              <span>
                Teléfono {tab === "convert" && <small style={{ color: "#64748b", fontWeight: "normal" }}>(opcional)</small>}
              </span>
              <input
                name="telefono"
                value={form.telefono}
                onChange={handlePhoneChange}
                placeholder="5555-5555"
                type="tel"
                maxLength={9}
                inputMode="numeric"
                required={tab === "register"}
              />
            </label>
          )}

          {(tab === "login" || tab === "register" || tab === "convert") && (
            <label className="field">
              <span>{tab === "convert" ? "Nueva contraseña" : "Contraseña"}</span>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                type="password"
                required
              />
            </label>
          )}

          {(tab === "register" || tab === "convert") && (
            <label className="field">
              <span>Confirmar contraseña</span>
              <input
                name="confirmarPassword"
                value={form.confirmarPassword}
                onChange={handleChange}
                placeholder="••••••••"
                type="password"
                required
              />
            </label>
          )}

          {tab === "2fa" && (
            <label className="field">
              <span>Código de 6 dígitos</span>
              <input
                name="twoFactorCode"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                type="text"
                maxLength={6}
                inputMode="numeric"
                style={{ textAlign: "center", fontSize: "22px", letterSpacing: "5px" }}
                required
              />
            </label>
          )}

          {error && <p className="form-error">{error}</p>}
          {successMsg && (
            <p className="form-success" style={{ color: "#16a34a", fontSize: "13px", margin: "8px 0" }}>
              {successMsg}
            </p>
          )}

          {tab === "login" && (
            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0" }}>
              <button
                type="button"
                className="forgot"
                onClick={() => { setTab("forgot"); setError(""); setSuccessMsg(""); }}
              >
                ¿Olvidaste tu contraseña?
              </button>
              <button
                type="button"
                className="forgot"
                style={{ color: "#2563eb" }}
                onClick={() => { setTab("convert"); setError(""); setSuccessMsg(""); }}
              >
                ¿Compraste como invitado?
              </button>
            </div>
          )}

          {(tab === "forgot" || tab === "2fa" || tab === "convert") && (
            <button
              type="button"
              className="forgot"
              onClick={() => { setTab("login"); setError(""); setSuccessMsg(""); }}
              style={{ textAlign: "center", display: "block", width: "100%", margin: "8px 0" }}
            >
              ‹ Volver a iniciar sesión
            </button>
          )}

          <button className="submit" type="submit" disabled={loading}>
            {loading
              ? "Procesando..."
              : tab === "login"
              ? "Entrar"
              : tab === "register"
              ? "Crear cuenta"
              : tab === "convert"
              ? "Activar y Vincular Pedidos"
              : tab === "forgot"
              ? "Enviar enlace al correo"
              : "Verificar código"}
          </button>
        </form>

        {(tab === "login" || tab === "register") && (
          <>
            <div style={{ display: "flex", alignItems: "center", margin: "20px 0 16px 0", gap: 10 }}>
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e2e8f0" }} />
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>O CONTINÚA CON</span>
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e2e8f0" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("No se pudo conectar con el servicio de Google.")}
                theme="outline"
                size="large"
                shape="rectangular"
                text={tab === "login" ? "signin_with" : "signup_with"}
                width="100%"
              />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
import { useEffect, useState } from "react";
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


export default function LoginPanel({ open, initialTab, onClose, onLoginSuccess }) {
  const [tab, setTab] = useState(initialTab ?? "login");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab ?? "login");
      setError("");
    }
  }, [open, initialTab]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (tab === "register" && form.password !== form.confirmarPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      if (tab === "login") {
        // 1. Llamamos al login. 'data' ahora contiene el usuario curado por el service.
        const data = await authService.login(form.email, form.password);
        
        
        const role = data.user?.role || "cliente";

        setForm(EMPTY_FORM);
        onLoginSuccess?.(role);
      } else {
        // Registro
        await authService.register(form);
        // Autologin tras registrarse exitosamente
        const data = await authService.login(form.email, form.password);

        
        const role = data.user?.role || "cliente";
      

        setForm(EMPTY_FORM);
        onLoginSuccess?.(role);
      }
    } catch (err) {
      console.error("Error de autenticación:", err);
      const serverMessage =
        err.response?.data?.message ||
        "Error al comunicarse con el servidor. Revisa tus credenciales.";
      setError(serverMessage);
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
          <h2>ACCEDÉ A TU CUENTA</h2>
        </div>

        <div className="tabs">
          <button
            className={`tab ${tab === "login" ? "tab-active" : ""}`}
            onClick={() => { setTab("login"); setError(""); }}
            type="button"
          >
            Iniciar sesión
          </button>
          <button
            className={`tab ${tab === "register" ? "tab-active" : ""}`}
            onClick={() => { setTab("register"); setError(""); }}
            type="button"
          >
            Crear cuenta
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          {tab === "register" && (
            <>
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
              <label className="field">
                <span>Teléfono</span>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="0000-0000"
                  type="tel"
                  required
                />
              </label>
            </>
          )}

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

          <label className="field">
            <span>Contraseña</span>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              type="password"
              required
            />
          </label>

          {tab === "register" && (
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

          {error && <p className="form-error">{error}</p>}

          {tab === "login" && (
            <button type="button" className="forgot">
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button className="submit" type="submit" disabled={loading}>
            {loading ? "Procesando..." : tab === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
      </aside>
    </>
  );
}
import { useState } from "react";
import { authService } from "../../services/authService";

export default function ResetPasswordPage({ onNavigateLogin }) {
  // 1. Extraer el token de la URL (?token=...)
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Si alguien entra sin token en la URL
  if (!token) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, textAlign: "center", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <h2 style={{ color: "#0f172a" }}>Enlace Inválido</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          No se encontró un token válido de recuperación. Por favor, solicita un nuevo enlace desde la tienda.
        </p>
        <button
          onClick={onNavigateLogin}
          style={{ background: "#0f172a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      // 2. Llamada a authService.resetPassword
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "El enlace es inválido o ha expirado. Solicita uno nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, textAlign: "center", border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 8 }}>
        <h2 style={{ color: "#16a34a" }}>¡Contraseña Actualizada!</h2>
        <p style={{ color: "#374151", fontSize: 14, margin: "16px 0" }}>
          Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión con tu nueva clave.
        </p>
        <button
          onClick={onNavigateLogin}
          style={{ background: "#0f172a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
        >
          Iniciar Sesión
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff" }}>
      <h2 style={{ color: "#0f172a", marginTop: 0 }}>Restablecer Contraseña</h2>
      <p style={{ color: "#64748b", fontSize: 14 }}>Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
          <span>Nueva Contraseña</span>
          <input
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={{ padding: 10, borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
          <span>Confirmar Nueva Contraseña</span>
          <input
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ padding: 10, borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </label>

        {error && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ background: "#0f172a", color: "#fff", border: "none", padding: 12, borderRadius: 6, cursor: "pointer", fontWeight: "bold", marginTop: 8 }}
        >
          {loading ? "Actualizando..." : "Guardar Nueva Contraseña"}
        </button>
      </form>
    </div>
  );
}
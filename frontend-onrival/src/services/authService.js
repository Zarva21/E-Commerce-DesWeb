import api from "../config/api";

// Función auxiliar para leer el contenido del JWT sin librerías externas
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Helper para guardar sesión uniforme en localStorage
function saveSession(data) {
  if (!data?.accessToken) return data;

  // 1. Guardar tokens de acceso y refresco
  localStorage.setItem("accessToken", data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
  }

  const payload = parseJwt(data.accessToken);

  // 2. Detección de Rol
  let roleName =
    data.user?.role?.name ||
    data.user?.role ||
    data.role ||
    payload?.role ||
    null;

  if (!roleName) {
    const rid = String(payload?.role_id || data.role_id || "");
    if (rid === "1" || rid === "2") {
      roleName = "admin";
    } else if (rid === "19") {
      roleName = "employee";
    } else {
      roleName = "customer";
    }
  } else {
    roleName = String(roleName).toLowerCase();
  }

  const resolvedCustomerId =
    data.customer_id ||
    data.customer?.id ||
    payload?.customer_id ||
    null;

  const sessionUser = {
    id: data.id || payload?.id,
    customer_id: resolvedCustomerId,
    email: data.email || payload?.email,
    role_id: payload?.role_id || data.role_id,
    role: roleName,
    firstName: data.customer?.first_name || "",
    lastName: data.customer?.last_name || "",
    phone: data.customer?.phone || "",
  };

  localStorage.setItem("user", JSON.stringify(sessionUser));
  return { ...data, user: sessionUser };
}

export const authService = {
  // Login regular
  async login(email, password) {
    const res = await api.post("/users/auth/signin", { email, password });
    const data = res.data;

    // Si el backend solicita verificación de código 2FA
    if (data.requires2FA) {
      return data;
    }

    return saveSession(data);
  },

  // Registro público de clientes (usando auth/signup)
  async register({ nombre, apellido, telefono, email, password }) {
    const res = await api.post("/users/auth/signup", {
      email,
      password,
      first_name: nombre,
      last_name: apellido,
      phone: telefono,
      address: {
        country: "GT",
        city: "Guatemala",
        address_line1: "Ciudad de Guatemala",
      },
    });
    return res.data;
  },

  // Convertir comprador invitado en cuenta registrada
  async convertGuest(email, password, phone = null) {
    const res = await api.post("/users/auth/convert-guest", { email, password, phone });
    return saveSession(res.data);
  },

  // Solicitar correo de recuperación de contraseña
  async forgotPassword(email) {
    const res = await api.post("/users/auth/forgot-password", { email });
    return res.data;
  },

  // Restablecer contraseña con el token del correo
  async resetPassword(token, newPassword) {
    const res = await api.post("/users/auth/reset-password", { token, newPassword });
    return res.data;
  },

  // Solicitar código 2FA / OTP al correo
  async send2FA(email) {
    const res = await api.post("/users/auth/send-2fa", { email });
    return res.data;
  },

  // Validar código 2FA e iniciar sesión con JWT
  async verify2FA(userId, code) {
    const res = await api.post("/users/auth/verify-2fa", { userId, code });
    return saveSession(res.data);
  },

  // Cierre de sesión e invalidación en backend (Redis)
  async logout() {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) {
        await api.post("/users/auth/logout", { refreshToken });
      }
    } catch {
      // Ignorar error de red al salir
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  },

  getUserRole() {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return user.role || null;
    } catch {
      return null;
    }
  },

  async googleLogin(credential) {
    const res = await api.post("/users/auth/google", { credential });
    return saveSession(res.data);
  },
};

export default authService;
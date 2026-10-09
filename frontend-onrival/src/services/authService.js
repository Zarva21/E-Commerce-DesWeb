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

export const authService = {
  async login(email, password) {
    const res = await api.post("/users/auth/signin", { email, password });
    const data = res.data; // { id, email, accessToken, expiresIn }

    if (data.accessToken) {
      localStorage.setItem("accessToken", data.accessToken);

      // Decodificamos el JWT para ver qué role_id tiene adentro
      const payload = parseJwt(data.accessToken);

      // NOTA: Revisa qué ID tiene el rol de admin en tu tabla `roles` de PostgreSQL.
      // En tu token dice "role_id": "2". Si 2 (o 1) es el admin:
      const isAdmin = String(payload?.role_id) === "2" || String(payload?.role_id) === "1"; // Ajusta al ID de tu admin
      const roleName = isAdmin ? "admin" : "cliente";

      const resolvedCustomerId =
        data.customer_id ||
        data.customer?.id ||
        payload?.customer_id ||
        null;

      const sessionUser = {
        id: data.id,                   
        customer_id: resolvedCustomerId,    
        email: data.email,
        role_id: payload?.role_id,
        role: roleName,
        firstName: data.customer?.first_name || "",
        lastName: data.customer?.last_name || "",
        phone: data.customer?.phone || "",
      };

      localStorage.setItem("user", JSON.stringify(sessionUser));
      return { ...data, user: sessionUser };
    }

    return data;
  },

  // Registro: crea el cliente directamente
  async register({ nombre, apellido, telefono, email, password }) {
    const res = await api.post("/users/customers", {
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

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
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


  
};
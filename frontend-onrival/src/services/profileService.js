import api from "../config/api";

export const profileService = {
  // Obtiene los datos del cliente logueado
  async getProfile() {
    const res = await api.get("/users/customers/me");
    return res.data?.data || res.data || {};
  },

  // Actualiza los datos del cliente
  async updateProfile(profileData) {
    const res = await api.put("/users/customers/me", profileData);
    return res.data?.data || res.data || {};
  },

  // Consulta el historial de pedidos del cliente (Storefront)
  async getMyOrders() {
    const res = await api.get("/sales/orders/me");
    // Desempaqueta res.data.data o res.data como arreglo
    if (Array.isArray(res.data?.data)) {
      return res.data.data;
    }
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },
};

export default profileService;
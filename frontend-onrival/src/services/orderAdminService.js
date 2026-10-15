import api from "../config/api";

export const orderAdminService = {
  // Obtener todos los pedidos con cliente, dirección y estado de pago
  async getAll(params = {}) {
    const res = await api.get("/sales/orders", { params });
    return res.data?.data || res.data;
  },

  // Obtener un pedido puntual por su ID
  async getById(orderId) {
    const res = await api.get(`/sales/orders/${orderId}`);
    return res.data?.data || res.data;
  },

  // Actualizar el estado de la orden (máquina de estados)
  async updateStatus(orderId, newStatus) {
    const res = await api.patch(`/sales/orders/${orderId}/status`, {
      status: newStatus,
    });
    return res.data?.data || res.data;
  },
};
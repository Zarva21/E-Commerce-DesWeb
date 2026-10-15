import api from "../config/api";

export const couponService = {
  /**
   * Valida un cupón con el backend
   * @param {string} code Código ingresado (ej: ONRIVAL10)
   * @param {number} subtotal Subtotal actual del carrito
   * @param {Array} cartItems Items del carrito [{ product_id, category_id, line_total }]
   */
  async validate(code, subtotal, cartItems = []) {
    const res = await api.post("/marketing/coupons/validate", {
      code,
      subtotal,
      cartItems: cartItems.map((item) => ({
        product_id: item.product_id || item.productId,
        category_id: item.category_id || item.categoryId,
        quantity: item.quantity,
        line_total: Number(item.price || item.unit_price) * item.quantity
      }))
    });
    return res.data; // { valid: true, coupon_id, discount_amount }
  },

  // CRUD para el Panel de Admin
  async getAll(params = {}) {
    const res = await api.get("/marketing/coupons", { params });
    return res.data?.data || res.data;
  },

  async create(data) {
    const res = await api.post("/marketing/coupons", data);
    return res.data?.data || res.data;
  },

  async update(id, data) {
    const res = await api.put(`/marketing/coupons/${id}`, data);
    return res.data?.data || res.data;
  },

  async delete(id) {
    const res = await api.delete(`/marketing/coupons/${id}`);
    return res.data;
  }
};
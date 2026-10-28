import api from "../config/api";

export const couponService = {
  /**
   * Valida un cupón con el backend
   * @param {string} code Código ingresado (ej: NUEVO26)
   * @param {number} subtotal Subtotal actual del carrito
   * @param {Array} cartItems Items del carrito
   */
  async validate(code, subtotal, cartItems = []) {
    const payloadItems = cartItems.map((item) => {
      const prodId =
        item.product_id ||
        item.productId ||
        item.product?.id ||
        item.id;

      const catId =
        item.category_id ||
        item.categoryId ||
        item.product?.category_id ||
        null;

      const price = Number(item.price || item.unit_price || 0);
      const qty = Number(item.quantity || 1);

      return {
        product_id: prodId,
        category_id: catId,
        quantity: qty,
        line_total: Number(item.line_total || price * qty),
      };
    });

    const res = await api.post("/marketing/coupons/validate", {
      code: code.trim().toUpperCase(),
      subtotal: Number(subtotal),
      cartItems: payloadItems,
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
  },
};
import api from "../config/api";

export const inventoryService = {
  // GET /inventory/stock
  async getStock() {
    const res = await api.get("/inventory/stock");
    return res.data?.data || res.data;
  },

  // GET /inventory/movements
  async getMovements(params = {}) {
    const res = await api.get("/inventory/movements", { params });
    return res.data?.data || res.data;
  },

  // Enrutador inteligente según el tipo de movimiento
  async recordMovement({ product_variant_id, movement_type, quantity, reference, notes }) {
    if (movement_type === "PURCHASE_IN") {
      // POST /inventory/receive
      const res = await api.post("/inventory/receive", {
        product_variant_id,
        quantity,
        reference,
        notes,
      });
      return res.data?.data || res.data;
    } else {
      // POST /inventory/adjust (DAMAGE_OUT o SUPPLIER_RETURN_OUT)
      const res = await api.post("/inventory/adjust", {
        product_variant_id,
        quantity,
        movement_type,
        notes,
      });
      return res.data?.data || res.data;
    }
  },
};
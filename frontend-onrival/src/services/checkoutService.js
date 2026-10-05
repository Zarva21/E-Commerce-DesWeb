import api from "../config/api";

export const checkoutService = {
  // 1. Obtener o crear carrito para cliente autenticado
  async getCustomerCart(customerId) {
    console.log("[checkoutService] Solicitando carrito para customerId:", customerId);
    const res = await api.get(`/sales/carts/customer/${customerId}`);
    console.log("[checkoutService] Respuesta getCustomerCart:", res.data);
    return res.data?.data || res.data;
  },

  // 2. Crear carrito para invitado (guest)
  async createGuestCart() {
    console.log("[checkoutService] Creando carrito para invitado");
    const res = await api.post("/sales/carts/guest");
    console.log("[checkoutService] Respuesta createGuestCart:", res.data);
    return res.data?.data || res.data;
  },

  // 3. Agregar ítem al carrito de la base de datos
  async addItemToCart(cartId, variantId, quantity) {
    console.log(`[checkoutService] Agregando ítem a cartId ${cartId}:`, { variantId, quantity });
    const res = await api.post(`/sales/carts/${cartId}/items`, {
      product_variant_id: variantId,
      quantity,
    });
    return res.data?.data || res.data;
  },

  // 4. Crear PaymentIntent en Stripe
  async createPaymentIntent(cartId) {
    console.log("[checkoutService] Creando PaymentIntent para cartId:", cartId);
    const res = await api.post("/sales/checkout/intent", { cart_id: cartId });
    console.log("[checkoutService] Respuesta PaymentIntent:", res.data);
    return res.data?.data || res.data;
  },

  // 5. Confirmar checkout y cerrar orden
  async confirmCheckout(payload) {
    console.log("[checkoutService] Enviando confirmCheckout con payload:", payload);
    const res = await api.post("/sales/checkout/confirm", payload);
    console.log("[checkoutService] Orden confirmada exitosamente:", res.data);
    return res.data?.data || res.data;
  },
};


export default checkoutService;
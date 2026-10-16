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

 // Limpiar carrito antes de reinsertar (evita acumulación si rebota la tarjeta)
  async clearCartItems(cartId) {
    const res = await api.delete(`/sales/carts/${cartId}/items`);
    return res.data;
  },

  // 4. Crear PaymentIntent considerando cupón y envío
  async createPaymentIntent(cartId, couponCode = null, shippingCost = 0) {
    const payload = { 
      cart_id: Number(cartId),
      shipping_cost: Number(shippingCost)
    };
    if (couponCode && couponCode.trim()) {
      payload.coupon_code = couponCode.trim().toUpperCase();
    }

    const res = await api.post("/sales/checkout/intent", payload);
    return res.data?.data || res.data;
  },

  // 5. Confirmar checkout y cerrar orden
  async confirmCheckout(payload) {
  // Limpiar payload: no enviar coupon_code si viene null, undefined o string vacío
  const cleanPayload = { ...payload };

  if (!cleanPayload.coupon_code || !cleanPayload.coupon_code.trim()) {
    delete cleanPayload.coupon_code;
  } else {
    cleanPayload.coupon_code = cleanPayload.coupon_code.trim().toUpperCase();
  }

  // Si no es compra como invitado, omitir guest_data si va vacío
  if (cleanPayload.guest_data && Object.keys(cleanPayload.guest_data).length === 0) {
    delete cleanPayload.guest_data;
  }

  console.log("[checkoutService] Enviando confirmCheckout saneado:", cleanPayload);
  const res = await api.post("/sales/checkout/confirm", cleanPayload);
  return res.data?.data || res.data;
},

async syncCart(cartId, items) {
  console.log(`[checkoutService] Sincronizando carrito ${cartId} con ítems:`, items);
  const res = await api.put(`/sales/carts/${cartId}/sync`, {
    items: items.map((i) => ({
      product_variant_id: i.product_variant_id || i.id,
      quantity: i.quantity,
    })),
  });
  return res.data?.data || res.data;
},

};


export default checkoutService;
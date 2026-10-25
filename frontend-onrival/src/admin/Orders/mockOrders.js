// TODO: reemplazar por el fetch real a la API cuando esté lista.
// payment_method: "contra_entrega" | "tarjeta"
// paid / paid_at: si el pedido ya se cobró (efectivo) o se pagó (tarjeta), y cuándo.
export const MOCK_ORDERS = [];

export function findOrderById(id) {
  return MOCK_ORDERS.find((order) => order.id === id);
}

export const ORDER_STATUSES = ["Pendiente", "Enviado", "Entregado", "Cancelado"];

export const PAYMENT_METHODS = {
  contra_entrega: "Pago contra entrega",
  tarjeta: "Tarjeta de crédito/débito",
};

// Marca un pedido contra entrega como cobrado y devuelve la fecha del cobro
// (o null si no se pudo: no existe, no es contra entrega o ya estaba cobrado).
// Modifica el dato en memoria para que siga cobrado al salir y volver a entrar al detalle.
// TODO: con backend, esto es una llamada a la API que registra el cobro.
export function markOrderCollected(id) {
  const order = findOrderById(id);
  if (!order || order.payment_method !== "contra_entrega" || order.paid) return null;

  order.paid = true;
  order.paid_at = new Date().toISOString();
  return order.paid_at;
}

// Cambia el estado de un pedido y devuelve true si se pudo.
// Modifica el dato en memoria para que la lista de pedidos y el panel general lo reflejen.
// TODO: con backend, esto es una llamada a la API que guarda el nuevo estado.
export function updateOrderStatus(id, status) {
  const order = findOrderById(id);
  if (!order || !ORDER_STATUSES.includes(status)) return false;

  order.status = status;
  return true;
}
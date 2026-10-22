// TODO: reemplazar por el fetch real a la API cuando esté lista.
// payment_method: "contra_entrega" | "tarjeta"
// paid / paid_at: si el pedido ya se cobró (efectivo) o se pagó (tarjeta), y cuándo.
export const MOCK_ORDERS = [
  {
    id: "1001",
    customer: "María Fernández",
    email: "maria@correo.com",
    date: "2026-08-20",
    status: "Pendiente",
    payment_method: "contra_entrega",
    paid: false,
    paid_at: null,
    address: "5ta avenida 3-45, zona 10, Guatemala",
    items: [
      { id: "zapato-1", name: "Tacos F50 Pro Firm", size: "9", quantity: 1, price: 1850 },
    ],
    total: 1850,
  },
  {
    id: "1002",
    customer: "Luis Ramírez",
    email: "luis@correo.com",
    date: "2026-08-19",
    status: "Enviado",
    payment_method: "contra_entrega",
    paid: false,
    paid_at: null,
    address: "Colonia Las Flores, San Lucas Sacatepéquez",
    items: [
      { id: "zapato-2", name: "Nike Pegasus 42", size: "10", quantity: 1, price: 1850 },
      { id: "playera-1", name: "Playera Dri-FIT", size: "M", quantity: 2, price: 180 },
    ],
    total: 2210,
  },
  {
    id: "1003",
    customer: "Sofía Castillo",
    email: "sofia@correo.com",
    date: "2026-08-18",
    status: "Entregado",
    payment_method: "tarjeta",
    paid: true,
    paid_at: "2026-08-18T15:20:00.000Z",
    address: "Zona 15, Guatemala",
    items: [
      { id: "zapato-3", name: "Ultraboost Light W", size: "7", quantity: 1, price: 1650 },
    ],
    total: 1650,
  },
  {
    id: "1004",
    customer: "Jorge Aguilar",
    email: "jorge@correo.com",
    date: "2026-08-17",
    status: "Cancelado",
    payment_method: "contra_entrega",
    paid: false,
    paid_at: null,
    address: "Antigua Guatemala, Sacatepéquez",
    items: [
      { id: "zapato-1", name: "Tacos F50 Pro Firm", size: "8.5", quantity: 1, price: 1850 },
    ],
    total: 1850,
  },
];

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
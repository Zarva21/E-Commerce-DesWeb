// TODO: reemplazar por el fetch real a la API cuando esté lista.
export const MOCK_ORDERS = [
  {
    id: "1001",
    customer: "María Fernández",
    email: "maria@correo.com",
    date: "2026-08-20",
    status: "Pendiente",
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
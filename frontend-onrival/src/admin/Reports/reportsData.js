// Datos simulados de los reportes (los mismos que estaban en el panel general).
// TODO: con backend, estos se calculan en la API a partir de los pedidos.
export const MOCK_MONTHLY_SALES = [
  { month: "Mayo 2026", ordersCount: 14, totalAmount: 18450.0 },
  { month: "Junio 2026", ordersCount: 22, totalAmount: 26800.0 },
  { month: "Julio 2026", ordersCount: 19, totalAmount: 21350.0 },
  { month: "Agosto 2026", ordersCount: 31, totalAmount: 38900.0 },
  { month: "Septiembre 2026", ordersCount: 28, totalAmount: 34120.0 },
];

export const MOCK_TOP_PRODUCTS = [
  { id: 1, name: "Tacos F50 Pro Firm", salesCount: 142, revenue: 262700.0, brand: "Adidas" },
  { id: 2, name: "Playera Dri-FIT", salesCount: 98, revenue: 17640.0, brand: "Nike" },
  { id: 3, name: "Chumpa Deportiva Waterproof", salesCount: 65, revenue: 35750.0, brand: "Puma" },
  { id: 4, name: "Balón Oficial de Competencia", salesCount: 54, revenue: 13500.0, brand: "Molten" },
];
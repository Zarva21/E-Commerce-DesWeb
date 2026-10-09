import { MOCK_INVENTORY } from "../Inventory/mockInventory";
import { MOCK_EMPLOYEES } from "../Users/mockUsers";
import { MOCK_ORDERS } from "../Orders/mockOrders";
import { MOCK_OFFERS } from "../Offers/mockOffers";
import { MOCK_PRODUCTS } from "../Catalog/mockCatalog";
import "./DashboardHome.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

// Datos simulados para el reporte de ventas mensuales
const MOCK_MONTHLY_SALES = [
  { month: "Mayo 2026", ordersCount: 14, totalAmount: 18450.0 },
  { month: "Junio 2026", ordersCount: 22, totalAmount: 26800.0 },
  { month: "Julio 2026", ordersCount: 19, totalAmount: 21350.0 },
  { month: "Agosto 2026", ordersCount: 31, totalAmount: 38900.0 },
  { month: "Septiembre 2026", ordersCount: 28, totalAmount: 34120.0 },
];

export default function DashboardHome({ onNavigate }) {
  // Sincronización con modelos actualizados del backend/MOCKs:
  const pendingOrders = MOCK_ORDERS.filter((o) => o.status === "Pendiente").length;
  const activeOffers = MOCK_OFFERS.filter((o) => o.is_active ?? o.active).length;
  const activeEmployees = MOCK_EMPLOYEES.filter(
    (e) => e.is_active ?? e.active ?? e.status === "Activo"
  ).length;

  // Indicadores de Estado de Existencias
  const lowStockItems = MOCK_INVENTORY.filter(
    (item) => item.quantity_on_hand <= item.reorder_level && item.quantity_on_hand > 0
  );
  const outOfStockItems = MOCK_INVENTORY.filter((item) => item.quantity_on_hand === 0);
  const normalStockCount = MOCK_INVENTORY.filter(
    (item) => item.quantity_on_hand > item.reorder_level
  ).length;

  const stats = [
    {
      id: "inventario",
      label: "Total Ítems / Stock Bajo",
      value: `${MOCK_INVENTORY.length} / ${lowStockItems.length + outOfStockItems.length}`,
      hint: "Ver inventario →",
    },
    {
      id: "usuarios",
      label: "Empleados / Usuarios activos",
      value: activeEmployees,
      hint: "Ver usuarios →",
    },
    {
      id: "pedidos",
      label: "Pedidos pendientes",
      value: pendingOrders,
      hint: "Ver pedidos →",
    },
    {
      id: "ofertas",
      label: "Ofertas / Cupones activos",
      value: activeOffers,
      hint: "Ver ofertas →",
    },
  ];

  // Datos simulados para Productos Más Vendidos
  const topSellingProducts = [
    { id: 1, name: "Tacos F50 Pro Firm", salesCount: 142, revenue: 262700.0, brand: "Adidas" },
    { id: 2, name: "Playera Dri-FIT", salesCount: 98, revenue: 17640.0, brand: "Nike" },
    { id: 3, name: "Chumpa Deportiva Waterproof", salesCount: 65, revenue: 35750.0, brand: "Puma" },
    { id: 4, name: "Balón Oficial de Competencia", salesCount: 54, revenue: 13500.0, brand: "Molten" },
  ];

  // Cálculo del mes con mayores ventas
  const maxMonthlySales = Math.max(...MOCK_MONTHLY_SALES.map((s) => s.totalAmount));

  return (
    <div className="dashboard">
      {/* TARJETAS DE INDICADORES PRINCIPALES */}
      <div className="dashboard-stats">
        {stats.map((stat) => (
          <button
            type="button"
            key={stat.id}
            className="dashboard-stat"
            onClick={() => onNavigate(stat.id)}
          >
            <p className="dashboard-stat-label">{stat.label}</p>
            <p className="dashboard-stat-value">{stat.value}</p>
            <span className="dashboard-stat-hint">{stat.hint}</span>
          </button>
        ))}
      </div>

      {/* REPORTE 1: VENTAS MENSUALES */}
      <div className="dashboard-card dashboard-section">
        <div className="dashboard-card-head">
          <div>
            <h3>Ventas Mensuales Realizadas</h3>
            <p className="dashboard-subtitle">Histórico consolidado de ingresos por mes</p>
          </div>
          <button type="button" className="dashboard-card-link" onClick={() => onNavigate("pedidos")}>
            Ver detalle de pedidos
          </button>
        </div>

        <div className="monthly-sales-chart">
          {MOCK_MONTHLY_SALES.map((item) => {
            const barHeightPercentage = Math.round((item.totalAmount / maxMonthlySales) * 100);
            return (
              <div key={item.month} className="monthly-sales-col">
                <span className="monthly-sales-val">{formatPrice(item.totalAmount)}</span>
                <div className="bar-container">
                  <div
                    className="bar-fill"
                    style={{ height: `${barHeightPercentage}%` }}
                    title={`${item.ordersCount} pedidos`}
                  />
                </div>
                <span className="monthly-sales-label">{item.month}</span>
                <span className="monthly-sales-sub">{item.ordersCount} ped.</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRID DE REPORTE DE PRODUCTOS MÁS VENDIDOS Y ESTADO DE EXISTENCIAS */}
      <div className="dashboard-grid">
        {/* REPORTE 2: PRODUCTOS MÁS VENDIDOS */}
        <div className="dashboard-card">
          <div className="dashboard-card-head">
            <h3>Productos Más Vendidos</h3>
            <button type="button" className="dashboard-card-link" onClick={() => onNavigate("catalogo")}>
              Ir al catálogo
            </button>
          </div>

          <ul className="dashboard-ranking-list">
            {topSellingProducts.map((prod, index) => (
              <li key={prod.id}>
                <span className={`ranking-badge rank-${index + 1}`}>{index + 1}</span>
                <div className="ranking-details">
                  <span className="ranking-name">{prod.name}</span>
                  <span className="ranking-brand">{prod.brand} • {prod.salesCount} uds. vendidas</span>
                </div>
                <span className="ranking-revenue">{formatPrice(prod.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* REPORTE 3: ESTADO DE EXISTENCIAS */}
        <div className="dashboard-card">
          <div className="dashboard-card-head">
            <h3>Estado de Existencias</h3>
            <button type="button" className="dashboard-card-link" onClick={() => onNavigate("inventario")}>
              Gestionar stock
            </button>
          </div>

          <div className="stock-summary-pills">
            <div className="stock-pill pill-success">
              <span className="stock-pill-count">{normalStockCount}</span>
              <span className="stock-pill-label">Stock Normal</span>
            </div>
            <div className="stock-pill pill-warning">
              <span className="stock-pill-count">{lowStockItems.length}</span>
              <span className="stock-pill-label">Stock Bajo</span>
            </div>
            <div className="stock-pill pill-danger">
              <span className="stock-pill-count">{outOfStockItems.length}</span>
              <span className="stock-pill-label">Agotados</span>
            </div>
          </div>

          <h4 className="stock-subtitle">Alertas que requieren reabastecimiento:</h4>
          <ul className="dashboard-stock-alert-list">
            {[...outOfStockItems, ...lowStockItems].slice(0, 4).map((item) => (
              <li key={item.id}>
                <div className="stock-alert-info">
                  <span className="stock-alert-sku">SKU: {item.sku}</span>
                  <span className="stock-alert-location">Ubicación: {item.location || "N/A"}</span>
                </div>
                <div className="stock-alert-qty">
                  <span className={item.quantity_on_hand === 0 ? "qty-out" : "qty-low"}>
                    {item.quantity_on_hand === 0 ? "Agotado" : `${item.quantity_on_hand} en stock`}
                  </span>
                  <span className="stock-reorder-tag">Mín: {item.reorder_level}</span>
                </div>
              </li>
            ))}
            {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
              <p className="dashboard-empty-msg">No hay alertas de stock por reabastecer.</p>
            )}
          </ul>
        </div>
      </div>

      {/* SECCIÓN ORIGINAL: ÚLTIMOS PEDIDOS */}
      <div className="dashboard-card dashboard-section">
        <div className="dashboard-card-head">
          <h3>Últimos pedidos</h3>
          <button type="button" className="dashboard-card-link" onClick={() => onNavigate("pedidos")}>
            Ver todos
          </button>
        </div>

        <ul className="dashboard-order-list">
          {MOCK_ORDERS.slice(0, 4).map((order) => (
            <li key={order.id}>
              <span className="dashboard-order-id">#{order.id}</span>
              <span className="dashboard-order-customer">{order.customer}</span>
              <span className="dashboard-order-total">{formatPrice(order.total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
import { MOCK_INVENTORY } from "../Inventory/mockInventory";
import { MOCK_EMPLOYEES } from "../Users/mockUsers";
import { MOCK_ORDERS } from "../Orders/mockOrders";
import { MOCK_OFFERS } from "../Offers/mockOffers";
import "./DashboardHome.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

export default function DashboardHome({ onNavigate }) {
  // Sincronización con modelos actualizados del backend/MOCKs:
  const pendingOrders = MOCK_ORDERS.filter((o) => o.status === "Pendiente").length;
  const activeOffers = MOCK_OFFERS.filter((o) => o.is_active ?? o.active).length;
  const activeEmployees = MOCK_EMPLOYEES.filter(
    (e) => e.is_active ?? e.active ?? e.status === "Activo"
  ).length;

  // Conteo de variantes en alerta de bajo stock (quantity_on_hand <= reorder_level)
  const lowStockCount = MOCK_INVENTORY.filter(
    (item) => item.quantity_on_hand <= item.reorder_level
  ).length;

  const stats = [
    {
      id: "inventario",
      label: "Total Ítems / Stock Bajo",
      value: `${MOCK_INVENTORY.length} / ${lowStockCount}`,
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

  return (
    <div className="dashboard">
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

      <div className="dashboard-card">
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
import PageHeader from "../ui/PageHeader";
import { MOCK_MONTHLY_SALES, MOCK_TOP_PRODUCTS } from "./reportsData";
import "../Dashboard/DashboardHome.css"; // tarjetas, gráfico de barras y ranking
import "./ReportsPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

export default function ReportsPage({ onNavigate }) {
  const sales = MOCK_MONTHLY_SALES;

  // Indicadores resumidos del período
  const totalAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalOrders = sales.reduce((sum, s) => sum + s.ordersCount, 0);
  const averageTicket = totalOrders > 0 ? totalAmount / totalOrders : 0;
  const maxMonthlySales = Math.max(...sales.map((s) => s.totalAmount));
  const bestMonth = sales.find((s) => s.totalAmount === maxMonthlySales);

  const kpis = [
    { label: "Ventas totales", value: formatPrice(totalAmount), sub: `${sales.length} meses` },
    { label: "Pedidos", value: totalOrders, sub: "En el período" },
    { label: "Ticket promedio", value: formatPrice(averageTicket), sub: "Por pedido" },
    { label: "Mejor mes", value: bestMonth?.month ?? "—", sub: bestMonth ? formatPrice(bestMonth.totalAmount) : "" },
  ];

  return (
    <div className="reports-page">
      <PageHeader title="Reportes" subtitle="Ventas y productos con mejor desempeño de la tienda" />

      {/* INDICADORES RESUMIDOS */}
      <div className="reports-kpis">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="reports-kpi">
            <p className="reports-kpi-label">{kpi.label}</p>
            <p className="reports-kpi-value">{kpi.value}</p>
            <span className="reports-kpi-sub">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* REPORTE 1: VENTAS MENSUALES */}
      <div className="dashboard-card dashboard-section">
        <div className="dashboard-card-head">
          <div>
            <h3>Ventas Mensuales Realizadas</h3>
            <p className="dashboard-subtitle">Histórico consolidado de ingresos por mes</p>
          </div>
          <button type="button" className="dashboard-card-link" onClick={() => onNavigate?.("pedidos")}>
            Ver detalle de pedidos
          </button>
        </div>

        <div className="monthly-sales-chart">
          {sales.map((item) => {
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

      {/* REPORTE 2: PRODUCTOS MÁS VENDIDOS */}
      <div className="dashboard-card dashboard-section">
        <div className="dashboard-card-head">
          <div>
            <h3>Productos Más Vendidos</h3>
            <p className="dashboard-subtitle">Ranking por unidades vendidas</p>
          </div>
          <button type="button" className="dashboard-card-link" onClick={() => onNavigate?.("catalogo")}>
            Ir al catálogo
          </button>
        </div>

        <ul className="dashboard-ranking-list">
          {MOCK_TOP_PRODUCTS.map((prod, index) => (
            <li key={prod.id}>
              <span className={`ranking-badge rank-${index + 1}`}>{index + 1}</span>
              <div className="ranking-details">
                <span className="ranking-name">{prod.name}</span>
                <span className="ranking-brand">
                  {prod.brand} • {prod.salesCount} uds. vendidas
                </span>
              </div>
              <span className="ranking-revenue">{formatPrice(prod.revenue)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
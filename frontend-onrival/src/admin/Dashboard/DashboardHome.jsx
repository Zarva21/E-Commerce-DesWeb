import { useEffect, useState } from "react";
import { reportsService } from "../../services/reportsService";
import "./DashboardHome.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value || 0);

export default function DashboardHome({ onNavigate, showSalesStats = true, allowedViews }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    inventory: { total: 0, normal: 0, low: 0, out: 0 },
    activeEmployees: 0,
    pendingOrders: 0,
    activeCoupons: 0,
    monthlySales: [],
    topProducts: [],
    lowStockAlerts: [],
    recentOrders: []
  });

  useEffect(() => {
    let isMounted = true;
    const loadOverview = async () => {
      setLoading(true);
      try {
        const res = await reportsService.getHomeOverview();
        if (isMounted) {
          setData({
            inventory: res.inventory || { total: 0, normal: 0, low: 0, out: 0 },
            activeEmployees: res.activeEmployees || 0,
            pendingOrders: res.pendingOrders || 0,
            activeCoupons: res.activeCoupons || 0,
            monthlySales: res.monthlySales || [],
            topProducts: res.topProducts || [],
            lowStockAlerts: res.lowStockAlerts || [],
            recentOrders: res.recentOrders || []
          });
        }
      } catch (err) {
        console.error("Error al cargar DashboardHome:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOverview();
    return () => {
      isMounted = false;
    };
  }, []);

  const criticalStockCount = data.inventory.low + data.inventory.out;

  const allStats = [
    {
      id: "inventario",
      label: "Total Ítems / Stock Bajo",
      value: `${data.inventory.total} / ${criticalStockCount}`,
      hint: "Ver inventario →",
    },
    {
      id: "usuarios",
      label: "Empleados activos",
      value: data.activeEmployees,
      hint: "Ver usuarios →",
    },
    {
      id: "pedidos",
      label: "Pedidos pendientes",
      value: data.pendingOrders,
      hint: "Ver pedidos →",
    },
    {
      id: "ofertas",
      label: "Cupones activos",
      value: data.activeCoupons,
      hint: "Ver ofertas →",
    },
  ];

  const stats = allowedViews ? allStats.filter((s) => allowedViews.includes(s.id)) : allStats;
  const maxMonthlySales = data.monthlySales.length > 0
    ? Math.max(...data.monthlySales.map((s) => s.totalAmount || 0))
    : 1;

  if (loading) {
    return (
      <div className="dashboard" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
        <p>Cargando panel de control...</p>
      </div>
    );
  }

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
      {showSalesStats && (
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

          {data.monthlySales.length === 0 ? (
            <p className="dashboard-empty-msg" style={{ padding: "1.5rem 0" }}>No hay ventas registradas en el período.</p>
          ) : (
            <div className="monthly-sales-chart">
              {data.monthlySales.map((item) => {
                const barHeightPercentage = maxMonthlySales > 0
                  ? Math.round((item.totalAmount / maxMonthlySales) * 100)
                  : 0;
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
          )}
        </div>
      )}

      {/* GRID: PRODUCTOS MÁS VENDIDOS Y ESTADO DE EXISTENCIAS */}
      <div className={`dashboard-grid ${showSalesStats ? "" : "dashboard-grid-single"}`}>
        
        {/* REPORTE 2: PRODUCTOS MÁS VENDIDOS */}
        {showSalesStats && (
          <div className="dashboard-card">
            <div className="dashboard-card-head">
              <h3>Productos Más Vendidos</h3>
              <button type="button" className="dashboard-card-link" onClick={() => onNavigate("catalogo")}>
                Ir al catálogo
              </button>
            </div>

            {data.topProducts.length === 0 ? (
              <p className="dashboard-empty-msg" style={{ padding: "1.5rem 0" }}>Sin productos vendidos en pedidos completados.</p>
            ) : (
              <ul className="dashboard-ranking-list">
                {data.topProducts.map((prod, index) => (
                  <li key={prod.variantId || prod.id || index}>
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
            )}
          </div>
        )}

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
              <span className="stock-pill-count">{data.inventory.normal}</span>
              <span className="stock-pill-label">Stock Normal</span>
            </div>
            <div className="stock-pill pill-warning">
              <span className="stock-pill-count">{data.inventory.low}</span>
              <span className="stock-pill-label">Stock Bajo</span>
            </div>
            <div className="stock-pill pill-danger">
              <span className="stock-pill-count">{data.inventory.out}</span>
              <span className="stock-pill-label">Agotados</span>
            </div>
          </div>

          <h4 className="stock-subtitle">Alertas que requieren reabastecimiento:</h4>
          <ul className="dashboard-stock-alert-list">
            {data.lowStockAlerts.slice(0, 4).map((item) => (
              <li key={item.id ?? item.variantId}>
                <div className="stock-alert-info">
                  <span className="stock-alert-sku">SKU: {item.sku}</span>
                  <span className="stock-alert-location">{item.productName} ({item.size}/{item.color})</span>
                </div>
                <div className="stock-alert-qty">
                  <span className={item.stock === 0 ? "qty-out" : "qty-low"}>
                    {item.stock === 0 ? "Agotado" : `${item.stock} en stock`}
                  </span>
                  <span className="stock-reorder-tag">Mín: {item.reorderLevel || 5}</span>
                </div>
              </li>
            ))}
            {data.lowStockAlerts.length === 0 && (
              <p className="dashboard-empty-msg">No hay alertas de stock por reabastecer.</p>
            )}
          </ul>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: ÚLTIMOS PEDIDOS */}
      <div className="dashboard-card dashboard-section">
        <div className="dashboard-card-head">
          <h3>Últimos pedidos</h3>
          <button type="button" className="dashboard-card-link" onClick={() => onNavigate("pedidos")}>
            Ver todos
          </button>
        </div>

        {data.recentOrders.length === 0 ? (
          <p className="dashboard-empty-msg" style={{ padding: "1.5rem 0" }}>No se han generado órdenes en la tienda aún.</p>
        ) : (
          <ul className="dashboard-order-list">
            {data.recentOrders.map((order) => (
              <li key={order.id}>
                <span className="dashboard-order-id">#{order.order_number || order.id}</span>
                <span className="dashboard-order-customer">{order.customer}</span>
                <span className="dashboard-order-total">{formatPrice(order.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
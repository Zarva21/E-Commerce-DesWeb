import { useEffect, useState } from "react";
import PageHeader from "../ui/PageHeader";
import { reportsService } from "../../services/reportsService";
import "../Dashboard/DashboardHome.css";
import "./ReportsPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value || 0);

export default function ReportsPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sales, setSales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reportsService.getDashboardReports();
        if (isMounted) {
          setSales(data.monthlySales || []);
          setTopProducts(data.topProducts || []);
          setLowStock(data.lowStock || []);
          setCustomerTypes(data.guestVsRegistered || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error al cargar reportes:", err);
          setError(err.response?.data?.message || "No se pudieron cargar los datos de reportes.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReports();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cálculos de KPIs basados en la data real
  const totalAmount = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalOrders = sales.reduce((sum, s) => sum + (s.ordersCount || 0), 0);
  const averageTicket = totalOrders > 0 ? totalAmount / totalOrders : 0;
  const maxMonthlySales = sales.length > 0 ? Math.max(...sales.map((s) => s.totalAmount || 0)) : 1;
  const bestMonth = sales.find((s) => (s.totalAmount || 0) === maxMonthlySales);

  const kpis = [
    { label: "Ventas totales", value: formatPrice(totalAmount), sub: `${sales.length} períodos registrados` },
    { label: "Pedidos completados", value: totalOrders, sub: "Ventas válidas" },
    { label: "Ticket promedio", value: formatPrice(averageTicket), sub: "Por pedido" },
    { label: "Mejor mes", value: bestMonth?.month ?? "—", sub: bestMonth ? formatPrice(bestMonth.totalAmount) : "Sin ventas" },
  ];

  return (
    <div className="reports-page">
      <PageHeader title="Reportes" subtitle="Análisis consolidado de ventas, inventario y comportamiento de compra" />

      {/* KPI CARDS */}
      <div className="reports-kpis">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="reports-kpi">
            <p className="reports-kpi-label">{kpi.label}</p>
            <p className="reports-kpi-value">{kpi.value}</p>
            <span className="reports-kpi-sub">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {loading && (
        <div className="dashboard-card" style={{ padding: "2.5rem", textAlign: "center" }}>
          <p style={{ color: "#64748b" }}>Consultando métricas en la base de datos...</p>
        </div>
      )}

      {error && !loading && (
        <div className="dashboard-card" style={{ padding: "1.5rem", borderLeft: "4px solid #ef4444" }}>
          <p style={{ color: "#b91c1c", margin: 0 }}><strong>Error:</strong> {error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* REPORTE 1: VENTAS MENSUALES */}
          <div className="dashboard-card dashboard-section">
            <div className="dashboard-card-head">
              <div>
                <h3>Reporte 1: Ventas Mensuales Realizadas</h3>
                <p className="dashboard-subtitle">Ingresos acumulados agrupados por mes (pagos exitosos)</p>
              </div>
              <button type="button" className="dashboard-card-link" onClick={() => onNavigate?.("pedidos")}>
                Ver pedidos
              </button>
            </div>

            {sales.length === 0 ? (
              <p style={{ color: "#64748b", padding: "1.5rem 0" }}>No hay ventas registradas en el historial todavía.</p>
            ) : (
              <div className="monthly-sales-chart">
                {sales.map((item) => {
                  const barHeight = maxMonthlySales > 0 ? Math.round((item.totalAmount / maxMonthlySales) * 100) : 0;
                  return (
                    <div key={item.month} className="monthly-sales-col">
                      <span className="monthly-sales-val">{formatPrice(item.totalAmount)}</span>
                      <div className="bar-container">
                        <div
                          className="bar-fill"
                          style={{ height: `${barHeight}%` }}
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

          {/* GRILLA: REPORTES 2 Y 4 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            
            {/* REPORTE 2: TOP PRODUCTOS */}
            <div className="dashboard-card dashboard-section">
              <div className="dashboard-card-head">
                <div>
                  <h3>Reporte 2: Productos Más Vendidos</h3>
                  <p className="dashboard-subtitle">Ranking por volumen de unidades facturadas</p>
                </div>
                <button type="button" className="dashboard-card-link" onClick={() => onNavigate?.("catalogo")}>
                  Ver catálogo
                </button>
              </div>

              {topProducts.length === 0 ? (
                <p style={{ color: "#64748b", padding: "1rem 0" }}>Aún no se han completado órdenes con productos.</p>
              ) : (
                <ul className="dashboard-ranking-list">
                  {topProducts.map((prod, index) => (
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

            {/* REPORTE 4: GUEST VS REGISTRADOS */}
            <div className="dashboard-card dashboard-section">
              <div className="dashboard-card-head">
                <div>
                  <h3>Reporte 4: Pedidos Guest vs. Registrados</h3>
                  <p className="dashboard-subtitle">Distribución de facturación por tipo de comprador</p>
                </div>
              </div>

              {customerTypes.length === 0 ? (
                <p style={{ color: "#64748b", padding: "1rem 0" }}>Sin datos de compras para clasificar clientes.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1rem" }}>
                  {customerTypes.map((c) => {
                    const totalPeriod = customerTypes.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) || 1;
                    const pct = Math.round(((c.totalAmount || 0) / totalPeriod) * 100);
                    const isGuest = c.type === "Invitado";

                    return (
                      <div
                        key={c.type}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "1rem",
                          background: "#fff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <strong>{isGuest ? "Clientes Invitados" : "Usuarios Registrados"}</strong>
                          <span style={{ fontWeight: 600, color: isGuest ? "#d97706" : "#2563eb" }}>{pct}%</span>
                        </div>
                        <div style={{ background: "#f1f5f9", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: isGuest ? "#f59e0b" : "#2563eb",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "13px", color: "#64748b" }}>
                          <span>{c.ordersCount} pedidos</span>
                          <strong style={{ color: "#0f172a" }}>{formatPrice(c.totalAmount)}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* REPORTE 3: EXISTENCIAS CRÍTICAS */}
          <div className="dashboard-card dashboard-section" style={{ marginTop: "1.5rem" }}>
            <div className="dashboard-card-head">
              <div>
                <h3>Reporte 3: Estado de Existencias (Stock Crítico)</h3>
                <p className="dashboard-subtitle">Variantes con 10 o menos unidades en inventario</p>
              </div>
              <button type="button" className="dashboard-card-link" onClick={() => onNavigate?.("inventario")}>
                Ir a Inventario
              </button>
            </div>

            {lowStock.length === 0 ? (
              <p style={{ color: "#16a34a", padding: "1rem 0" }}>
                ✓ No hay alertas de stock bajo. Todas las existencias están por encima del umbral mínimo.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", marginTop: "0.5rem" }}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Marca</th>
                      <th>Talla / Color</th>
                      <th>Disponible</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((item) => (
                      <tr key={item.id}>
                        <td><code>{item.sku}</code></td>
                        <td><strong>{item.productName}</strong></td>
                        <td style={{ color: "#64748b" }}>{item.brand}</td>
                        <td>{item.size || "—"} / {item.color || "—"}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: item.stock === 0 ? "#dc2626" : "#ea580c" }}>
                            {item.stock} uds.
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: 600,
                              backgroundColor: item.stock === 0 ? "#fee2e2" : "#ffedd5",
                              color: item.stock === 0 ? "#991b1b" : "#9a3412",
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
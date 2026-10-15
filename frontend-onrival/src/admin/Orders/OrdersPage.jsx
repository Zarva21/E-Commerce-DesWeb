import { useEffect, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { orderAdminService } from "../../services/orderAdminService";
import { MOCK_ORDERS } from "./mockOrders";
import { orderStatusTone, orderStatusLabel } from "./orderStatusTone";
import "../ui/DataTable.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value) => {
  if (!value) return "Reciente";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? "Reciente"
    : d.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
};

export default function OrdersPage({ onSelectOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    orderAdminService
      .getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.orders || [];
        setOrders(list.length > 0 ? list : MOCK_ORDERS);
      })
      .catch((err) => {
        console.warn("Fallo al conectar con la API de pedidos, usando mock:", err);
        setOrders(MOCK_ORDERS);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Pedidos"
        subtitle="Supervisa cobros contra entrega, pagos en línea y despachos"
      />

      <div className="data-card">
        {loading ? (
          <p className="data-empty">Cargando pedidos...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Método</th>
                <th>Cobro</th>
                <th>Logística</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isPaid =
                  order.payment_status === "completed" || order.status === "paid";
                const orderKey = order.order_number || order.id;

                return (
                  <tr key={order.id}>
                    <td className="data-cell-title">#{orderKey}</td>
                    <td>
                        <div>
                          <strong>{order.customer || "Cliente Invitado"}</strong>
                        </div>
                        <small className="data-cell-muted">
                          {order.phone !== "—" ? order.phone : order.email}
                        </small>
                      </td>

                      <td className="data-cell-muted">
                        {formatDate(order.date || order.created_at)}
                      </td>

                      <td>
                        <strong>{formatPrice(order.total)}</strong>
                      </td>

                      {/* Columna Método */}
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {String(order.payment_method || "").toLowerCase() === "stripe"
                            ? "Tarjeta (Stripe)"
                            : "Efectivo (Contra entrega)"}
                        </span>
                      </td>

                      {/* Columna Cobro */}
                      <td>
                        <StatusBadge
                          label={order.payment_status === "completed" ? "Cobrado" : "Por Cobrar"}
                          tone={order.payment_status === "completed" ? "success" : "warning"}
                        />
                      </td>
                    <td>
                      <StatusBadge
                        label={orderStatusLabel(order.status)}
                        tone={orderStatusTone(order.status)}
                      />
                    </td>
                    <td>
                      <div className="data-actions">
                        <button
                          type="button"
                          className="data-action-btn"
                          onClick={() => onSelectOrder(order.id)}
                        >
                          Ver detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && orders.length === 0 && (
          <p className="data-empty">Todavía no hay pedidos.</p>
        )}
      </div>
    </div>
  );
}
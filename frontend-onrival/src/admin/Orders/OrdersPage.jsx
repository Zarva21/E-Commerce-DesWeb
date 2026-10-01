import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { MOCK_ORDERS } from "./mockOrders";
import { orderStatusTone } from "./orderStatusTone";
import "../ui/DataTable.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value) =>
  new Date(value).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });

export default function OrdersPage({ onSelectOrder }) {
  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Pedidos realizados en la tienda" />

      <div className="data-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ORDERS.map((order) => (
              <tr key={order.id}>
                <td className="data-cell-title">#{order.id}</td>
                <td>{order.customer}</td>
                <td className="data-cell-muted">{formatDate(order.date)}</td>
                <td>{formatPrice(order.total)}</td>
                <td>
                  <StatusBadge label={order.status} tone={orderStatusTone(order.status)} />
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
            ))}
          </tbody>
        </table>

        {MOCK_ORDERS.length === 0 && (
          <p className="data-empty">Todavía no hay pedidos.</p>
        )}
      </div>
    </div>
  );
}
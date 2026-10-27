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
  const [collectingId, setCollectingId] = useState(null);

  const fetchOrders = () => {
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
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleQuickCollect = async (orderId) => {
    if (!window.confirm("¿Confirmas que recibiste el pago en efectivo de este pedido?")) return;

    setCollectingId(orderId);
    try {
      await orderAdminService.collectCash(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, payment_status: "completed", status: o.status === "pending_payment" ? "paid" : o.status }
            : o
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Error al liquidar cobro.");
    } finally {
      setCollectingId(null);
    }
  };

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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isCash = String(order.payment_method || "").toLowerCase() === "cash" || order.payment_method === "contra_entrega";
                const isPaid = order.payment_status === "completed";
                const orderKey = order.order_number || order.id;

                return (
                  <tr key={order.id}>
                    <td className="data-cell-title">
                      #{orderKey}
                      {order.coupon_code && (
                        <span
                          style={{
                            display: "block",
                            fontSize: "11px",
                            color: "#166534",
                            backgroundColor: "#dcfce7",
                            padding: "2px 5px",
                            borderRadius: "4px",
                            width: "fit-content",
                            marginTop: "3px",
                            fontWeight: 600,
                          }}
                        >
                          Cupón: {order.coupon_code}
                        </span>
                      )}
                    </td>

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

                    <td>
                      <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>
                        {isCash ? "Efectivo (Contra entrega)" : "Tarjeta (Stripe)"}
                      </span>
                    </td>

                    <td>
                      <StatusBadge
                        label={isPaid ? "Cobrado" : "Por Cobrar"}
                        tone={isPaid ? "success" : "warning"}
                      />
                    </td>

                    <td>
                      <StatusBadge
                        label={orderStatusLabel(order.status)}
                        tone={orderStatusTone(order.status)}
                      />
                    </td>

                    <td>
                      <div className="data-actions" style={{ display: "flex", gap: "6px" }}>
                        {/* Botón rápido de cobro si es efectivo y aún no está cobrado */}
                        {isCash && !isPaid && order.status !== "cancelled" && (
                          <button
                            type="button"
                            className="data-action-btn"
                            disabled={collectingId === order.id}
                            onClick={() => handleQuickCollect(order.id)}
                            style={{ backgroundColor: "#10b981", color: "#fff", border: "none" }}
                          >
                            {collectingId === order.id ? "..." : "Cobrar"}
                          </button>
                        )}

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
          <p className="data-empty">Todavía no hay pedidos registrados.</p>
        )}
      </div>
    </div>
  );
}
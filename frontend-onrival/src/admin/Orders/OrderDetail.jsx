import { useEffect, useState } from "react";
import StatusBadge from "../ui/StatusBadge";
import {
  findOrderById,
  markOrderCollected,
  updateOrderStatus,
  ORDER_STATUSES,
  PAYMENT_METHODS,
} from "./mockOrders";
import { orderStatusTone } from "./orderStatusTone";
import "./OrderDetail.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value) =>
  new Date(value).toLocaleString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function OrderDetail({ orderId, onBack }) {
  const order = findOrderById(orderId);
  const [status, setStatus] = useState(order?.status ?? "Pendiente");
  const [paidAt, setPaidAt] = useState(order?.paid ? order.paid_at : null); // null = sin cobrar
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Escape cierra la alerta de confirmación
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  if (!order) {
    return (
      <div>
        <button type="button" className="order-detail-back" onClick={onBack}>‹ Volver a pedidos</button>
        <p>No encontramos ese pedido.</p>
      </div>
    );
  }

  const isCash = order.payment_method === "contra_entrega";
  const isCollected = Boolean(paidAt);
  const isCancelled = status === "Cancelado";

  const paymentLabel = isCash
    ? isCollected ? "Cobrado" : "Pendiente de cobro"
    : isCollected ? "Pagado" : "Pago pendiente";

  // Guarda el nuevo estado en los datos del pedido (no solo en pantalla)
  const handleChangeStatus = (next) => {
    if (next === status) return;
    if (updateOrderStatus(order.id, next)) setStatus(next);
  };

  const handleConfirmCollect = () => {
    const collectedAt = markOrderCollected(order.id);
    if (collectedAt) setPaidAt(collectedAt);
    setConfirmOpen(false);
  };

  return (
    <div className="order-detail">
      <button type="button" className="order-detail-back" onClick={onBack}>
        ‹ Volver a pedidos
      </button>

      <div className="order-detail-head">
        <div>
          <p className="order-detail-eyebrow">Pedido</p>
          <h2>#{order.id}</h2>
        </div>
        <StatusBadge label={status} tone={orderStatusTone(status)} />
      </div>

      <div className="order-detail-layout">
        <div className="order-detail-main">
          <div className="order-detail-card">
            <h3>Productos</h3>
            <ul className="order-detail-items">
              {order.items.map((item) => (
                <li key={`${item.id}-${item.size}`}>
                  <span className="order-item-name">
                    {item.name} · Talla {item.size} x{item.quantity}
                  </span>
                  <span className="order-item-price">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="order-detail-total">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <aside className="order-detail-side">
          <div className="order-detail-card">
            <h3>Cliente</h3>
            <p className="order-detail-line"><strong>{order.customer}</strong></p>
            <p className="order-detail-line order-detail-muted">{order.email}</p>
            <p className="order-detail-line order-detail-muted">{order.address}</p>
          </div>

          <div className="order-detail-card">
            <h3>Pago</h3>
            <p className="order-detail-line">
              <strong>{PAYMENT_METHODS[order.payment_method] ?? "No especificado"}</strong>
            </p>
            <div className="order-pay-status">
              <StatusBadge label={paymentLabel} tone={isCollected ? "success" : "warning"} />
            </div>

            {isCash && (
              <>
                {isCollected && (
                  <p className="order-detail-line order-detail-muted">Cobrado el {formatDateTime(paidAt)}</p>
                )}

                <button
                  type="button"
                  className={`order-collect-btn ${isCollected ? "order-collect-btn-done" : ""}`}
                  onClick={() => setConfirmOpen(true)}
                  disabled={isCollected || isCancelled}
                >
                  {isCollected ? "✓ Cobrado" : `Cobrar ${formatPrice(order.total)}`}
                </button>

                {isCancelled && !isCollected && (
                  <p className="order-detail-hint">No se puede cobrar un pedido cancelado.</p>
                )}
              </>
            )}
          </div>

          <div className="order-detail-card">
            <h3>Estado del pedido</h3>
            <div className="order-detail-status-options">
              {ORDER_STATUSES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`order-status-option ${status === option ? "order-status-option-active" : ""}`}
                  onClick={() => handleChangeStatus(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="order-detail-hint">
              {/* TODO: guardar el cambio de estado real contra la API */}
              El cambio se guarda mientras no recargues la página.
            </p>
          </div>
        </aside>
      </div>

      {/* ALERTA DE CONFIRMACIÓN DEL COBRO */}
      {confirmOpen && (
        <div className="order-confirm-overlay" onClick={() => setConfirmOpen(false)}>
          <div
            className="order-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="order-confirm-title">¿Estás seguro que querés cobrar el pedido?</h4>
            <p>
              Pedido #{order.id} · {formatPrice(order.total)}. Una vez cobrado, no se puede deshacer.
            </p>
            <div className="order-confirm-actions">
              <button type="button" className="order-confirm-cancel" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="order-confirm-ok" onClick={handleConfirmCollect} autoFocus>
                Sí, cobrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
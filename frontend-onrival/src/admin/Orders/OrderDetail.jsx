import { useState } from "react";
import StatusBadge from "../ui/StatusBadge";
import { findOrderById, ORDER_STATUSES } from "./mockOrders";
import { orderStatusTone } from "./orderStatusTone";
import "./OrderDetail.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

export default function OrderDetail({ orderId, onBack }) {
  const order = findOrderById(orderId);
  const [status, setStatus] = useState(order?.status ?? "Pendiente");

  if (!order) {
    return (
      <div>
        <button type="button" className="order-detail-back" onClick={onBack}>‹ Volver a pedidos</button>
        <p>No encontramos ese pedido.</p>
      </div>
    );
  }

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
            <h3>Estado del pedido</h3>
            <div className="order-detail-status-options">
              {ORDER_STATUSES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`order-status-option ${status === option ? "order-status-option-active" : ""}`}
                  onClick={() => setStatus(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="order-detail-hint">
              {/* TODO: guardar el cambio de estado real contra la API */}
              Cambiar el estado acá es solo visual por ahora.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
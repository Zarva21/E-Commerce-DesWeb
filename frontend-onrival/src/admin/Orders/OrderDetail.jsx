import { useEffect, useState } from "react";
import StatusBadge from "../ui/StatusBadge";
import { orderAdminService } from "../../services/orderAdminService";
import { orderStatusTone, orderStatusLabel } from "./orderStatusTone";
import "./OrderDetail.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-GT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const ORDER_STATUSES = [
  { value: "pending_payment", label: "Pendiente Pago" },
  { value: "paid", label: "Pagado / En Preparación" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
];

export default function OrderDetail({ orderId, onBack }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    orderAdminService
      .getById(orderId)
      .then((data) => {
        if (isMounted) setOrder(data);
      })
      .catch((err) => {
        console.error("Error al obtener detalle de la orden:", err);
        if (isMounted) {
          setErrorMsg(err.response?.data?.message || "No se pudo cargar el pedido.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // Cambio de estado logístico
  const handleStatusChange = async (newStatus) => {
    if (!order || order.status === newStatus || updating) return;

    setUpdating(true);
    try {
      await orderAdminService.updateStatus(order.id, newStatus);
      setOrder((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Error al actualizar el estado");
    } finally {
      setUpdating(false);
    }
  };

  // Cobro exclusivo de pago contra entrega (CASH)
  const handleConfirmCollect = async () => {
    setConfirmOpen(false);
    setUpdating(true);
    try {
      const res = await orderAdminService.collectCash(order.id);
      setOrder((prev) => {
        const inv = Array.isArray(prev.invoices) ? prev.invoices[0] : prev.invoice;
        const pay = Array.isArray(inv?.payments) ? inv.payments[0] : inv?.payment;

        if (pay) pay.status = "completed";

        return {
          ...prev,
          status: res.order_status || prev.status,
          payment_status: "completed",
          paid_at: res.paid_at || new Date().toISOString(),
        };
      });
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Error al liquidar el cobro");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="order-detail" style={{ padding: "2rem" }}>
        <button type="button" className="order-detail-back" onClick={onBack}>
          ‹ Volver a pedidos
        </button>
        <p>Cargando información del pedido #{orderId}...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="order-detail" style={{ padding: "2rem" }}>
        <button type="button" className="order-detail-back" onClick={onBack}>
          ‹ Volver a pedidos
        </button>
        <p style={{ color: "#dc2626" }}>{errorMsg || "No encontramos ese pedido."}</p>
      </div>
    );
  }

  const orderNumber = order.order_number || order.id;
  const customerName = order.customer
    ? typeof order.customer === "string"
      ? order.customer
      : `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
    : "Cliente General / Invitado";

  const customerEmail = order.email || order.customer?.user?.email || order.customer?.email || "—";
  const customerPhone = order.phone || order.customer?.phone || "—";

  const customerAddress = order.address
    ? typeof order.address === "string"
      ? order.address
      : `${order.address.address_line1 || ""}${order.address.city ? ", " + order.address.city : ""}`
    : "Sin dirección registrada";

  const items = (order.items || order.order_items || []).map((it) => ({
    id: it.id || it.product_variant_id,
    name: it.name || it.product_variant?.product?.name || "Artículo Deportivo",
    size: it.size || it.product_variant?.size || "Única",
    color: it.color || it.product_variant?.color || null,
    quantity: it.quantity || 1,
    price: Number(it.price || it.unit_price || 0),
  }));

  // Extracción de pago y factura
  const inv = (Array.isArray(order.invoices) ? order.invoices[0] : order.invoice) || null;
  const pay = (Array.isArray(inv?.payments) ? inv?.payments[0] : inv?.payment) || null;

  const paymentProvider = (pay?.provider || order.payment_method || "").toLowerCase();
  const isCash = paymentProvider === "cash" || paymentProvider === "contra_entrega";
  const isPaymentCompleted = pay?.status === "completed" || order.payment_status === "completed";
  const isCancelled = order.status === "cancelled";

  // Extracción de cupón
  const appliedCoupon =
    (Array.isArray(order.order_coupons) ? order.order_coupons[0] : order.order_coupons) ||
    order.order_coupon ||
    null;
  const couponCode = appliedCoupon?.coupon?.code || order.coupon_code || null;
  const couponDiscount = Number(appliedCoupon?.discount_amount || order.discount || 0);

  return (
    <div className="order-detail">
      <button type="button" className="order-detail-back" onClick={onBack}>
        ‹ Volver a pedidos
      </button>

      <div className="order-detail-head">
        <div>
          <p className="order-detail-eyebrow">Pedido</p>
          <h2>#{orderNumber}</h2>
        </div>
        <StatusBadge
          label={orderStatusLabel(order.status)}
          tone={orderStatusTone(order.status)}
        />
      </div>

      <div className="order-detail-layout">
        <div className="order-detail-main">
          {/* Listado de Artículos */}
          <div className="order-detail-card">
            <h3>Productos en la Orden</h3>
            <ul className="order-detail-items">
              {items.map((item, idx) => (
                <li key={idx}>
                  <span className="order-item-name">
                    {item.name} · Talla: <strong>{item.size}</strong>{" "}
                    {item.color ? `· Color: ${item.color}` : ""} x{item.quantity}
                  </span>
                  <span className="order-item-price">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Desglose Financiero */}
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#64748b" }}>Subtotal:</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>

              {couponDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", color: "#16a34a" }}>
                  <span>
                    Descuento Cupón {couponCode && <strong style={{ background: "#dcfce7", padding: "1px 6px", borderRadius: "4px" }}>{couponCode}</strong>}:
                  </span>
                  <strong>-{formatPrice(couponDiscount)}</strong>
                </div>
              )}

              {Number(order.tax) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: "#64748b" }}>IVA (12%):</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#64748b" }}>Costo de Envío:</span>
                <span>{formatPrice(order.shipping_cost || 0)}</span>
              </div>

              <div className="order-detail-total" style={{ borderTop: "2px solid #0f172a", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
                <span>Total General:</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="order-detail-side">
          {/* Datos del Cliente */}
          <div className="order-detail-card">
            <h3>Datos de Entrega</h3>
            <p className="order-detail-line">
              <strong>{customerName}</strong>
            </p>
            <p className="order-detail-line order-detail-muted">{customerEmail}</p>
            <p className="order-detail-line order-detail-muted">{customerPhone}</p>
            <p className="order-detail-line order-detail-muted">{customerAddress}</p>
          </div>

          {/* Transacción / Cobro */}
          <div className="order-detail-card">
            <h3>Cobro y Transacción</h3>
            <p className="order-detail-line">
              <strong>
                {isCash ? "Efectivo (Pago Contra Entrega)" : "Tarjeta de Crédito / Débito (Stripe)"}
              </strong>
            </p>
            <div className="order-pay-status" style={{ margin: "0.75rem 0" }}>
              <StatusBadge
                label={isPaymentCompleted ? "Cobrado / Pagado" : "Pendiente de Cobro"}
                tone={isPaymentCompleted ? "success" : "warning"}
              />
            </div>

            {pay?.payment_date && (
              <p className="order-detail-line order-detail-muted">
                Liquidado el: {formatDateTime(pay.payment_date)}
              </p>
            )}

            {/* BOTÓN INDEPENDIENTE PARA COBRAR EFECTIVO */}
            {isCash && (
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className={`order-collect-btn ${isPaymentCompleted ? "order-collect-btn-done" : ""}`}
                  onClick={() => setConfirmOpen(true)}
                  disabled={isPaymentCompleted || isCancelled || updating}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: isPaymentCompleted ? "#10b981" : "#0284c7",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: isPaymentCompleted || isCancelled ? "not-allowed" : "pointer",
                  }}
                >
                  {isPaymentCompleted ? "✓ Pago Liquidado" : `Registrar Cobro (${formatPrice(order.total)})`}
                </button>

                {isCancelled && !isPaymentCompleted && (
                  <p className="order-detail-hint" style={{ color: "#ef4444", marginTop: "6px" }}>
                    No se puede cobrar un pedido cancelado.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Estado Logístico (Independiente del pago) */}
          <div className="order-detail-card">
            <h3>Estado Logístico</h3>
            <div className="order-detail-status-options">
              {ORDER_STATUSES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={updating}
                  className={`order-status-option ${
                    order.status === option.value ? "order-status-option-active" : ""
                  }`}
                  onClick={() => handleStatusChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {updating && (
              <p className="order-detail-hint" style={{ color: "#2563eb" }}>
                Actualizando base de datos...
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Modal de Confirmación de Cobro */}
      {confirmOpen && (
        <div className="order-confirm-overlay" onClick={() => setConfirmOpen(false)}>
          <div
            className="order-confirm-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h4>¿Confirmar recepción del dinero en efectivo?</h4>
            <p>
              Orden #{orderNumber} · Monto: <strong>{formatPrice(order.total)}</strong>.
              El estado de la transacción pasará a <code>completed</code>.
            </p>
            <div className="order-confirm-actions">
              <button
                type="button"
                className="order-confirm-cancel"
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="order-confirm-ok"
                onClick={handleConfirmCollect}
                autoFocus
              >
                Sí, registrar cobro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
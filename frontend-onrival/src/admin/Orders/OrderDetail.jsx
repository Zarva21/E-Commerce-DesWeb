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

  // Cargar pedido real desde la API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    orderAdminService
      .getById(orderId)
      .then((data) => {
        if (isMounted) {
          setOrder(data);
        }
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

  // Guardar cambio de estado en la BD
  const handleStatusChange = async (newStatus) => {
    if (!order || order.status === newStatus || updating) return;

    setUpdating(true);
    try {
      await orderAdminService.updateStatus(order.id, newStatus);
      // Actualizar estado local
      setOrder((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Error al actualizar el estado");
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

  // Normalizar datos por si vienen anidados de Sequelize
  const orderNumber = order.order_number || order.id;
  const customerName = order.customer
    ? typeof order.customer === "string"
      ? order.customer
      : `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
    : "Cliente General / Invitado";

  const customerEmail =
    order.email || order.customer?.user?.email || order.customer?.email || "—";
  const customerPhone = order.phone || order.customer?.phone || "—";

  const customerAddress = order.address
    ? typeof order.address === "string"
      ? order.address
      : `${order.address.address_line1 || ""}${order.address.city ? ", " + order.address.city : ""}`
    : "Sin dirección";

  const items = (order.items || order.order_items || []).map((it) => ({
    id: it.id || it.product_variant_id,
    name: it.name || it.product_variant?.product?.name || "Artículo Deportivo",
    size: it.size || it.product_variant?.size || "Única",
    color: it.color || it.product_variant?.color || null,
    quantity: it.quantity || 1,
    price: Number(it.price || it.unit_price || 0),
  }));

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
          <div className="order-detail-card">
            <h3>Productos Congelados en la Orden</h3>
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

            <div className="order-detail-total">
              <span>Total Liquidado / Por Cobrar:</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <aside className="order-detail-side">
          <div className="order-detail-card">
            <h3>Datos de Entrega</h3>
            <p className="order-detail-line">
              <strong>{customerName}</strong>
            </p>
            <p className="order-detail-line order-detail-muted">{customerEmail}</p>
            <p className="order-detail-line order-detail-muted">{customerPhone}</p>
            <p className="order-detail-line order-detail-muted">{customerAddress}</p>
          </div>

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
                Actualizando pedido en base de datos...
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
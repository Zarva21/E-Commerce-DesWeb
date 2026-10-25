import { useState, useEffect } from "react";
import { profileService } from "../../services/profileService";
import "./ProfilePage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return "Reciente";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Reciente";
  return d.toLocaleDateString("es-GT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS_LABELS = {
  pending_payment: { label: "Pendiente de pago", className: "badge-pending" },
  paid: { label: "En preparación", className: "badge-paid" },
  shipped: { label: "Enviado", className: "badge-shipped" },
  delivered: { label: "Entregado", className: "badge-delivered" },
  cancelled: { label: "Cancelado", className: "badge-cancelled" },
};

export default function ProfilePage({ onBackToHome }) {
  const [activeTab, setActiveTab] = useState("account");
  const [profile, setProfile] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
  });
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Datos iniciales del usuario desde localStorage
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setProfile({
      nombre: storedUser.firstName || storedUser.first_name || "",
      apellido: storedUser.lastName || storedUser.last_name || "",
      telefono: storedUser.phone || "",
      email: storedUser.email || "",
    });

    // 2. Cargar historial de pedidos desde el backend
    const loadOrders = async () => {
      setLoading(true);
      try {
        const orders = await profileService.getMyOrders();
        if (isMounted) {
          setPedidos(orders);
        }
      } catch (err) {
        console.error("Error al cargar pedidos del usuario:", err);
        if (isMounted) setPedidos([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="profile-page">
      <button type="button" className="profile-back" onClick={onBackToHome}>
        ‹ Volver a la tienda
      </button>

      <div className="profile-head">
        <p className="profile-eyebrow">Zona de Atletas</p>
        <h1>MI PERFIL</h1>
      </div>

      <div className="profile-layout">
        {/* Barra Lateral de Pestañas */}
        <aside className="profile-sidebar">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === "account" ? "profile-tab-active" : ""}`}
            onClick={() => setActiveTab("account")}
          >
            <span>Sobre mi cuenta</span>
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === "orders" ? "profile-tab-active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <span>Mis pedidos ({pedidos.length})</span>
          </button>
        </aside>

        {/* Área de Contenido */}
        <main className="profile-content">
          {/* PESTAÑA 1: DATOS PERSONALES */}
          {activeTab === "account" && (
            <div className="profile-panel">
              <div className="panel-title-group">
                <h2>DATOS PERSONALES</h2>
                <p>Información registrada en tu cuenta.</p>
              </div>

              <div className="profile-grid">
                <div className="profile-card-item">
                  <span className="profile-label">Nombre</span>
                  <p className="profile-value">{profile.nombre || "—"}</p>
                </div>

                <div className="profile-card-item">
                  <span className="profile-label">Apellido</span>
                  <p className="profile-value">{profile.apellido || "—"}</p>
                </div>

                <div className="profile-card-item">
                  <span className="profile-label">Teléfono</span>
                  <p className="profile-value">{profile.telefono || "—"}</p>
                </div>

                <div className="profile-card-item">
                  <span className="profile-label">Correo electrónico</span>
                  <p className="profile-value">{profile.email || "—"}</p>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: HISTORIAL DE PEDIDOS */}
          {activeTab === "orders" && (
            <div className="profile-panel">
              <div className="panel-title-group">
                <h2>HISTORIAL DE PEDIDOS</h2>
                <p>Revisa el estado de tus compras, detalles de envío y desglose de pago.</p>
              </div>

              {loading ? (
                <div className="orders-empty">
                  <p>Cargando pedidos desde el servidor...</p>
                </div>
              ) : pedidos && pedidos.length > 0 ? (
                <div className="orders-container">
                  {pedidos.map((order) => {
                    const statusConfig = STATUS_LABELS[order.estado] || {
                      label: order.estado || "Procesando",
                      className: "badge-default",
                    };

                    // Resolución de fecha con fallbacks
                    const orderDate = order.fecha || order.created_at || order.createdAt || order.order_date;

                    return (
                      <article key={order.id || order.db_id} className="order-card">
                        {/* Cabecera de la tarjeta */}
                        <div className="order-card-header">
                          <div className="order-meta">
                            <span className="order-id">#{order.id}</span>
                            <span className="order-date">
                              Realizado el {formatDate(orderDate)}
                            </span>
                          </div>
                          <span className={`order-status ${statusConfig.className}`}>
                            {statusConfig.label}
                          </span>
                        </div>

                        {/* Listado de Artículos */}
                        <div className="order-card-body">
                          <ul className="order-items-list">
                            {(order.items || []).map((it, idx) => (
                              <li key={idx} className="order-item-row">
                                <span className="item-name">
                                  {it.name}{" "}
                                  {it.size && it.size !== "N/A" && (
                                    <span className="item-size">· Talla {it.size}</span>
                                  )}
                                  {it.color && (
                                    <span className="item-color"> · {it.color}</span>
                                  )}
                                  <span className="item-qty"> x{it.quantity}</span>
                                </span>
                                <span className="item-price">
                                  {formatPrice(it.price * it.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Desglose de Liquidación: Subtotal, Envío, Impuestos y Descuentos */}
                        <div
                          style={{
                            padding: "0.85rem 1.25rem",
                            backgroundColor: "#f8fafc",
                            borderTop: "1px solid #f1f5f9",
                            fontSize: "13px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.35rem",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                            <span>Subtotal productos</span>
                            <span>{formatPrice(order.subtotal)}</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                            <span>Costo de envío</span>
                            <span>{order.envio > 0 ? formatPrice(order.envio) : "Gratis"}</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                            <span>Impuestos (IVA)</span>
                            <span>{formatPrice(order.impuesto)}</span>
                          </div>

                          {Number(order.descuento) > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a", fontWeight: 500 }}>
                              <span>
                                Descuento cupón {order.cupon ? `(${order.cupon})` : ""}
                              </span>
                              <span>-{formatPrice(order.descuento)}</span>
                            </div>
                          )}
                        </div>

                        {/* Pie de Tarjeta: Total */}
                        <div className="order-card-footer">
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>
                            Total pagado
                          </span>
                          <strong className="order-total-price">
                            {formatPrice(order.total)}
                          </strong>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="orders-empty">
                  <p>Aún no has realizado ningún pedido en la tienda.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
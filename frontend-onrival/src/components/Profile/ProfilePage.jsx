import { useState, useEffect } from "react";
import api from "../../config/api";
import "./ProfilePage.css";

// Formateador de moneda local GTQ
const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-GT", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default function ProfilePage({ onBackToHome }) {
  const [activeTab, setActiveTab] = useState("account"); // 👈 Estado de pestaña
  const [profile, setProfile] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
  });
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    setProfile({
      nombre: storedUser.firstName || "",
      apellido: storedUser.lastName || "",
      telefono: storedUser.phone || "",
      email: storedUser.email || "",
    });

    // Petición al endpoint real de órdenes del usuario en sesión
    api
      .get("/sales/orders/me")
      .then((res) => {
        setPedidos(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Error al cargar pedidos:", err);
        setPedidos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <section className="profile-page">
      {/* Botón superior de retorno */}
      <button type="button" className="profile-back" onClick={onBackToHome}>
        ‹ Volver al menú principal
      </button>

      <div className="profile-head">
        <p className="profile-eyebrow">Zona de Atletas</p>
        <h1>MI PERFIL</h1>
      </div>

      {/* Contenedor principal */}
      <div className="profile-layout">
        {/* Navigation Sidebar */}
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
            <span>Mis pedidos</span>
          </button>
        </aside>

        {/* ÁREA DE CONTENIDO */}
        <main className="profile-content">
          {/* PESTAÑA 1: SOBRE MI CUENTA */}
          {activeTab === "account" && (
            <div className="profile-panel">
              <div className="panel-title-group">
                <h2>DATOS PERSONALES</h2>
                <p>Información asociada a tu cuenta de atleta.</p>
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

          {/* PESTAÑA 2: MIS PEDIDOS */}
          {activeTab === "orders" && (
            <div className="profile-panel">
              <div className="panel-title-group">
                <h2>HISTORIAL DE PEDIDOS</h2>
                <p>Revisa el estado de tus compras y sus detalles.</p>
              </div>

              {loading ? (
                <div className="orders-empty">
                  <p>Cargando pedidos...</p>
                </div>
              ) : pedidos && pedidos.length > 0 ? (
                <div className="orders-container">
                  {pedidos.map((order) => (
                    <article key={order.id || order.db_id} className="order-card">
                      <div className="order-card-header">
                        <div className="order-meta">
                          <span className="order-id">#{order.id}</span>
                          <span className="order-date">
                            Realizado el {formatDate(order.fecha)}
                          </span>
                        </div>
                        <span
                          className={`order-status badge-${(order.estado || "pending")
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {order.estado}
                        </span>
                      </div>

                      <div className="order-card-body">
                        <ul className="order-items-list">
                          {(order.items || []).map((it, idx) => (
                            <li key={idx} className="order-item-row">
                              <span className="item-name">
                                {it.name}{" "}
                                {it.size && it.size !== "N/A" && (
                                  <span className="item-size">· Talla {it.size}</span>
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

                      <div className="order-card-footer">
                        <span>Total del pedido</span>
                        <strong className="order-total-price">
                          {formatPrice(order.total)}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="orders-empty">
                  <p>Aún no has realizado ningún pedido en OnRival.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
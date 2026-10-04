import { useState } from "react";
import "./ProfilePage.css";

// Formateador de moneda local GTQ
const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

// TODO: reemplazar por los datos reales retornados por la API/backend
const MOCK_USER_PROFILE = {
  nombre: "Carlos",
  apellido: "Mendoza",
  telefono: "5555-1234",
  email: "carlos.mendoza@ejemplo.com",
  pedidos: [
    {
      id: "ORD-2026-001",
      fecha: "01/10/2026",
      estado: "Entregado",
      total: 1250,
      items: [
        { name: "Adidas Trionda Final Pro", size: "N/A", quantity: 1, price: 1250 },
      ],
    },
    {
      id: "ORD-2026-002",
      fecha: "15/09/2026",
      estado: "En camino",
      total: 850,
      items: [
        { name: "Camiseta Real Madrid 2026/2027", size: "M", quantity: 1, price: 850 },
      ],
    },
  ],
};

export default function ProfilePage({ user = MOCK_USER_PROFILE, onBackToHome }) {
  // Pestaña activa: "account" | "orders"
  const [activeTab, setActiveTab] = useState("account");

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

      {/* Contenedor principal con sidebar a la izquierda y contenido a la derecha */}
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
                  <p className="profile-value">{user.nombre || "—"}</p>
                </div>

                <div className="profile-card-item">
                  <span className="profile-label">Apellido</span>
                  <p className="profile-value">{user.apellido || "—"}</p>
                </div>

                <div className="profile-card-item">
                  <span className="profile-label">Teléfono</span>
                  <p className="profile-value">{user.telefono || "—"}</p>
                </div>

                <div className="profile-card-item">
                  <span className="profile-label">Correo electrónico</span>
                  <p className="profile-value">{user.email || "—"}</p>
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

              {user.pedidos && user.pedidos.length > 0 ? (
                <div className="orders-container">
                  {user.pedidos.map((order) => (
                    <article key={order.id} className="order-card">
                      <div className="order-card-header">
                        <div className="order-meta">
                          <span className="order-id">{order.id}</span>
                          <span className="order-date">Realizado el {order.fecha}</span>
                        </div>
                        <span
                          className={`order-status badge-${order.estado
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {order.estado}
                        </span>
                      </div>

                      <div className="order-card-body">
                        <ul className="order-items-list">
                          {order.items.map((it, idx) => (
                            <li key={idx} className="order-item-row">
                              <span className="item-name">
                                {it.name}{" "}
                                {it.size !== "N/A" && (
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
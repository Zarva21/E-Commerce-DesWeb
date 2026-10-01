import "./Topbar.css";

const TITLES = {
  dashboard: "Panel general",
  inventario: "Inventario",
  usuarios: "Usuarios",
  pedidos: "Pedidos",
  ofertas: "Ofertas",
};

export default function Topbar({ activeView, onToggleSidebar, adminName = "Admin" }) {
  return (
    <header className="topbar">
      <button type="button" className="topbar-menu" onClick={onToggleSidebar} aria-label="Abrir menú">
        ☰
      </button>

      <h1 className="topbar-title">{TITLES[activeView] ?? "Panel general"}</h1>

      <div className="topbar-account">
        <span className="topbar-avatar" aria-hidden="true">
          {adminName.charAt(0).toUpperCase()}
        </span>
        <span className="topbar-name">{adminName}</span>
      </div>
    </header>
  );
}
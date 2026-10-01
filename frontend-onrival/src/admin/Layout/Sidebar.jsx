import Logo from "../../components/Logo/Logo";
import "./Sidebar.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Panel general", icon: "▦" },
  { id: "inventario", label: "Inventario", icon: "▤" },
  { id: "usuarios", label: "Usuarios", icon: "◍" },
  { id: "pedidos", label: "Pedidos", icon: "▥" },
  { id: "ofertas", label: "Ofertas", icon: "⚡" },
];

export default function Sidebar({ activeView, onSelectView, onExitAdmin }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo variant="admin" />
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${activeView === item.id ? "sidebar-link-active" : ""}`}
            onClick={() => onSelectView(item.id)}
          >
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <button type="button" className="sidebar-exit" onClick={onExitAdmin}>
        ← Volver a la tienda
      </button>
    </aside>
  );
}
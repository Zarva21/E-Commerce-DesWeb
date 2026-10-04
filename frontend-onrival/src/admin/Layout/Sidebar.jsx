import Logo from "../../components/Logo/Logo";
import "./Sidebar.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Panel general"},
  { id: "inventario", label: "Inventario"},
  { id: "usuarios", label: "Usuarios"},
  { id: "pedidos", label: "Pedidos"},
  { id: "ofertas", label: "Ofertas"},
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
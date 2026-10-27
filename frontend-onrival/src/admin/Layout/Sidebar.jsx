import Logo from "../../components/Logo/Logo";
import "./Sidebar.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Panel general" },
  { id: "catalogo", label: "Catálogo" },
  { id: "inventario", label: "Inventario" },
  { id: "usuarios", label: "Usuarios" },
  { id: "pedidos", label: "Pedidos" },
  { id: "reportes", label: "Reportes" },
  { id: "ofertas", label: "Ofertas" },
];

export default function Sidebar({ activeView, onSelectView, onExitAdmin, allowedViews }) {
  // Sin lista de permisos se muestran todas; con lista, solo las permitidas
  const items = allowedViews ? NAV_ITEMS.filter((item) => allowedViews.includes(item.id)) : NAV_ITEMS;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo variant="admin" />
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
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
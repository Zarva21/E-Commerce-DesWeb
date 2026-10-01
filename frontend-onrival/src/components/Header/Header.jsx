import Logo from "../Logo/Logo";
import { CartIcon, ProfileIcon, LogoutIcon } from "./Icons";
import "./Header.css";

const SECTIONS = [
  { id: "hombre", label: "Hombre" },
  { id: "mujer", label: "Mujer" },
  { id: "accesorios", label: "Accesorios" },
];

export default function Header({
  activeSection,
  onSelectSection,
  onLogoClick,
  isLoggedIn,
  onOpenLogin,
  onOpenCart,
  onLogout,
  cartCount = 0,
}) {
  return (
    <header className="header">
      <div className="header-inner">
        <button type="button" className="logo-button" onClick={onLogoClick}>
          <Logo />
        </button>

        <nav className="nav">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`nav-item ${activeSection === section.id ? "nav-item-active" : ""}`}
              onClick={() => onSelectSection(section.id)}
            >
              {section.label.toUpperCase()}
            </button>
          ))}
        </nav>

        {isLoggedIn ? (
          <div className="auth-group">
            <button type="button" className="icon-btn" aria-label="Mi perfil">
              <ProfileIcon />
            </button>
            <button type="button" className="icon-btn" aria-label="Carrito" onClick={onOpenCart}>
              <CartIcon />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
            <button type="button" className="icon-btn" aria-label="Cerrar sesión" onClick={onLogout}>
              <LogoutIcon />
            </button>
          </div>
        ) : (
          <div className="auth-group">
            <button type="button" className="btn-login btn-ghost" onClick={() => onOpenLogin("login")}>
              <span>INICIAR SESIÓN</span>
            </button>
            <button type="button" className="btn-login" onClick={() => onOpenLogin("register")}>
              <span>REGISTRARSE</span>
            </button>
            <button type="button" className="icon-btn" aria-label="Carrito" onClick={onOpenCart}>
              <CartIcon />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        )}
      </div>

      <div className="header-stripe" aria-hidden="true" />
    </header>
  );
}
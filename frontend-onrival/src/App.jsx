import { useEffect, useState } from "react";
import { useCart } from "./context/CartContext";

import { authService } from "./services/authService";

import Header from "./components/Header/Header";
import HeroCarousel from "./components/Hero/HeroCarousel";
import CatalogTeaser from "./components/Home/CatalogTeaser";
import HomeProductCarousel from "./components/Home/HomeProductCarousel";
import CatalogSection from "./components/Catalog/CatalogSection";
import ProductDetail from "./components/Product/ProductDetail";
import LoginPanel from "./components/Auth/LoginPanel";
import CartPage from "./components/Cart/CartPage";
import ProfilePage from "./components/Profile/ProfilePage";
import ShippingPage from "./components/Checkout/ShippingPage";
import CheckoutPage from "./components/Checkout/CheckoutPage";
import ResetPasswordPage from "./components/Auth/ResetPasswordPage";
import AdminApp from "./admin/AdminApp";
import "./styles/tokens.css";

// Roles que entran al panel de administración (cada uno con sus permisos)
const PANEL_ROLES = ["admin", "employee"];

export default function App() {
  const { count } = useCart();

  // Detección inicial: Si viene con token de recuperación de contraseña en la URL
  const [view, setView] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("token") || window.location.pathname === "/reset-password") {
      return "reset-password";
    }
    return authService.getUserRole() === "admin" ? "admin" : "home";
  });
  
  const [activeSection, setActiveSection] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [shippingData, setShippingData] = useState(null);

  // Filtro que viene de un destacado: { kind: "offers" } | { kind: "category", category } | null
  const [catalogFilter, setCatalogFilter] = useState(null);
 
  // null | "cliente" | "empleado" | "admin"
  const [userRole, setUserRole] = useState(() => authService.getUserRole());
  const isLoggedIn = userRole !== null;

  const [loginOpen, setLoginOpen] = useState(false);
  const [loginTab, setLoginTab] = useState("login");

  // Escuchar si la URL cambia a reset-password
  useEffect(() => {
    const checkResetToken = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("token") || window.location.pathname === "/reset-password") {
        setView("reset-password");
      }
    };
    window.addEventListener("popstate", checkResetToken);
    return () => window.removeEventListener("popstate", checkResetToken);
  }, []);

  const handleSelectSection = (sectionId) => {
    setActiveSection(sectionId);
    setCatalogFilter(null);
    setView("catalog");
  };
  const handleSelectProduct = (productId) => { setSelectedProductId(productId); setView("product"); };
  const handleLogoClick = () => setView("home");
  const handleOpenCart = () => setView("cart");
  const handleOpenProfile = () => setView("profile");

  const handleHeroAction = (link) => {
    if (link.type === "product") {
      handleSelectProduct(link.productId);
    }
    if (link.type === "offers") {
      handleSelectSection("catalogo");
      setCatalogFilter({ kind: "offers" });
    }
    if (link.type === "category") {
      handleSelectSection("catalogo");
      setCatalogFilter({ kind: "category", category: link.category });
    }
  };

  const openLogin = (tab) => {
    setLoginTab(tab);
    setLoginOpen(true);
  };

  const handleLoginSuccess = (role) => {
    setUserRole(role);
    setLoginOpen(false);
    if (PANEL_ROLES.includes(role)) {
      setView("admin");
    } else {
      setView("home");
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUserRole(null);
    setView("home");
  };

  // Función al terminar de restablecer contraseña o pulsar "Iniciar Sesión"
  const handleFinishResetPassword = () => {
    window.history.replaceState({}, document.title, window.location.pathname.replace("/reset-password", "") || "/");
    setView("home");
    openLogin("login");
  };

  if (view === "admin" && PANEL_ROLES.includes(userRole)) {
    return <AdminApp role={userRole} onExitAdmin={handleLogout} />;
  }

  return (
    <div className="app">
      <Header
        activeSection={view === "catalog" ? activeSection : null}
        onSelectSection={handleSelectSection}
        onLogoClick={handleLogoClick}
        isLoggedIn={isLoggedIn}
        onOpenLogin={openLogin}
        onOpenProfile={handleOpenProfile}
        onOpenCart={handleOpenCart}
        onLogout={handleLogout}
        cartCount={count}
      />

      {view === "home" && (
        <>
          <HeroCarousel onAction={handleHeroAction} />
          <CatalogTeaser onViewCatalog={() => handleSelectSection("catalogo")} />
          <HomeProductCarousel onSelectProduct={handleSelectProduct} onViewCatalog={() => handleSelectSection("catalogo")} />
        </>
      )}

      {view === "catalog" && (
        <CatalogSection
          section={activeSection}
          filter={catalogFilter}
          onSelectSection={handleSelectSection}
          onSelectProduct={handleSelectProduct}
        />
      )}

      {view === "product" && (
        <ProductDetail
          productId={selectedProductId}
          onBack={() => setView("catalog")}
          onGoToCart={() => setView("cart")}
        />
      )}

      {view === "cart" && (
        <CartPage onContinueShopping={() => handleSelectSection("catalogo")} onCheckout={() => setView("shipping")} />
      )}

      {view === "profile" && (
        <ProfilePage onBackToHome={() => setView("home")} />
      )}

      {view === "shipping" && (
        <ShippingPage
          isLoggedIn={isLoggedIn}
          onBackToCart={() => setView("cart")}
          onContinue={(data) => {
            setShippingData(data);
            setView("checkout");
          }}
        />
      )}

      {view === "checkout" && (
        <CheckoutPage
          shippingData={shippingData}
          onBack={() => setView("shipping")}
          onFinish={() => {
            setShippingData(null);
            setView("home");
          }}
        />
      )}

      {/* RENDERIZADO DE LA PANTALLA DE RESTABLECIMIENTO */}
      {view === "reset-password" && (
        <ResetPasswordPage onNavigateLogin={handleFinishResetPassword} />
      )}

      <LoginPanel
        open={loginOpen}
        initialTab={loginTab}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
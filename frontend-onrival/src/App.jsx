import { useState } from "react";
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
import AdminApp from "./admin/AdminApp";
import "./styles/tokens.css";


export default function App() {
  const { count } = useCart();

  // "home" | "catalog" | "product" | "cart" | "shipping" | "checkout" | "admin"
  const [view, setView] = useState(() => (authService.getUserRole() === "admin" ? "admin" : "home"));
  
  const [activeSection, setActiveSection] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [shippingData, setShippingData] = useState(null);

  // Filtro que viene de un destacado: { kind: "offers" } | { kind: "category", categoryId } | null
  const [catalogFilter, setCatalogFilter] = useState(null);
  // "admin" | "cliente" | null
  const [userRole, setUserRole] = useState(() => authService.getUserRole());
  const isLoggedIn = userRole !== null;

  const [loginOpen, setLoginOpen] = useState(false);
  const [loginTab, setLoginTab] = useState("login");

  const handleSelectSection = (sectionId) => {
    setActiveSection(sectionId);
    setCatalogFilter(null); // navegar normal quita el filtro del destacado
    setView("catalog");
  };
  const handleSelectProduct = (productId) => { setSelectedProductId(productId); setView("product"); };
  const handleLogoClick = () => setView("home");
  const handleOpenCart = () => setView("cart");
  const handleOpenProfile = () => setView("profile");

  // Lo que pasa al darle click al botón de un destacado del carrusel
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
    if (role === "admin") setView("admin");
    else setView("home");
  };

  const handleLogout = () => {
    authService.logout(); // Limpia accessToken y user de localStorage
    setUserRole(null);
    setView("home");
  };

  if (view === "admin" && userRole === "admin") {
    return <AdminApp onExitAdmin={handleLogout} />;
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

      <LoginPanel
        open={loginOpen}
        initialTab={loginTab}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
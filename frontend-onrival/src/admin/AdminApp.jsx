import { useState } from "react";
import AdminLayout from "./Layout/AdminLayout";
import DashboardHome from "./Dashboard/DashboardHome";
import CatalogPage from "./Catalog/CatalogPage";
import InventoryPage from "./Inventory/InventoryPage";
import EmployeesPage from "./Users/UsersPage";
import OrdersPage from "./Orders/OrdersPage";
import OrderDetail from "./Orders/OrderDetail";
import ReportsPage from "./Reports/ReportsPage";
import OffersPage from "./Offers/OffersPage";
import HeroSlidesPage from "./Destacados/HeroSlidesPage";
import { getPermissions } from "./permissions";

// Panel compartido por admin y empleado: los permisos del rol deciden
// qué secciones aparecen y qué acciones están habilitadas.
// Se monta desde App.jsx cuando el usuario logueado tiene rol "admin" o "empleado".
export default function AdminApp({ role = "empleado", onExitAdmin }) {
  const permissions = getPermissions(role);

  const [view, setView] = useState("dashboard");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Si la vista actual no está permitida para este rol, se cae al panel general
  const currentView = permissions.views.includes(view) ? view : "dashboard";

  const handleSelectView = (nextView) => {
    if (!permissions.views.includes(nextView)) return;
    setSelectedOrderId(null);
    setView(nextView);
  };

  return (
    <AdminLayout
      activeView={currentView}
      onSelectView={handleSelectView}
      onExitAdmin={onExitAdmin}
      allowedViews={permissions.views}
      userLabel={permissions.label}
    >
      {currentView === "dashboard" && (
        <DashboardHome
          onNavigate={handleSelectView}
          showSalesStats={permissions.canSeeSalesStats}
          allowedViews={permissions.views}
        />
      )}

      {currentView === "catalogo" && (
        <CatalogPage
          canCreate={permissions.canCreateProduct}
          canToggle={permissions.canToggleProduct}
          canDelete={permissions.canDeleteProduct}
          canManageEntities={permissions.canManageCatalogEntities}
        />
      )}

      {currentView === "inventario" && (
        <InventoryPage
          canAddProduct={permissions.canAddInventoryProduct}
          canDelete={permissions.canDeleteProduct}
        />
      )}

      {currentView === "usuarios" && (
        <EmployeesPage
          canSeeEmployees={permissions.canSeeEmployees}
          canDelete={permissions.canDeleteUsers}
        />
      )}

      {currentView === "pedidos" &&
        (selectedOrderId ? (
          <OrderDetail orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} />
        ) : (
          <OrdersPage onSelectOrder={setSelectedOrderId} />
        ))}

      {currentView === "reportes" && <ReportsPage onNavigate={handleSelectView} />}

      {currentView === "ofertas" && <OffersPage />}
      {currentView === "destacados" && <HeroSlidesPage />}
    </AdminLayout>
  );
}
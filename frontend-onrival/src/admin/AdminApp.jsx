import { useState } from "react";
import AdminLayout from "./Layout/AdminLayout";
import DashboardHome from "./Dashboard/DashboardHome";
import InventoryPage from "./Inventory/InventoryPage";
import EmployeesPage from "./Users/UsersPage";
import OrdersPage from "./Orders/OrdersPage";
import OrderDetail from "./Orders/OrderDetail";
import OffersPage from "./Offers/OffersPage";

// Todo lo del panel de admin vive acá adentro, como un "sub-app" propio.
// Se monta desde App.jsx cuando el usuario logueado tiene rol "admin".
export default function AdminApp({ onExitAdmin }) {
  const [view, setView] = useState("dashboard");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const handleSelectView = (nextView) => {
    setSelectedOrderId(null);
    setView(nextView);
  };

  return (
    <AdminLayout activeView={view} onSelectView={handleSelectView} onExitAdmin={onExitAdmin}>
      {view === "dashboard" && <DashboardHome onNavigate={handleSelectView} />}
      {view === "inventario" && <InventoryPage />}
      {view === "usuarios" && <EmployeesPage />}

      {view === "pedidos" &&
        (selectedOrderId ? (
          <OrderDetail orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} />
        ) : (
          <OrdersPage onSelectOrder={setSelectedOrderId} />
        ))}

      {view === "ofertas" && <OffersPage />}
    </AdminLayout>
  );
}
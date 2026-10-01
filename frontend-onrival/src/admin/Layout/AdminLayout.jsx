import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./AdminLayout.css";

export default function AdminLayout({ activeView, onSelectView, onExitAdmin, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSelectView = (view) => {
    onSelectView(view);
    setSidebarOpen(false);
  };

  return (
    <div className="admin-layout">
      <div className={`sidebar-wrap ${sidebarOpen ? "sidebar-open" : ""}`}>
        <Sidebar activeView={activeView} onSelectView={handleSelectView} onExitAdmin={onExitAdmin} />
      </div>

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="admin-main">
        <Topbar activeView={activeView} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
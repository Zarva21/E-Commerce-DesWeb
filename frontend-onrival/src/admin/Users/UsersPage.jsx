import { useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { MOCK_EMPLOYEES, MOCK_CLIENTS } from "./mockUsers";
import "../ui/DataTable.css";
import "./UsersPage.css";

export default function UsersPage() {
  // Pestaña activa: "employees" | "clients"
  const [activeTab, setActiveTab] = useState("employees");

  // TODO API: Reemplazar MOCK_EMPLOYEES y MOCK_CLIENTS por las respuestas de tu backend
  const employees = MOCK_EMPLOYEES;
  const clients = MOCK_CLIENTS;

  return (
    <div className="users-page">
      <PageHeader
        title="Usuarios"
        subtitle={
          activeTab === "employees"
            ? "Gestión de colaboradores y accesos al panel"
            : "Directorio de clientes registrados en la tienda"
        }
        actionLabel={activeTab === "employees" ? "Agregar empleado" : undefined}
        onAction={
          activeTab === "employees"
            ? () => {
                // TODO: Abrir modal o vista de registro de nuevo empleado
                console.log("Agregar nuevo empleado");
              }
            : undefined
        }
      />

      {/* Control de Pestañas Superior */}
      <div className="users-tabs-bar">
        <button
          type="button"
          className={`users-tab-btn ${activeTab === "employees" ? "users-tab-active" : ""}`}
          onClick={() => setActiveTab("employees")}
        >
          Empleados ({employees.length})
        </button>
        <button
          type="button"
          className={`users-tab-btn ${activeTab === "clients" ? "users-tab-active" : ""}`}
          onClick={() => setActiveTab("clients")}
        >
          Clientes Registrados ({clients.length})
        </button>
      </div>

      {/* TABLA 1: EMPLEADOS */}
      {activeTab === "employees" && (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <span className="data-cell-title">{employee.name}</span>
                  </td>
                  <td className="data-cell-muted">{employee.email}</td>
                  <td>
                    <span className="user-role-badge">{employee.role}</span>
                  </td>
                  <td>
                    <StatusBadge
                      label={employee.status}
                      tone={employee.status === "Activo" ? "success" : "danger"}
                    />
                  </td>
                  <td>
                    <div className="data-actions">
                      <button type="button" className="data-action-btn">
                        Editar
                      </button>
                      <button
                        type="button"
                        className="data-action-btn data-action-btn-danger"
                      >
                        {employee.status === "Activo" ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {employees.length === 0 && (
            <p className="data-empty">No hay empleados registrados actualmente.</p>
          )}
        </div>
      )}

      {/* TABLA 2: CLIENTES */}
      {activeTab === "clients" && (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Pedidos realizados</th>
                <th>Estado cuenta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <span className="data-cell-title">{client.name}</span>
                  </td>
                  <td className="data-cell-muted">
                    <div>{client.email}</div>
                    <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                      {client.phone}
                    </small>
                  </td>
                  <td>
                    <strong>{client.totalOrders} pedidos</strong>
                  </td>
                  <td>
                    <StatusBadge
                      label={client.status}
                      tone={client.status === "Activo" ? "success" : "danger"}
                    />
                  </td>
                  <td>
                    <div className="data-actions">
                      <button type="button" className="data-action-btn">
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        className="data-action-btn data-action-btn-danger"
                      >
                        {client.status === "Activo" ? "Bloquear" : "Desbloquear"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {clients.length === 0 && (
            <p className="data-empty">No hay clientes registrados en la plataforma.</p>
          )}
        </div>
      )}
    </div>
  );
}
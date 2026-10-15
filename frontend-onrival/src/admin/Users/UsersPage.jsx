import { useEffect, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { userService } from "../../services/userService";
import { MOCK_EMPLOYEES, MOCK_CLIENTS } from "./mockUsers";
import "../ui/DataTable.css";
import "./UsersPage.css";

export default function UsersPage({ canSeeEmployees = true }) {
  const [activeTab, setActiveTab] = useState(canSeeEmployees ? "employees" : "clients");
  const tab = canSeeEmployees ? activeTab : "clients";

  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de nuevo empleado
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    employee_code: "",
    first_name: "",
    last_name: "",
    position: "Encargado de inventario",
    email: "",
    password: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      if (canSeeEmployees) {
        const [empRes, cliRes] = await Promise.allSettled([
          userService.getEmployees(),
          userService.getClients(),
        ]);
        setEmployees(empRes.status === "fulfilled" && empRes.value.length > 0 ? empRes.value : MOCK_EMPLOYEES);
        setClients(cliRes.status === "fulfilled" && cliRes.value.length > 0 ? cliRes.value : MOCK_CLIENTS);
      } else {
        const cliData = await userService.getClients();
        setClients(cliData.length > 0 ? cliData : MOCK_CLIENTS);
      }
    } catch (err) {
      console.warn("Fallo al consultar usuarios en backend, usando mocks:", err);
      setEmployees(MOCK_EMPLOYEES);
      setClients(MOCK_CLIENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canSeeEmployees]);

  // Alternar estado activo / inactivo
  const handleToggleStatus = async (item, type) => {
    const targetUserId = item.user_id || item.id;
    try {
      await userService.toggleAccountStatus(targetUserId);
      const newStatus = item.status === "Activo" ? "Inactivo" : "Activo";

      if (type === "employee") {
        setEmployees((prev) =>
          prev.map((e) => (e.id === item.id ? { ...e, status: newStatus, is_active: newStatus === "Activo" } : e))
        );
      } else {
        setClients((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, status: newStatus, is_active: newStatus === "Activo" } : c))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo actualizar el estado de la cuenta.");
    }
  };

  // Crear Empleado
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.employee_code.trim()) {
      setFormError("El código de empleado es obligatorio.");
      return;
    }

    setSubmitting(true);
    try {
      await userService.createEmployee(formData);
      await loadData();
      setIsModalOpen(false);
      setFormData({
        employee_code: "",
        first_name: "",
        last_name: "",
        position: "Encargado de inventario",
        email: "",
        password: "",
      });
    } catch (err) {
      setFormError(err.response?.data?.message || "Error al registrar el empleado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="users-page">
      <PageHeader
        title="Usuarios"
        subtitle={
          tab === "employees"
            ? "Gestión de colaboradores y accesos al panel"
            : "Directorio de clientes registrados en la tienda"
        }
        actionLabel={tab === "employees" ? "Agregar empleado" : undefined}
        onAction={tab === "employees" ? () => setIsModalOpen(true) : undefined}
      />

      {/* Control de Pestañas Superior */}
      <div className="users-tabs-bar">
        {canSeeEmployees && (
          <button
            type="button"
            className={`users-tab-btn ${tab === "employees" ? "users-tab-active" : ""}`}
            onClick={() => setActiveTab("employees")}
          >
            Empleados ({employees.length})
          </button>
        )}
        <button
          type="button"
          className={`users-tab-btn ${tab === "clients" ? "users-tab-active" : ""}`}
          onClick={() => setActiveTab("clients")}
        >
          Clientes Registrados ({clients.length})
        </button>
      </div>

      {loading ? (
        <div className="data-card">
          <p className="data-empty">Cargando registros...</p>
        </div>
      ) : (
        <>
          {/* TABLA 1: EMPLEADOS */}
          {canSeeEmployees && tab === "employees" && (
            <div className="data-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol / Puesto</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <span className="data-cell-title">{employee.name}</span>
                        {employee.employee_code && (
                          <div className="data-cell-muted">Cód: {employee.employee_code}</div>
                        )}
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
                          <button
                            type="button"
                            className="data-action-btn data-action-btn-danger"
                            onClick={() => handleToggleStatus(employee, "employee")}
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
          {tab === "clients" && (
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
                          <button
                            type="button"
                            className="data-action-btn data-action-btn-danger"
                            onClick={() => handleToggleStatus(client, "client")}
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
        </>
      )}

      {/* MODAL AGREGAR EMPLEADO */}
      {isModalOpen && (
        <div className="catalog-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>Nuevo Colaborador / Empleado</h2>
              <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            {formError && <div className="modal-error-banner">{formError}</div>}

            <form onSubmit={handleCreateEmployee} className="catalog-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Código de Empleado *</label>
                  <input
                    type="text"
                    placeholder="Ej: EMP-001"
                    value={formData.employee_code}
                    onChange={(e) =>
                      setFormData({ ...formData, employee_code: e.target.value.toUpperCase() })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Puesto / Cargo</label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Encargado de inventario">Encargado de inventario</option>
                    <option value="Atención al cliente">Atención al cliente</option>
                    <option value="Operativo de despacho">Operativo de despacho</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellido *</label>
                  <input
                    type="text"
                    placeholder="Apellido"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Correo Electrónico *</label>
                  <input
                    type="email"
                    placeholder="colaborador@onrival.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña de Acceso *</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Guardando..." : "Crear Empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import EntityModal from "../Catalog/EntityModal";
import { userService } from "../../services/userService";
import { MOCK_EMPLOYEES, MOCK_CLIENTS } from "./mockUsers";
import "../ui/DataTable.css";
import "../Catalog/CatalogPage.css";
import "./UsersPage.css";

const str = (v) => String(v ?? "").trim();
const norm = (v) => str(v).toLowerCase();
const fullName = (p) => `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.name || "Usuario";
const initialsOf = (p) =>
  `${str(p.first_name || p.name).charAt(0)}${str(p.last_name).charAt(0)}`.toUpperCase() || "U";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatBirthDate = (value) => {
  if (!value) return "No registrada";
  try {
    const cleanDate = String(value).split("T")[0];
    const [y, m, d] = cleanDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-GT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const nextEmployeeCode = (employees) => {
  const max = employees.reduce((acc, e) => {
    const n = parseInt(String(e.employee_code).replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `EMP-${String(max + 1).padStart(3, "0")}`;
};

export default function UsersPage({ canSeeEmployees = true, canDelete = true }) {
  const [activeTab, setActiveTab] = useState(canSeeEmployees ? "employees" : "clients");
  const tab = canSeeEmployees ? activeTab : "clients";

  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(null); // { type: "employee" | "client", item }
  const [detailId, setDetailId] = useState(null);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [submittingRole, setSubmittingRole] = useState(false);

  const detail = clients.find((c) => c.id === detailId) ?? null;

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, cliRes, rolesRes] = await Promise.allSettled([
        canSeeEmployees ? userService.getEmployees() : Promise.resolve([]),
        userService.getClients(),
        userService.getRoles ? userService.getRoles() : Promise.resolve([]),
      ]);

      if (canSeeEmployees) {
        setEmployees(empRes.status === "fulfilled" && empRes.value?.length > 0 ? empRes.value : MOCK_EMPLOYEES);
      }
      setClients(cliRes.status === "fulfilled" && cliRes.value?.length > 0 ? cliRes.value : MOCK_CLIENTS);

      if (rolesRes.status === "fulfilled" && rolesRes.value?.length > 0) {
        setRoles(rolesRes.value);
      } else {
        setRoles([
          { id: 16, name: "admin" },
          { id: 17, name: "employee" },
          { id: 18, name: "customer" },
        ]);
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

  const emailTaken = (email, type, id) =>
    employees.some((e) => !(type === "employee" && e.id === id) && norm(e.email) === norm(email)) ||
    clients.some((c) => !(type === "client" && c.id === id) && norm(c.email) === norm(email));

  // ---------------- GUARDAR ----------------
  const saveEmployee = async (form, id) => {
    const first_name = str(form.first_name);
    const last_name = str(form.last_name);
    const email = str(form.email);
    const employee_code = str(form.employee_code);

    if (!first_name || !last_name) return { error: "El nombre y el apellido son obligatorios." };
    if (!EMAIL_RE.test(email)) return { error: "Ingresá un correo electrónico válido." };
    if (emailTaken(email, "employee", id)) return { error: `Ya existe un usuario con el correo "${email}".` };
    if (!employee_code) return { error: "El código de empleado es obligatorio." };

    if (id == null && str(form.password).length < 6) {
      return { error: "La contraseña temporal debe tener al menos 6 caracteres." };
    }

    const payload = {
      first_name,
      last_name,
      email,
      employee_code,
      position: str(form.position) || "Encargado de inventario",
      password: form.password,
    };

    try {
      if (id == null) {
        await userService.createEmployee(payload);
      } else {
        await userService.updateEmployee(id, payload);
      }
      await loadData();
      return { ok: true };
    } catch (err) {
      return { error: err.response?.data?.message || err.message || "Error al procesar el colaborador." };
    }
  };

  const saveClient = async (form, id) => {
    const first_name = str(form.first_name);
    const last_name = str(form.last_name);
    const email = str(form.email);
    const phone = str(form.phone);
    const birth_date = str(form.birth_date);

    if (!first_name || !last_name) return { error: "El nombre y el apellido son obligatorios." };
    if (!EMAIL_RE.test(email)) return { error: "Ingresá un correo electrónico válido." };
    if (birth_date && birth_date > todayISO()) {
      return { error: "La fecha de nacimiento no puede ser futura." };
    }

    const payload = {
      first_name,
      last_name,
      email,
      phone,
      birth_date: birth_date || null,
      marketing_enabled: form.marketing_enabled === "true",
    };

    try {
      await userService.updateClient(id, payload);
      await loadData();
      return { ok: true };
    } catch (err) {
      return { error: err.response?.data?.message || err.message || "Error al actualizar el cliente." };
    }
  };

  const openModal = (type, item = null) => {
    if (type === "employee" && !canSeeEmployees) return;
    setDetailId(null);
    setModal({ type, item });
  };

  const handleSave = (form) =>
    modal.type === "employee"
      ? saveEmployee(form, modal.item?.id ?? null)
      : saveClient(form, modal.item.id);

  const employeeFields = (isNew) => [
    { name: "first_name", label: "Nombre *", required: true, placeholder: "Ej: Ana" },
    { name: "last_name", label: "Apellido *", required: true, placeholder: "Ej: López" },
    { name: "email", label: "Correo electrónico *", type: "email", required: true, placeholder: "nombre@onrival.com" },
    { name: "employee_code", label: "Código de empleado *", required: true, placeholder: "EMP-001" },
    { name: "position", label: "Cargo", placeholder: "Ej: Encargada de inventario" },
    ...(isNew
      ? [
          {
            name: "password",
            label: "Contraseña temporal *",
            type: "password",
            required: true,
            placeholder: "Mínimo 6 caracteres",
            hint: "Se le entregará al colaborador para su primer ingreso.",
          },
        ]
      : []),
  ];

  const clientFields = () => [
    { name: "first_name", label: "Nombre *", required: true },
    { name: "last_name", label: "Apellido *", required: true },
    { name: "email", label: "Correo electrónico *", type: "email", required: true },
    { name: "phone", label: "Teléfono", type: "tel", placeholder: "5555-5555" },
    { name: "birth_date", label: "Fecha de nacimiento", type: "date" },
    {
      name: "marketing_enabled",
      label: "Acepta promociones por correo",
      type: "select",
      options: [
        { value: "false", label: "No" },
        { value: "true", label: "Sí" },
      ],
    },
  ];

  const initialFor = (type, item) => {
    if (type === "employee") {
      return item
        ? {
            first_name: item.first_name ?? "",
            last_name: item.last_name ?? "",
            email: item.email ?? "",
            employee_code: item.employee_code ?? "",
            position: item.position || item.role || "",
          }
        : {
            first_name: "",
            last_name: "",
            email: "",
            employee_code: nextEmployeeCode(employees),
            position: "Encargado de inventario",
            password: "",
          };
    }
    return {
      first_name: item.first_name ?? "",
      last_name: item.last_name ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      birth_date: item.birth_date ? String(item.birth_date).split("T")[0] : "",
      marketing_enabled: item.marketing_enabled ? "true" : "false",
    };
  };

  const modalFields = modal
    ? modal.type === "employee"
      ? employeeFields(!modal.item)
      : clientFields()
    : [];

  const modalTitle = !modal
    ? ""
    : modal.type === "employee"
    ? modal.item
      ? "Editar empleado"
      : "Agregar empleado"
    : "Editar cliente";

  // ---------------- ACTIVAR / BLOQUEAR / ELIMINAR ----------------
  const handleToggleStatus = async (item, type) => {
    const targetUserId = item.user_id || item.id;
    try {
      await userService.toggleAccountStatus(targetUserId);
      const newActive = !Boolean(item.is_active ?? item.status === "Activo");

      if (type === "employee") {
        setEmployees((prev) =>
          prev.map((e) => (e.id === item.id ? { ...e, is_active: newActive, status: newActive ? "Activo" : "Inactivo" } : e))
        );
      } else {
        setClients((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, is_active: newActive, status: newActive ? "Activo" : "Inactivo" } : c))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo actualizar el estado de la cuenta.");
    }
  };

  const deleteEmployee = async (employee) => {
    if (!canDelete) return;
    if (!window.confirm(`¿Eliminar a ${fullName(employee)}? Perderá el acceso al panel.`)) return;

    try {
      await userService.deleteEmployee(employee.id);
      setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar empleado.");
    }
  };

  const deleteClient = async (client) => {
    if (!canDelete) return;
    const note =
      client.totalOrders > 0
        ? `\n\nAtención: Tiene ${client.totalOrders} pedido(s) asociados.`
        : "";
    if (!window.confirm(`¿Eliminar al cliente ${fullName(client)}?${note}`)) return;

    try {
      await userService.deleteClient(client.id);
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      if (detailId === client.id) setDetailId(null);
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar cliente.");
    }
  };

  // ---------------- CAMBIO DE ROL ----------------
  const openRoleModal = (user) => {
    setRoleModalUser(user);
    setSelectedRoleId(user.role_id || "");
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleModalUser || !selectedRoleId) return;

    setSubmittingRole(true);
    try {
      const targetUserId = roleModalUser.user_id || roleModalUser.id;
      await userService.updateUserRole(targetUserId, Number(selectedRoleId));
      await loadData();
      setRoleModalUser(null);
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo actualizar el rol.");
    } finally {
      setSubmittingRole(false);
    }
  };
  
  const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
  return (
    <div className="users-page">
      <PageHeader
        title="Usuarios"
        subtitle={
          tab === "employees"
            ? "Gestión de colaboradores y accesos al panel administrativo"
            : "Directorio de clientes y compradores en la tienda"
        }
        actionLabel={tab === "employees" ? "Agregar empleado" : undefined}
        onAction={tab === "employees" ? () => openModal("employee") : undefined}
      />

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
          Clientes ({clients.length})
        </button>
      </div>

      {loading ? (
        <div className="data-card">
          <p className="data-empty">Cargando registros desde la base de datos...</p>
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
                    <th>Rol / Cargo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const active = employee.is_active ?? employee.status === "Activo";
                    return (
                      <tr key={employee.id}>
                        <td>
                          <span className="data-cell-title">{fullName(employee)}</span>
                          <div className="data-cell-muted">
                            Código: {employee.employee_code || `#${employee.id}`}
                          </div>
                        </td>
                        <td className="data-cell-muted">{employee.email}</td>
                        <td>
                          <span
                            className="user-role-badge"
                            style={{ cursor: "pointer" }}
                            onClick={() => openRoleModal(employee)}
                            title="Haz clic para cambiar el rol"
                          >
                            {employee.role_name || employee.position || "Colaborador"} ✎
                          </span>
                        </td>
                        <td>
                          <StatusBadge label={active ? "Activo" : "Inactivo"} tone={active ? "success" : "danger"} />
                        </td>
                        <td>
                          <div className="data-actions">
                            <button
                              type="button"
                              className="data-action-btn"
                              onClick={() => openModal("employee", employee)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={`data-action-btn ${active ? "data-action-btn-danger" : ""}`}
                              onClick={() => handleToggleStatus(employee, "employee")}
                            >
                              {active ? "Desactivar" : "Activar"}
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                className="data-action-btn data-action-btn-icon data-action-btn-danger"
                                onClick={() => deleteEmployee(employee)}
                                title="Eliminar empleado"
                                aria-label={`Eliminar a ${fullName(employee)}`}
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {employees.length === 0 && (
                <p className="data-empty">No hay colaboradores registrados actualmente.</p>
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
                    <th>Tipo de Cuenta</th>
                    <th>Pedidos</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const active = client.is_active ?? client.status === "Activo";
                    return (
                      <tr key={client.id}>
                        <td>
                          <span className="data-cell-title">{fullName(client)}</span>
                        </td>
                        <td className="data-cell-muted">
                          <div>{client.email}</div>
                          <small style={{ color: "#64748b", fontSize: "12px" }}>
                            {client.phone || "Sin teléfono"}
                          </small>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: 600,
                              backgroundColor: client.is_guest ? "#fef3c7" : "#e0f2fe",
                              color: client.is_guest ? "#92400e" : "#0369a1",
                            }}
                          >
                            {client.is_guest ? "Invitado" : "Registrado"}
                          </span>
                        </td>
                        <td>
                          <strong>{client.totalOrders ?? 0} pedidos</strong>
                        </td>
                        <td>
                          <StatusBadge label={active ? "Activo" : "Bloqueado"} tone={active ? "success" : "danger"} />
                        </td>
                        <td>
                          <div className="data-actions">
                            <button type="button" className="data-action-btn" onClick={() => setDetailId(client.id)}>
                              Detalle
                            </button>
                            <button type="button" className="data-action-btn" onClick={() => openRoleModal(client)} title="Cambiar rol">
                              Rol
                            </button>
                            <button type="button" className="data-action-btn" onClick={() => openModal("client", client)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className={`data-action-btn ${active ? "data-action-btn-danger" : ""}`}
                              onClick={() => handleToggleStatus(client, "client")}
                            >
                              {active ? "Bloquear" : "Desbloquear"}
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                className="data-action-btn data-action-btn-icon data-action-btn-danger"
                                onClick={() => deleteClient(client)}
                                title="Eliminar cliente"
                                aria-label={`Eliminar a ${fullName(client)}`}
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {clients.length === 0 && (
                <p className="data-empty">No hay clientes registrados en la plataforma.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL: CAMBIAR ROL */}
      {roleModalUser && (
        <div className="catalog-modal-overlay" onClick={() => setRoleModalUser(null)}>
          <div className="catalog-modal-card" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>Cambiar Rol de Usuario</h2>
              <button type="button" className="close-btn" onClick={() => setRoleModalUser(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveRole} style={{ marginTop: "1rem" }}>
              <p style={{ margin: "0 0 1rem 0", color: "#64748b" }}>
                Usuario: <strong>{fullName(roleModalUser)}</strong> ({roleModalUser.email})
              </p>
              <div className="form-group">
                <label>Selecciona el nuevo rol:</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  required
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.toUpperCase()} (ID #{r.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setRoleModalUser(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submittingRole}>
                  {submittingRole ? "Guardando..." : "Asignar Rol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR / EDITAR */}
      {modal && (
        <EntityModal
          key={`${modal.type}-${modal.item?.id ?? "new"}`}
          title={modalTitle}
          fields={modalFields}
          initial={initialFor(modal.type, modal.item)}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* MODAL: VER DETALLE DEL CLIENTE */}
      {detail && (
        <div className="catalog-modal-overlay" onClick={() => setDetailId(null)}>
          <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>Detalle del cliente</h2>
              <button type="button" className="close-btn" onClick={() => setDetailId(null)}>
                ✕
              </button>
            </div>

            <div className="user-detail-head">
              <span className="user-detail-avatar" aria-hidden="true">
                {initialsOf(detail)}
              </span>
              <div className="user-detail-name">
                <strong>{fullName(detail)}</strong>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  <StatusBadge
                    label={detail.is_active ? "Activo" : "Bloqueado"}
                    tone={detail.is_active ? "success" : "danger"}
                  />
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: detail.is_guest ? "#fef3c7" : "#e0f2fe",
                      color: detail.is_guest ? "#92400e" : "#0369a1",
                    }}
                  >
                    {detail.is_guest ? "Invitado" : "Registrado"}
                  </span>
                </div>
              </div>
            </div>

            <dl className="user-detail-grid">
              <div className="user-detail-item">
                <dt>Correo electrónico</dt>
                <dd>{detail.email}</dd>
              </div>
              <div className="user-detail-item">
                <dt>Teléfono de contacto</dt>
                <dd>{detail.phone || "—"}</dd>
              </div>
              <div className="user-detail-item">
                <dt>Fecha de nacimiento</dt>
                <dd>{formatBirthDate(detail.birth_date)}</dd>
              </div>
              <div className="user-detail-item">
                <dt>Rol en sistema</dt>
                <dd>{detail.role_name || "customer"}</dd>
              </div>
              <div className="user-detail-item">
                <dt>Pedidos realizados</dt>
                <dd>
                  <strong>{detail.totalOrders ?? 0} pedidos</strong>
                </dd>
              </div>
              <div className="user-detail-item">
                <dt>Promociones por correo</dt>
                <dd>{detail.marketing_enabled ? "Acepta promociones" : "No suscrito"}</dd>
              </div>
            </dl>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setDetailId(null)}>
                Cerrar
              </button>
              <button type="button" className="btn-primary" onClick={() => openModal("client", detail)}>
                Editar Información
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
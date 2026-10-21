import { useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import EntityModal from "../Catalog/EntityModal";
import { TrashIcon } from "../Catalog/icons";
import { MOCK_EMPLOYEES, MOCK_CLIENTS } from "./mockUsers";
import "../ui/DataTable.css";
import "../Catalog/CatalogPage.css"; // modales, formularios y botones de icono
import "./UsersPage.css";

const str = (v) => String(v ?? "").trim();
const norm = (v) => str(v).toLowerCase();
const fullName = (p) => `${p.first_name} ${p.last_name}`.trim();
const initialsOf = (p) => `${str(p.first_name).charAt(0)}${str(p.last_name).charAt(0)}`.toUpperCase();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDERS = ["Masculino", "Femenino", "Otro", "Prefiero no decir"];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// "1995-03-14" -> "14 de marzo de 1995" (sin pasar por UTC para que no se corra un día)
const formatBirthDate = (value) => {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};

// Siguiente código libre: EMP-004, EMP-005...
const nextEmployeeCode = (employees) => {
  const max = employees.reduce((acc, e) => {
    const n = parseInt(String(e.employee_code).replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `EMP-${String(max + 1).padStart(3, "0")}`;
};

// canSeeEmployees: ve y administra la pestaña de empleados (solo admin).
// canDelete: puede eliminar empleados y clientes (solo admin).
export default function UsersPage({ canSeeEmployees = true, canDelete = true }) {
  // Pestaña activa: "employees" | "clients" (sin permiso, solo existe "clients")
  const [activeTab, setActiveTab] = useState(canSeeEmployees ? "employees" : "clients");
  const tab = canSeeEmployees ? activeTab : "clients";

  // TODO API: Reemplazar MOCK_EMPLOYEES y MOCK_CLIENTS por las respuestas de tu backend
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [clients, setClients] = useState(MOCK_CLIENTS);

  const [modal, setModal] = useState(null); // { type: "employee" | "client", item (null = nuevo) }
  const [detailId, setDetailId] = useState(null); // cliente que se muestra en "Ver detalle"
  const detail = clients.find((c) => c.id === detailId) ?? null;

  // El correo vive en la tabla de usuarios: no se puede repetir entre empleados y clientes
  const emailTaken = (email, type, id) =>
    employees.some((e) => !(type === "employee" && e.id === id) && norm(e.email) === norm(email)) ||
    clients.some((c) => !(type === "client" && c.id === id) && norm(c.email) === norm(email));

  // ---------------- GUARDAR (cada uno devuelve { ok } o { error }) ----------------
  // TODO: con backend, cada uno se convierte en una llamada a la API.
  const saveEmployee = (form, id) => {
    const first_name = str(form.first_name);
    const last_name = str(form.last_name);
    const email = str(form.email);
    const employee_code = str(form.employee_code);

    if (!first_name || !last_name) return { error: "El nombre y el apellido son obligatorios." };
    if (!EMAIL_RE.test(email)) return { error: "Ingresá un correo electrónico válido." };
    if (emailTaken(email, "employee", id)) return { error: `Ya existe un usuario con el correo "${email}".` };
    if (!employee_code) return { error: "El código de empleado es obligatorio." };
    if (employees.some((e) => e.id !== id && norm(e.employee_code) === norm(employee_code))) {
      return { error: `El código "${employee_code}" ya está en uso.` };
    }
    // La contraseña NO se guarda acá: con backend se manda a la API, que la encripta
    if (id == null && str(form.password).length < 8) {
      return { error: "La contraseña temporal debe tener al menos 8 caracteres." };
    }

    const data = {
      first_name,
      last_name,
      name: `${first_name} ${last_name}`,
      email,
      employee_code,
      position: str(form.position),
    };

    if (id != null) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
    } else {
      setEmployees((prev) => [...prev, { id: Date.now(), status: "Activo", ...data }]);
    }
    return { ok: true };
  };

  const saveClient = (form, id) => {
    const first_name = str(form.first_name);
    const last_name = str(form.last_name);
    const email = str(form.email);
    const phone = str(form.phone);
    const birth_date = str(form.birth_date);

    if (!first_name || !last_name) return { error: "El nombre y el apellido son obligatorios." };
    if (!EMAIL_RE.test(email)) return { error: "Ingresá un correo electrónico válido." };
    if (emailTaken(email, "client", id)) return { error: `Ya existe un usuario con el correo "${email}".` };
    if (phone && phone.replace(/\D/g, "").length < 8) {
      return { error: "El teléfono debe tener al menos 8 dígitos." };
    }
    if (birth_date && birth_date > todayISO()) {
      return { error: "La fecha de nacimiento no puede ser futura." };
    }

    const data = {
      first_name,
      last_name,
      name: `${first_name} ${last_name}`,
      email,
      phone,
      birth_date,
      gender: str(form.gender),
      marketing_enabled: form.marketing_enabled === "true",
    };

    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    return { ok: true };
  };

  // ---------------- MODAL (formulario) ----------------
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
            placeholder: "Mínimo 8 caracteres",
            hint: "Se la entregás al empleado para su primer ingreso.",
          },
        ]
      : []),
  ];

  const clientFields = (item) => {
    // Si el cliente ya trae un género que no está en la lista, se conserva como opción
    const genders = item?.gender && !GENDERS.includes(item.gender) ? [...GENDERS, item.gender] : GENDERS;
    return [
      { name: "first_name", label: "Nombre *", required: true },
      { name: "last_name", label: "Apellido *", required: true },
      { name: "email", label: "Correo electrónico *", type: "email", required: true },
      { name: "phone", label: "Teléfono", type: "tel", placeholder: "0000-0000" },
      { name: "birth_date", label: "Fecha de nacimiento", type: "date" },
      {
        name: "gender",
        label: "Género",
        type: "select",
        options: [{ value: "", label: "Sin especificar" }, ...genders.map((g) => ({ value: g, label: g }))],
      },
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
  };

  const initialFor = (type, item) => {
    if (type === "employee") {
      return item
        ? {
            first_name: item.first_name ?? "",
            last_name: item.last_name ?? "",
            email: item.email ?? "",
            employee_code: item.employee_code ?? "",
            position: item.position ?? "",
          }
        : {
            first_name: "",
            last_name: "",
            email: "",
            employee_code: nextEmployeeCode(employees),
            position: "",
            password: "",
          };
    }
    return {
      first_name: item.first_name ?? "",
      last_name: item.last_name ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      birth_date: item.birth_date ?? "",
      gender: item.gender ?? "",
      marketing_enabled: item.marketing_enabled ? "true" : "false",
    };
  };

  const modalFields = modal
    ? modal.type === "employee"
      ? employeeFields(!modal.item)
      : clientFields(modal.item)
    : [];

  const modalTitle = !modal
    ? ""
    : modal.type === "employee"
    ? modal.item
      ? "Editar empleado"
      : "Agregar empleado"
    : "Editar cliente";

  // ---------------- ACTIVAR / BLOQUEAR / ELIMINAR ----------------
  const toggleEmployee = (employee) => {
    const active = employee.status === "Activo";
    if (active && !window.confirm(`¿Desactivar a ${fullName(employee)}? No podrá ingresar al panel.`)) return;
    setEmployees((prev) =>
      prev.map((e) => (e.id === employee.id ? { ...e, status: active ? "Inactivo" : "Activo" } : e))
    );
  };

  const toggleClient = (client) => {
    const active = client.status === "Activo";
    if (active && !window.confirm(`¿Bloquear la cuenta de ${fullName(client)}? No podrá iniciar sesión.`)) return;
    setClients((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, status: active ? "Inactivo" : "Activo" } : c))
    );
  };

  const deleteEmployee = (employee) => {
    if (!canDelete) return;
    if (!window.confirm(`¿Eliminar a ${fullName(employee)}? Perderá el acceso al panel.`)) return;
    setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
  };

  const deleteClient = (client) => {
    if (!canDelete) return;
    const note =
      client.totalOrders > 0
        ? `\n\nTiene ${client.totalOrders} pedido(s) realizados. El historial de pedidos se conserva.`
        : "";
    if (!window.confirm(`¿Eliminar al cliente ${fullName(client)}?${note}`)) return;
    setClients((prev) => prev.filter((c) => c.id !== client.id));
    if (detailId === client.id) setDetailId(null);
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
        onAction={tab === "employees" ? () => openModal("employee") : undefined}
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

      {/* TABLA 1: EMPLEADOS (solo con permiso) */}
      {canSeeEmployees && tab === "employees" && (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Cargo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const active = employee.status === "Activo";
                return (
                  <tr key={employee.id}>
                    <td>
                      <span className="data-cell-title">{fullName(employee)}</span>
                      <div className="data-cell-muted">Código: {employee.employee_code}</div>
                    </td>
                    <td className="data-cell-muted">{employee.email}</td>
                    <td>
                      {employee.position ? (
                        <span className="user-role-badge">{employee.position}</span>
                      ) : (
                        <span className="data-cell-muted">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge label={employee.status} tone={active ? "success" : "danger"} />
                    </td>
                    <td>
                      <div className="data-actions">
                        <button type="button" className="data-action-btn" onClick={() => openModal("employee", employee)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className={`data-action-btn ${active ? "data-action-btn-danger" : ""}`}
                          onClick={() => toggleEmployee(employee)}
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
              {clients.map((client) => {
                const active = client.status === "Activo";
                return (
                  <tr key={client.id}>
                    <td>
                      <span className="data-cell-title">{fullName(client)}</span>
                    </td>
                    <td className="data-cell-muted">
                      <div>{client.email}</div>
                      <small style={{ color: "var(--muted)", fontSize: "12px" }}>{client.phone || "Sin teléfono"}</small>
                    </td>
                    <td>
                      <strong>{client.totalOrders} pedidos</strong>
                    </td>
                    <td>
                      <StatusBadge label={active ? "Activo" : "Bloqueado"} tone={active ? "success" : "danger"} />
                    </td>
                    <td>
                      <div className="data-actions">
                        <button type="button" className="data-action-btn" onClick={() => setDetailId(client.id)}>
                          Ver detalle
                        </button>
                        <button type="button" className="data-action-btn" onClick={() => openModal("client", client)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className={`data-action-btn ${active ? "data-action-btn-danger" : ""}`}
                          onClick={() => toggleClient(client)}
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

      {/* MODAL: AGREGAR / EDITAR (empleado o cliente) */}
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
                <StatusBadge
                  label={detail.status === "Activo" ? "Activo" : "Bloqueado"}
                  tone={detail.status === "Activo" ? "success" : "danger"}
                />
              </div>
            </div>

            <dl className="user-detail-grid">
              <div className="user-detail-item">
                <dt>Correo</dt>
                <dd>{detail.email}</dd>
              </div>
              <div className="user-detail-item">
                <dt>Teléfono</dt>
                <dd>{detail.phone || "—"}</dd>
              </div>
              <div className="user-detail-item">
                <dt>Fecha de nacimiento</dt>
                <dd>{formatBirthDate(detail.birth_date)}</dd>
              </div>
              <div className="user-detail-item">
                <dt>Género</dt>
                <dd>{detail.gender || "—"}</dd>
              </div>
              <div className="user-detail-item">
                <dt>Pedidos realizados</dt>
                <dd>{detail.totalOrders}</dd>
              </div>
              <div className="user-detail-item">
                <dt>Promociones por correo</dt>
                <dd>{detail.marketing_enabled ? "Las acepta" : "No las acepta"}</dd>
              </div>
            </dl>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setDetailId(null)}>
                Cerrar
              </button>
              <button type="button" className="btn-primary" onClick={() => openModal("client", detail)}>
                Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
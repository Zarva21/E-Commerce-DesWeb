import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { MOCK_EMPLOYEES } from "./mockEmployees";
import "../ui/DataTable.css";

export default function EmployeesPage() {
  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Empleados con acceso al panel"
        actionLabel="Agregar usuario"
        onAction={() => {
          // TODO: abrir formulario de nuevo empleado
          console.log("agregar usuario");
        }}
      />

      <div className="data-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {MOCK_EMPLOYEES.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <span className="data-cell-title">{employee.name}</span>
                </td>
                <td className="data-cell-muted">{employee.email}</td>
                <td>{employee.role}</td>
                <td>
                  <StatusBadge
                    label={employee.status}
                    tone={employee.status === "Activo" ? "success" : "danger"}
                  />
                </td>
                <td>
                  <div className="data-actions">
                    <button type="button" className="data-action-btn">Editar</button>
                    <button type="button" className="data-action-btn data-action-btn-danger">
                      {employee.status === "Activo" ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {MOCK_EMPLOYEES.length === 0 && (
          <p className="data-empty">Todavía no hay usuarios cargados.</p>
        )}
      </div>
    </div>
  );
}
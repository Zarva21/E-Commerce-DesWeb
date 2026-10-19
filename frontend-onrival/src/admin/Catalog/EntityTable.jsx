import { TrashIcon } from "./Icons";

// Botones de fila: "Editar" + basurero (igual que en la tabla de productos)
export function RowActions({ name, onEdit, onDelete }) {
  return (
    <div className="data-actions">
      <button type="button" className="data-action-btn" onClick={onEdit} aria-label={`Editar ${name}`}>
        Editar
      </button>
      <button
        type="button"
        className="data-action-btn data-action-btn-icon data-action-btn-danger"
        onClick={onDelete}
        title="Eliminar"
        aria-label={`Eliminar ${name}`}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// Tabla genérica para marcas y proveedores.
// columns: [{ header, render: (item) => nodo, muted? }]
export default function EntityTable({ items, columns, emptyText, canManage = true, onEdit, onDelete }) {
  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header}>{col.header}</th>
            ))}
            {canManage && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {columns.map((col) => (
                <td key={col.header} className={col.muted ? "data-cell-muted" : undefined}>
                  {col.render(item)}
                </td>
              ))}
              {canManage && (
                <td>
                  <RowActions name={item.name} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && <p className="data-empty">{emptyText}</p>}
    </>
  );
}
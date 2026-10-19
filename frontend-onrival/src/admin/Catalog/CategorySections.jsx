import { RowActions } from "./EntityTable";

const SECTION_ORDER = ["hombre", "mujer", "accesorios"];
const keyOf = (name) => String(name ?? "").trim().toLowerCase();
const rankOf = (name) => {
  const i = SECTION_ORDER.indexOf(keyOf(name));
  return i === -1 ? SECTION_ORDER.length : i;
};

// Aplana el árbol en orden: [{ node, depth, label: "Hombre › Camiseta" }, ...]
export const flattenTree = (nodes, trail = []) =>
  nodes.flatMap((node) => {
    const path = [...trail, node.name];
    return [
      { node, depth: trail.length, label: path.join(" › ") },
      ...flattenTree(node.subcategories ?? [], path),
    ];
  });

// Categorías divididas en secciones fijas (Hombre, Mujer, Accesorios...).
// Las secciones NO se editan ni se eliminan: solo se les agregan categorías.
// productCount(id) cuenta los productos de esa categoría y de sus descendientes.
export default function CategorySections({ tree, productCount, canManage = true, onAdd, onEdit, onDelete }) {
  const roots = [...tree].sort(
    (a, b) => rankOf(a.name) - rankOf(b.name) || a.name.localeCompare(b.name, "es")
  );

  if (roots.length === 0) {
    return (
      <div className="data-card">
        <p className="data-empty">No hay categorías registradas.</p>
      </div>
    );
  }

  return (
    <div className="cat-sections">
      {roots.map((root) => {
        const rows = flattenTree(root.subcategories ?? []);
        const total = productCount(root.id);

        return (
          <section key={root.id} className="data-card cat-section">
            <header className="cat-section-head">
              <div className="cat-section-title">
                <h3>{root.name}</h3>
                <span className="cat-section-count">
                  {rows.length} {rows.length === 1 ? "categoría" : "categorías"} · {total}{" "}
                  {total === 1 ? "producto" : "productos"}
                </span>
              </div>

              {canManage && (
                <div className="cat-section-actions">
                  <button type="button" className="cat-add-btn" onClick={() => onAdd(root.id)}>
                    + Nueva categoría
                  </button>
                </div>
              )}
            </header>

            {root.description && <p className="cat-section-desc">{root.description}</p>}

            {rows.length === 0 ? (
              <p className="cat-empty">Esta sección todavía no tiene categorías.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Productos</th>
                    {canManage && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ node, depth }) => (
                    <tr key={node.id}>
                      <td>
                        <span className="cat-name" style={{ paddingLeft: depth * 20 }}>
                          {depth > 0 && (
                            <span className="cat-branch" aria-hidden="true">
                              └
                            </span>
                          )}
                          <strong>{node.name}</strong>
                        </span>
                        {node.description && (
                          <div className="data-cell-muted" style={{ paddingLeft: depth * 20 }}>
                            {node.description}
                          </div>
                        )}
                      </td>
                      <td>{productCount(node.id)}</td>
                      {canManage && (
                        <td>
                          <RowActions name={node.name} onEdit={() => onEdit(node)} onDelete={() => onDelete(node)} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}
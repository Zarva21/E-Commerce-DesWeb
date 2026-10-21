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

const TagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </svg>
);

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
              <ul className="cat-tree">
                {rows.map(({ node, depth }) => {
                  const count = productCount(node.id);
                  return (
                    <li key={node.id} className="cat-row" style={{ paddingLeft: 18 + depth * 28 }}>
                      <div className="cat-row-main">
                        {depth > 0 && <span className="cat-elbow" aria-hidden="true" />}
                        <span className={`cat-node ${depth > 0 ? "cat-node-sub" : ""}`} aria-hidden="true">
                          <TagIcon />
                        </span>
                        <div className="cat-row-text">
                          <strong>{node.name}</strong>
                          {node.description && <span className="cat-row-desc">{node.description}</span>}
                        </div>
                      </div>

                      <div className="cat-row-side">
                        <span className={`cat-count ${count === 0 ? "cat-count-zero" : ""}`}>
                          {count} {count === 1 ? "producto" : "productos"}
                        </span>
                        {canManage && (
                          <RowActions name={node.name} onEdit={() => onEdit(node)} onDelete={() => onDelete(node)} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
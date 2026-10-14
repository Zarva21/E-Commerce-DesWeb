// Convierte la lista plana de categorías (con parent_category_id) en un árbol,
// con la misma forma que devuelve getTree() del backend:
//   [{ id, name, parent_category_id, subcategories: [...] }, ...]
// TODO: cuando esté conectada la API, el árbol viene directo de getTree()
// y esta función ya no hace falta.
export function buildCategoryTree(flat) {
  const byId = new Map(flat.map((c) => [String(c.id), { ...c, subcategories: [] }]));
  const roots = [];

  byId.forEach((node) => {
    const parent = node.parent_category_id != null ? byId.get(String(node.parent_category_id)) : null;
    if (parent) parent.subcategories.push(node);
    else roots.push(node);
  });

  return roots;
}

// Devuelve los nodos desde la raíz hasta la categoría pedida: [Hombre, Camiseta]
export function findCategoryPath(tree, id) {
  if (id === "" || id == null) return [];

  const walk = (nodes, trail) => {
    for (const node of nodes) {
      const next = [...trail, node];
      if (String(node.id) === String(id)) return next;
      const found = walk(node.subcategories ?? [], next);
      if (found) return found;
    }
    return null;
  };

  return walk(tree, []) ?? [];
}

export const categoryPathLabel = (tree, id) =>
  findCategoryPath(tree, id).map((n) => n.name).join(" › ");
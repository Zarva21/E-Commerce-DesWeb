import { normalize } from "../../utils/normalize";

// tree = respuesta de getTree(): [{ id, name, subcategories: [...] }, ...]
const flatten = (nodes) => nodes.flatMap((n) => [n, ...flatten(n.subcategories ?? [])]);

// Devuelve los nombres de categoría que se muestran en el filtro según la sección.
// Las raíces (Hombre, Mujer) no se listan: el género ya lo da la sección.
export function getCategoryOptions(tree, section) {
  if (!tree?.length) return null;

  const isGeneral = !section || section === "catalogo";
  const root = isGeneral ? null : tree.find((r) => normalize(r.name) === normalize(section));

  const children = root ? root.subcategories ?? [] : tree.flatMap((r) => r.subcategories ?? []);
  return [...new Set(flatten(children).map((n) => n.name))];
}
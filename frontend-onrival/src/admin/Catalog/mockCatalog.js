// Datos de prueba del admin, GENERADOS a partir de los productos de la tienda
// (components/Catalog/mockProducts), para que ambos lados muestren lo mismo.
// Estructura de categorías: raíces = secciones de la tienda (Hombre, Mujer, Accesorios)
// y sus hijas = la categoría de cada producto (Camiseta, Zapatos, ...).
// TODO: cuando haya backend, todo esto viene de la API y este archivo se elimina.
import { MOCK_PRODUCTS as STORE_PRODUCTS } from "../../components/Catalog/mockProducts";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Productos de la tienda sin repetir, recordando en qué sección están
const storeItems = [];
const seen = new Set();
Object.entries(STORE_PRODUCTS)
  .filter(([section]) => section !== "catalogo")
  .forEach(([section, list]) => {
    list.forEach((p) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      storeItems.push({ ...p, section });
    });
  });

// ---------- MARCAS ----------
const BRAND_DESCRIPTIONS = { Adidas: "Marca de ropa deportiva", Nike: "Just Do It" };
const brandNames = [...new Set(storeItems.map((p) => p.brand).filter(Boolean))];

export const MOCK_BRANDS = brandNames.map((name, i) => ({
  id: i + 1,
  name,
  description: BRAND_DESCRIPTIONS[name] ?? "",
  logo_url: "",
}));

// ---------- CATEGORÍAS (árbol de 2 niveles) ----------
const sections = [...new Set(storeItems.map((p) => p.section))];
const categoryIdByKey = new Map(); // "hombre|Camiseta" -> id
export const MOCK_CATEGORIES = [];

sections.forEach((section) => {
  MOCK_CATEGORIES.push({ id: MOCK_CATEGORIES.length + 1, name: capitalize(section), parent_category_id: null });
});

sections.forEach((section) => {
  const rootId = MOCK_CATEGORIES.find((c) => c.name === capitalize(section)).id;
  const names = [...new Set(storeItems.filter((p) => p.section === section).map((p) => p.category).filter(Boolean))];
  names.forEach((name) => {
    const id = MOCK_CATEGORIES.length + 1;
    MOCK_CATEGORIES.push({ id, name, parent_category_id: rootId });
    categoryIdByKey.set(`${section}|${name}`, id);
  });
});

// ---------- PROVEEDORES ----------
export const MOCK_SUPPLIERS = [
  { id: 1, name: "Distribuidora Deportiva S.A.", contact_email: "contacto@distdeportiva.com", phone: "+502 2222-3333" },
  { id: 2, name: "Importadora Global GT", contact_email: "ventas@importgt.com", phone: "+502 4444-5555" },
];

// ---------- PRODUCTOS ----------
// Si algún campo de tu mockProducts de la tienda se llama distinto, se ajusta SOLO acá.
const toAdminProduct = (p, i) => {
  const name = p.name ?? p.title ?? `Producto ${i + 1}`;
  const brand = MOCK_BRANDS.find((b) => b.name === p.brand) ?? null;
  const category_id = categoryIdByKey.get(`${p.section}|${p.category}`) ?? MOCK_CATEGORIES.find((c) => c.name === capitalize(p.section))?.id ?? null;
  const category = MOCK_CATEGORIES.find((c) => c.id === category_id) ?? null;
  const supplier = MOCK_SUPPLIERS[0];
  const img = p.image ?? p.img ?? p.images?.[0];
  const price = Number(p.price) || 0;

  return {
    id: i + 1,
    store_id: p.id, // id que usa la tienda (ProductDetail, destacados)
    public_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    name,
    description: p.description ?? "",
    cost_price: Math.round(price * 0.6 * 100) / 100, // PLACEHOLDER: costo estimado (60% del precio)
    sale_price: price,
    is_active: true,
    brand_id: brand?.id ?? null,
    category_id,
    supplier_id: supplier.id,
    brand: brand ? { id: brand.id, name: brand.name } : null,
    category: category ? { id: category.id, name: category.name } : null,
    supplier: { id: supplier.id, name: supplier.name },
    variants: Array.isArray(p.sizes)
      ? p.sizes.map((s, j) => ({
          id: (i + 1) * 100 + j,
          sku: `${String(p.id).toUpperCase()}-${String(s?.size ?? s)}`,
          color: p.color ?? "",
          size: String(s?.size ?? s),
          is_active: true,
        }))
      : [],
    images: typeof img === "string" && img
      ? [{ id: (i + 1) * 1000, image_url: img, alt_text: name, is_primary: true }]
      : [],
  };
};

export const MOCK_PRODUCTS = storeItems.map(toAdminProduct);
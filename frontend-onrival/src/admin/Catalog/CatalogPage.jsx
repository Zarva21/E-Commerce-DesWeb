import { useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import CategoryCascader from "./CategoryCascader";
import ProductImageField from "./ProductImageField";
import EntityTable from "./EntityTable";
import EntityModal from "./EntityModal";
import CategorySections, { flattenTree } from "./CategorySections";
import { TrashIcon } from "./Icons";
import { buildCategoryTree, categoryPathLabel, findCategoryPath } from "./categoryTree";
import {
  MOCK_PRODUCTS,
  MOCK_BRANDS,
  MOCK_CATEGORIES,
  MOCK_SUPPLIERS,
} from "./mockCatalog";
import "../ui/DataTable.css";
import "./CatalogPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const toId = (v) => (v === "" || v == null ? null : Number(v));
const str = (v) => String(v ?? "").trim();
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const nextId = (list) => list.reduce((max, x) => Math.max(max, Number(x.id) || 0), 0) + 1;
const nameTaken = (list, name, ignoreId) =>
  list.some((x) => !sameId(x.id, ignoreId) && str(x.name).toLowerCase() === name.toLowerCase());

// [id, ...ids de todos sus descendientes] (misma lógica que getDescendantIds del backend)
function getDescendantIds(list, rootId) {
  const out = [String(rootId)];
  const stack = [String(rootId)];
  while (stack.length) {
    const current = stack.pop();
    list.forEach((c) => {
      if (c.parent_category_id != null && String(c.parent_category_id) === current) {
        out.push(String(c.id));
        stack.push(String(c.id));
      }
    });
  }
  return out;
}

// Quita una categoría y sus descendientes del árbol (para el selector de "categoría padre")
const pruneTree = (nodes, id) =>
  nodes
    .filter((n) => !sameId(n.id, id))
    .map((n) => ({ ...n, subcategories: pruneTree(n.subcategories ?? [], id) }));

const ENTITY_LABELS = {
  brand: { newTitle: "Nueva Marca", editTitle: "Editar Marca", confirm: (n) => `¿Eliminar la marca "${n}"?` },
  category: { newTitle: "Nueva Categoría", editTitle: "Editar Categoría", confirm: (n) => `¿Eliminar la categoría "${n}"?` },
  supplier: { newTitle: "Nuevo Proveedor", editTitle: "Editar Proveedor", confirm: (n) => `¿Eliminar al proveedor "${n}"?` },
};

const EMPTY_PRODUCT_FORM = {
  name: "",
  description: "",
  cost_price: "",
  sale_price: "",
  brand_id: "",
  category_id: "",
  supplier_id: "",
  is_active: true,
  image: "", // URL o data URL de la imagen principal
};

const EMPTY_VARIANT_FORM = { sku: "", color: "", size: "", weight: "", barcode: "" };

// Imagen principal del producto (o la primera si ninguna está marcada)
const primaryImageOf = (product) => product.images.find((i) => i.is_primary) ?? product.images[0];

// Devuelve la lista de imágenes con la principal puesta/reemplazada por `url`.
// Si no hay url nueva, la lista queda igual. Las demás fotos no se tocan.
function withPrimaryImage(images, url, name) {
  if (!url) return images;
  const current = images.find((i) => i.is_primary) ?? images[0];
  if (current) {
    return images.map((i) => (i.id === current.id ? { ...i, image_url: url, is_primary: true } : i));
  }
  return [...images, { id: Date.now(), image_url: url, alt_text: name, is_primary: true }];
}

const VariantIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

// canCreate: crear productos. canToggle: activar/desactivar. canDelete: eliminar
// productos y variantes. canManageEntities: crear/editar/eliminar marcas, categorías
// y proveedores. Con todo en false (rol empleado) solo puede editar productos
// (datos, imagen y variantes) y ver las demás tablas.
export default function CatalogPage({
  canCreate = true,
  canToggle = true,
  canDelete = true,
  canManageEntities = true,
}) {
  const [activeTab, setActiveTab] = useState("products"); // 'products' | 'brands' | 'categories' | 'suppliers'

  // Estados de datos
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [brands, setBrands] = useState(MOCK_BRANDS);
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [suppliers, setSuppliers] = useState(MOCK_SUPPLIERS);

  // Árbol de categorías (menú en cascada y secciones).
  // TODO: con backend, esto viene de getTree() y ya no se arma acá.
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const categoryLabel = (id) => categoryPathLabel(categoryTree, id) || "Sin categoría";
  const brandName = useMemo(() => new Map(brands.map((b) => [String(b.id), b.name])), [brands]);

  // Cantidad de productos que usan cada marca / proveedor / categoría
  const countBy = (field, id) => products.filter((p) => sameId(p[field], id)).length;
  const productsInCategory = (id) => {
    const ids = getDescendantIds(categories, id);
    return products.filter((p) => ids.includes(String(p.category_id))).length;
  };

  // Sección (Hombre, Mujer, Accesorios) a la que pertenece una categoría existente
  // o a la que corresponde una nueva (el preset trae la categoría padre elegida).
  const sectionOf = (item, preset) => {
    const ref = item ? item.id : preset?.parent_category_id;
    return findCategoryPath(categoryTree, ref)[0] ?? null;
  };

  // Filtro
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de producto
  const [selectedProduct, setSelectedProduct] = useState(null); // null = producto nuevo
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);

  // Modal de variantes (se guarda solo el id: el producto se lee siempre actualizado)
  const [variantsProductId, setVariantsProductId] = useState(null);
  const editingVariantProduct = products.find((p) => p.id === variantsProductId) ?? null;
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT_FORM);
  const [editingVariantId, setEditingVariantId] = useState(null); // null = agregando una nueva
  const [variantError, setVariantError] = useState("");

  // Modal de marcas / categorías / proveedores: { type, item (null = nuevo), preset }
  const [entityModal, setEntityModal] = useState(null);
  const [entityError, setEntityError] = useState("");

  const changeTab = (tab) => {
    setActiveTab(tab);
    setEntityError("");
  };

  // ---------------- PRODUCTOS ----------------
  const handleToggleProductStatus = (id) => {
    if (!canToggle) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  const handleDeleteProduct = (item) => {
    if (!canDelete) return;
    if (!window.confirm(`¿Eliminar "${item.name}"? También se eliminarán sus variantes y fotos.`)) return;
    setProducts((prev) => prev.filter((p) => p.id !== item.id));
  };

  // Guardar nuevo producto o edición
  const handleSaveProduct = (e) => {
    e.preventDefault();

    const { image, ...fields } = productForm;
    const data = {
      ...fields,
      cost_price: Number(fields.cost_price),
      sale_price: Number(fields.sale_price),
      brand_id: toId(fields.brand_id),
      category_id: toId(fields.category_id),
      supplier_id: toId(fields.supplier_id),
    };

    if (selectedProduct) {
      // Editar: si se eligió una imagen nueva, reemplaza a la principal
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, ...data, images: withPrimaryImage(p.images, image, data.name) }
            : p
        )
      );
    } else {
      // Crear
      if (!canCreate) return;
      const newProd = {
        id: Date.now(),
        public_id: crypto.randomUUID(),
        ...data,
        variants: [],
        images: withPrimaryImage([], image, data.name),
      };
      setProducts([newProd, ...products]);
    }
    closeProductModal();
  };

  const openCreateModal = () => {
    if (!canCreate) return;
    setSelectedProduct(null);
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      brand_id: brands[0]?.id || "",
      supplier_id: suppliers[0]?.id || "",
    });
    setIsCreatingProduct(true);
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      brand_id: product.brand_id || "",
      category_id: product.category_id || "",
      supplier_id: product.supplier_id || "",
      is_active: product.is_active,
      image: primaryImageOf(product)?.image_url ?? "",
    });
    setIsCreatingProduct(true);
  };

  const closeProductModal = () => {
    setIsCreatingProduct(false);
    setSelectedProduct(null);
  };

  // ---------------- VARIANTES ----------------
  const resetVariantForm = () => {
    setEditingVariantId(null);
    setVariantForm(EMPTY_VARIANT_FORM);
    setVariantError("");
  };

  const openVariantsModal = (product) => {
    resetVariantForm();
    setVariantsProductId(product.id);
  };

  const closeVariantsModal = () => {
    resetVariantForm();
    setVariantsProductId(null);
  };

  const startEditVariant = (v) => {
    setEditingVariantId(v.id);
    setVariantForm({
      sku: v.sku ?? "",
      color: v.color ?? "",
      size: v.size ?? "",
      weight: v.weight ?? "",
      barcode: v.barcode ?? "",
    });
    setVariantError("");
  };

  const handleDeleteVariant = (v) => {
    if (!canDelete) return;
    if (!window.confirm(`¿Eliminar la variante "${v.sku}"?`)) return;

    setProducts((prev) =>
      prev.map((p) =>
        p.id === variantsProductId ? { ...p, variants: p.variants.filter((x) => x.id !== v.id) } : p
      )
    );
    // Si justo se estaba editando esa variante, el formulario vuelve a "nueva variante"
    if (editingVariantId === v.id) resetVariantForm();
  };

  const setVariantField = (name, value) => {
    setVariantForm((f) => ({ ...f, [name]: value }));
    setVariantError("");
  };

  // Agregar variante nueva o guardar los cambios de una existente
  const handleSaveVariant = (e) => {
    e.preventDefault();

    const sku = variantForm.sku.trim();
    if (!sku) return;

    // El SKU no se puede repetir en ningún producto (la API responde 409)
    const duplicated = products.some((p) =>
      p.variants.some(
        (v) => String(v.sku ?? "").trim().toLowerCase() === sku.toLowerCase() && v.id !== editingVariantId
      )
    );
    if (duplicated) {
      setVariantError(`El SKU "${sku}" ya está en uso.`);
      return;
    }

    let weight = null;
    if (String(variantForm.weight).trim() !== "") {
      weight = Number(variantForm.weight);
      if (Number.isNaN(weight) || weight < 0) {
        setVariantError("El peso debe ser un número mayor o igual a 0.");
        return;
      }
    }

    const data = {
      sku,
      size: variantForm.size.trim(),
      color: variantForm.color.trim(),
      weight,
      barcode: variantForm.barcode.trim(),
    };

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== variantsProductId) return p;
        if (editingVariantId != null) {
          return {
            ...p,
            variants: p.variants.map((v) => (v.id === editingVariantId ? { ...v, ...data } : v)),
          };
        }
        return { ...p, variants: [...p.variants, { id: Date.now(), ...data, is_active: true }] };
      })
    );

    resetVariantForm();
  };

  // ---------------- MARCAS / CATEGORÍAS / PROVEEDORES ----------------
  // Cada guardado devuelve { ok } o { error } (mismas reglas que el backend).
  // TODO: con backend, cada uno se convierte en una llamada a la API.
  const saveBrand = (form, id) => {
    const name = str(form.name);
    if (!name) return { error: "El nombre de la marca es obligatorio." };

    const current = id != null ? brands.find((b) => sameId(b.id, id)) : null;
    // Como el backend: el nombre solo se revisa si es nuevo o cambió
    if ((!current || name !== current.name) && nameTaken(brands, name, id)) {
      return { error: `Ya existe una marca con el nombre "${name}".` };
    }

    // Al editar se conservan los demás datos de la marca (por ejemplo logo_url si ya tenía)
    const data = { name, description: str(form.description) };
    setBrands((prev) =>
      current
        ? prev.map((b) => (sameId(b.id, id) ? { ...b, ...data } : b))
        : [...prev, { id: nextId(prev), ...data }]
    );
    return { ok: true };
  };

  const saveCategory = (form, id) => {
    const name = str(form.name);
    if (!name) return { error: "El nombre de la categoría es obligatorio." };

    const current = id != null ? categories.find((c) => sameId(c.id, id)) : null;
    if ((!current || name !== current.name) && nameTaken(categories, name, id)) {
      return { error: `Ya existe una categoría llamada "${name}".` };
    }

    // Las secciones principales (Hombre, Mujer, Accesorios) son fijas:
    // toda categoría tiene que colgar de una.
    const parent = toId(form.parent_category_id);
    if (parent === null) return { error: "Seleccioná la categoría padre." };
    if (!categories.some((c) => sameId(c.id, parent))) {
      return { error: "La categoría padre indicada no existe." };
    }
    if (current) {
      if (sameId(parent, id)) return { error: "Una categoría no puede ser padre de sí misma." };
      // Evita ciclos: no se puede mover "Hombre" dentro de su propia hija
      if (getDescendantIds(categories, id).includes(String(parent))) {
        return { error: "No puedes mover una categoría dentro de una de sus descendientes." };
      }
    }

    const data = { name, description: str(form.description), parent_category_id: parent };
    setCategories((prev) =>
      current
        ? prev.map((c) => (sameId(c.id, id) ? { ...c, ...data } : c))
        : [...prev, { id: nextId(prev), ...data }]
    );
    return { ok: true };
  };

  const saveSupplier = (form, id) => {
    const name = str(form.name);
    if (!name) return { error: "El nombre del proveedor es obligatorio." };

    const data = { name, contact_email: str(form.contact_email), phone: str(form.phone) };
    const current = id != null ? suppliers.find((s) => sameId(s.id, id)) : null;
    setSuppliers((prev) =>
      current
        ? prev.map((s) => (sameId(s.id, id) ? { ...s, ...data } : s))
        : [...prev, { id: nextId(prev), ...data }]
    );
    return { ok: true };
  };

  const openEntityModal = (type, item = null, preset = {}) => {
    if (!canManageEntities) return;
    setEntityError("");
    setEntityModal({ type, item, preset });
  };

  const handleSaveEntity = (form) => {
    const { type, item } = entityModal;
    const id = item?.id ?? null;
    if (type === "brand") return saveBrand(form, id);
    if (type === "category") return saveCategory(form, id);
    return saveSupplier(form, id);
  };

  const handleDeleteEntity = (type, item) => {
    if (!canManageEntities) return;

    // Primero se revisan las reglas (igual que el backend); después se pide confirmación
    let error = "";
    if (type === "brand") {
      const n = countBy("brand_id", item.id);
      if (n > 0) error = `No se puede eliminar: la marca tiene ${n} producto(s) asociado(s).`;
    } else if (type === "supplier") {
      const n = countBy("supplier_id", item.id);
      if (n > 0) error = `No se puede eliminar: el proveedor tiene ${n} producto(s) asociado(s).`;
    } else {
      const children = categories.filter((c) => sameId(c.parent_category_id, item.id)).length;
      const n = countBy("category_id", item.id);
      if (children > 0) error = `No se puede eliminar: la categoría tiene ${children} subcategoría(s).`;
      else if (n > 0) error = `No se puede eliminar: la categoría tiene ${n} producto(s).`;
    }

    if (error) {
      setEntityError(error);
      return;
    }
    if (!window.confirm(ENTITY_LABELS[type].confirm(item.name))) return;

    setEntityError("");
    if (type === "brand") setBrands((prev) => prev.filter((b) => !sameId(b.id, item.id)));
    else if (type === "supplier") setSuppliers((prev) => prev.filter((s) => !sameId(s.id, item.id)));
    else setCategories((prev) => prev.filter((c) => !sameId(c.id, item.id)));
  };

  // Campos del formulario según el tipo
  const entityFields = (type, item, preset) => {
    if (type === "brand") {
      return [
        { name: "name", label: "Nombre *", required: true, placeholder: "Ej: Adidas" },
        { name: "description", label: "Descripción", type: "textarea", placeholder: "Opcional" },
      ];
    }
    if (type === "supplier") {
      return [
        { name: "name", label: "Nombre del proveedor *", required: true, placeholder: "Ej: Distribuidora Deportiva S.A." },
        { name: "contact_email", label: "Correo electrónico", type: "email", placeholder: "contacto@proveedor.com" },
        { name: "phone", label: "Teléfono", type: "tel", placeholder: "+502 0000-0000" },
      ];
    }

    // Categoría: el padre solo puede ser de la MISMA sección (Hombre, Mujer, Accesorios):
    // la sección misma o cualquiera de sus categorías, menos ella misma y sus descendientes.
    const section = sectionOf(item, preset);
    const parentOptions = section
      ? [
          { value: section.id, label: section.name },
          ...flattenTree(pruneTree(section.subcategories ?? [], item?.id), [section.name]).map((r) => ({
            value: r.node.id,
            label: r.label,
          })),
        ]
      : flattenTree(pruneTree(categoryTree, item?.id)).map((r) => ({ value: r.node.id, label: r.label }));

    return [
      { name: "name", label: "Nombre *", required: true, placeholder: "Ej: Zapatillas" },
      { name: "description", label: "Descripción", type: "textarea", placeholder: "Opcional" },
      {
        name: "parent_category_id",
        label: "Categoría padre *",
        type: "select",
        required: true,
        options: [{ value: "", label: "Seleccione categoría padre..." }, ...parentOptions],
        hint: section ? `Solo se muestran las opciones de ${section.name}.` : undefined,
      },
    ];
  };

  const entityFormFields = entityModal
    ? entityFields(entityModal.type, entityModal.item, entityModal.preset)
    : [];
  const entityInitial = entityModal
    ? Object.fromEntries(
        entityFormFields.map((f) => [
          f.name,
          entityModal.item?.[f.name] ?? entityModal.preset?.[f.name] ?? "",
        ])
      )
    : {};

  // Título del pop up: en categorías incluye la sección ("Nueva Categoría en Mujer")
  const entityModalTitle = (() => {
    if (!entityModal) return "";
    const labels = ENTITY_LABELS[entityModal.type];
    if (entityModal.type === "category") {
      const section = sectionOf(entityModal.item, entityModal.preset);
      if (section) {
        return entityModal.item
          ? `${labels.editTitle} · ${section.name}`
          : `${labels.newTitle} en ${section.name}`;
      }
    }
    return entityModal.item ? labels.editTitle : labels.newTitle;
  })();

  // Botón de arriba a la derecha según la pestaña.
  // Categorías no tiene: se agregan desde el botón de cada sección (Hombre, Mujer, Accesorios).
  const headerActions = {
    products: canCreate ? { label: "Nuevo Producto", run: openCreateModal } : null,
    brands: canManageEntities ? { label: "Nueva Marca", run: () => openEntityModal("brand") } : null,
    categories: null,
    suppliers: canManageEntities ? { label: "Nuevo Proveedor", run: () => openEntityModal("supplier") } : null,
  };
  const headerAction = headerActions[activeTab];

  const q = searchQuery.toLowerCase();
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (brandName.get(String(p.brand_id)) ?? "").toLowerCase().includes(q)
  );

  const entityErrorBox = entityError ? <div className="catalog-error">{entityError}</div> : null;

  return (
    <div className="catalog-page">
      <PageHeader
        title="Catálogo de Productos"
        subtitle="Administra publicaciones, precios, marcas, categorías y proveedores"
        actionLabel={headerAction?.label ?? null}
        onAction={headerAction?.run ?? null}
      />

      {/* Tabs Principales */}
      <div className="catalog-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
          onClick={() => changeTab("products")}
        >
          Productos ({products.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "brands" ? "active" : ""}`}
          onClick={() => changeTab("brands")}
        >
          Marcas ({brands.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => changeTab("categories")}
        >
          Categorías ({categories.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "suppliers" ? "active" : ""}`}
          onClick={() => changeTab("suppliers")}
        >
          Proveedores ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: PRODUCTOS */}
      {activeTab === "products" && (
        <div className="data-card">
          <div className="catalog-filter-bar">
            <input
              type="text"
              placeholder="Buscar por nombre o marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="catalog-search-input"
            />
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca / Cat.</th>
                <th>P. Costo</th>
                <th>P. Venta</th>
                <th>Variantes</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => {
                const variantCount = item.variants.length;
                const variantSizes = item.variants.map((v) => v.size).filter(Boolean).join(", ");

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="data-cell-main">
                        <div className="data-cell-thumb">
                          <img
                            src={primaryImageOf(item)?.image_url || "/img/placeholder.png"}
                            alt={item.name}
                          />
                        </div>
                        <div>
                          <span className="data-cell-title">{item.name}</span>
                          <div className="data-cell-muted">ID: {item.public_id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{brandName.get(String(item.brand_id)) || "Sin marca"}</div>
                      <span className="data-cell-muted">{categoryLabel(item.category_id)}</span>
                    </td>
                    <td>{formatPrice(item.cost_price)}</td>
                    <td><strong>{formatPrice(item.sale_price)}</strong></td>
                    <td>
                      <button
                        type="button"
                        className={`variant-btn ${variantCount === 0 ? "variant-btn-empty" : ""}`}
                        onClick={() => openVariantsModal(item)}
                        title={
                          variantCount === 0
                            ? "Este producto aún no tiene variantes"
                            : `Tallas: ${variantSizes || "sin talla definida"}`
                        }
                        aria-label={`Gestionar variantes de ${item.name}`}
                      >
                        {variantCount === 0 ? <PlusIcon /> : <VariantIcon />}
                        <span>
                          {variantCount === 0
                            ? "Agregar"
                            : `${variantCount} ${variantCount === 1 ? "variante" : "variantes"}`}
                        </span>
                      </button>
                    </td>
                    <td>
                      <StatusBadge
                        label={item.is_active ? "Activo" : "Inactivo"}
                        tone={item.is_active ? "success" : "muted"}
                      />
                    </td>
                    <td>
                      <div className="data-actions">
                        <button
                          type="button"
                          className="data-action-btn"
                          onClick={() => openEditModal(item)}
                        >
                          Editar
                        </button>
                        {canToggle && (
                          <button
                            type="button"
                            className="data-action-btn"
                            onClick={() => handleToggleProductStatus(item.id)}
                          >
                            {item.is_active ? "Desactivar" : "Activar"}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="data-action-btn data-action-btn-icon data-action-btn-danger"
                            onClick={() => handleDeleteProduct(item)}
                            title="Eliminar producto"
                            aria-label={`Eliminar ${item.name}`}
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

          {filteredProducts.length === 0 && (
            <p className="data-empty">No se encontraron productos en el catálogo.</p>
          )}
        </div>
      )}

      {/* TAB 2: MARCAS */}
      {activeTab === "brands" && (
        <div className="data-card">
          {entityErrorBox}
          <EntityTable
            items={brands}
            emptyText="No hay marcas registradas."
            canManage={canManageEntities}
            columns={[
              { header: "ID", render: (b) => `#${b.id}` },
              { header: "Nombre", render: (b) => <strong>{b.name}</strong> },
              { header: "Descripción", muted: true, render: (b) => b.description || "-" },
              { header: "Productos", render: (b) => countBy("brand_id", b.id) },
            ]}
            onEdit={(b) => openEntityModal("brand", b)}
            onDelete={(b) => handleDeleteEntity("brand", b)}
          />
        </div>
      )}

      {/* TAB 3: CATEGORÍAS (secciones fijas: Hombre, Mujer, Accesorios) */}
      {activeTab === "categories" && (
        <>
          {entityErrorBox}
          <CategorySections
            tree={categoryTree}
            productCount={productsInCategory}
            canManage={canManageEntities}
            onAdd={(parentId) => openEntityModal("category", null, { parent_category_id: parentId })}
            onEdit={(c) => openEntityModal("category", c)}
            onDelete={(c) => handleDeleteEntity("category", c)}
          />
        </>
      )}

      {/* TAB 4: PROVEEDORES */}
      {activeTab === "suppliers" && (
        <div className="data-card">
          {entityErrorBox}
          <EntityTable
            items={suppliers}
            emptyText="No hay proveedores registrados."
            canManage={canManageEntities}
            columns={[
              { header: "ID", render: (s) => `#${s.id}` },
              { header: "Nombre Proveedor", render: (s) => <strong>{s.name}</strong> },
              { header: "Correo Electrónico", render: (s) => s.contact_email || "-" },
              { header: "Teléfono", render: (s) => s.phone || "-" },
              { header: "Productos", render: (s) => countBy("supplier_id", s.id) },
            ]}
            onEdit={(s) => openEntityModal("supplier", s)}
            onDelete={(s) => handleDeleteEntity("supplier", s)}
          />
        </div>
      )}

      {/* MODAL MARCA / CATEGORÍA / PROVEEDOR */}
      {entityModal && (
        <EntityModal
          key={`${entityModal.type}-${entityModal.item?.id ?? "new"}-${entityModal.preset?.parent_category_id ?? ""}`}
          title={entityModalTitle}
          fields={entityFormFields}
          initial={entityInitial}
          onSave={handleSaveEntity}
          onClose={() => setEntityModal(null)}
        />
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {isCreatingProduct && (
        <div className="catalog-modal-overlay" onClick={closeProductModal}>
          <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>{selectedProduct ? "Editar Producto" : "Nuevo Producto en Catálogo"}</h2>
              <button type="button" className="close-btn" onClick={closeProductModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="catalog-form">
              <div className="form-group">
                <label>Imagen del producto</label>
                <ProductImageField
                  value={productForm.image}
                  onChange={(image) => setProductForm((f) => ({ ...f, image }))}
                />
              </div>

              <div className="form-group">
                <label>Nombre del Producto *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio Costo (GTQ) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Precio Venta (GTQ) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.sale_price}
                    onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Marca</label>
                  <select
                    value={productForm.brand_id}
                    onChange={(e) => setProductForm({ ...productForm, brand_id: e.target.value })}
                  >
                    <option value="">Seleccione marca...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Proveedor</label>
                  <select
                    value={productForm.supplier_id}
                    onChange={(e) => setProductForm({ ...productForm, supplier_id: e.target.value })}
                  >
                    <option value="">Seleccione proveedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <CategoryCascader
                  tree={categoryTree}
                  value={productForm.category_id}
                  onChange={(id) => setProductForm({ ...productForm, category_id: id })}
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  rows="3"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeProductModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTIÓN DE VARIANTES Y SKUs */}
      {editingVariantProduct && (
        <div className="catalog-modal-overlay" onClick={closeVariantsModal}>
          <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>Variantes y SKUs: {editingVariantProduct.name}</h2>
              <button type="button" className="close-btn" onClick={closeVariantsModal}>
                ✕
              </button>
            </div>

            <div className="variant-list">
              <div className="variant-list-head">
                <h4>SKUs existentes</h4>
                <span className="variant-count">{editingVariantProduct.variants.length}</span>
              </div>

              {editingVariantProduct.variants.length === 0 ? (
                <p className="variant-empty">Este producto aún no tiene variantes. Agregá la primera abajo.</p>
              ) : (
                <ul className="variant-cards">
                  {editingVariantProduct.variants.map((v) => {
                    const hasWeight = v.weight != null && v.weight !== "";
                    return (
                      <li
                        key={v.id}
                        className={`variant-card ${v.id === editingVariantId ? "variant-card-active" : ""}`}
                      >
                        <div className="variant-card-main">
                          <span className="variant-card-sku">{v.sku}</span>
                          <div className="variant-card-tags">
                            <span className={`variant-tag ${v.size ? "" : "variant-tag-empty"}`}>
                              <b>Talla</b> {v.size || "—"}
                            </span>
                            <span className={`variant-tag ${v.color ? "" : "variant-tag-empty"}`}>
                              <b>Color</b> {v.color || "—"}
                            </span>
                            <span className={`variant-tag ${hasWeight ? "" : "variant-tag-empty"}`}>
                              <b>Peso</b> {hasWeight ? `${v.weight} kg` : "—"}
                            </span>
                          </div>
                        </div>

                        <div className="variant-card-actions">
                          <button
                            type="button"
                            className="variant-edit-btn"
                            onClick={() => startEditVariant(v)}
                            aria-label={`Editar la variante ${v.sku}`}
                          >
                            <PencilIcon />
                            Editar
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              className="variant-icon-btn variant-icon-btn-danger"
                              onClick={() => handleDeleteVariant(v)}
                              title="Eliminar variante"
                              aria-label={`Eliminar la variante ${v.sku}`}
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <form onSubmit={handleSaveVariant} className="catalog-form variant-form">
              <div className="variant-form-head">
                <h4>{editingVariantId != null ? "Editar variante" : "Agregar Nueva Variante"}</h4>
                {editingVariantId != null && (
                  <button type="button" className="link-btn" onClick={resetVariantForm}>
                    Cancelar edición
                  </button>
                )}
              </div>

              {variantError && <div className="catalog-error">{variantError}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    placeholder="Ej: ADI-F50-43"
                    value={variantForm.sku}
                    onChange={(e) => setVariantField("sku", e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Talla / Dimensión</label>
                  <input
                    type="text"
                    placeholder="Ej: 43 o M"
                    value={variantForm.size}
                    onChange={(e) => setVariantField("size", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="text"
                    placeholder="Ej: Rojo"
                    value={variantForm.color}
                    onChange={(e) => setVariantField("color", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ej: 0.45"
                    value={variantForm.weight}
                    onChange={(e) => setVariantField("weight", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Código de Barras</label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={variantForm.barcode}
                  onChange={(e) => setVariantField("barcode", e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary">
                {editingVariantId != null ? "Guardar cambios" : "Añadir Variante"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
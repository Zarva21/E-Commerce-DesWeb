import { useEffect, useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import CategoryCascader from "./CategoryCascader";
import EntityTable from "./EntityTable";
import EntityModal from "./EntityModal";
import CategorySections, { flattenTree } from "./CategorySections";
import { TrashIcon } from "./Icons";
import { buildCategoryTree, categoryPathLabel, findCategoryPath } from "./categoryTree";
import { catalogService } from "../../services/catalogService";
import { mediaService } from "../../services/mediaService";
import "../ui/DataTable.css";
import "./CatalogPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value || 0);

const toId = (v) => (v === "" || v == null ? null : Number(v));
const str = (v) => String(v ?? "").trim();
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

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
};

const EMPTY_VARIANT_FORM = { sku: "", color: "", size: "", weight: "", barcode: "" };

const VariantIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export default function CatalogPage({
  canCreate = true,
  canToggle = true,
  canDelete = true,
  canManageEntities = true,
}) {
  const [activeTab, setActiveTab] = useState("products");

  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  // Modales Producto
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Manejo de hasta 5 fotos en S3
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  // Modal de variantes
  const [variantsProductId, setVariantsProductId] = useState(null);
  const editingVariantProduct = products.find((p) => p.id === variantsProductId) ?? null;
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT_FORM);
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [variantError, setVariantError] = useState("");

  // Modal de marcas / categorías / proveedores
  const [entityModal, setEntityModal] = useState(null);
  const [entityError, setEntityError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, brs, cats, sups] = await Promise.all([
        catalogService.getAdminProducts(),
        catalogService.getBrands(),
        catalogService.getCategories(),
        catalogService.getSuppliers(),
      ]);

      setProducts(prods || []);
      setBrands(brs || []);
      setCategories(cats || []);
      setSuppliers(sups || []);
    } catch (err) {
      console.error("Error al cargar datos del catálogo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const categoryLabel = (id) => categoryPathLabel(categoryTree, id) || "Sin categoría";
  const brandName = useMemo(() => new Map(brands.map((b) => [String(b.id), b.name])), [brands]);

  const countBy = (field, id) => products.filter((p) => sameId(p[field], id)).length;
  const productsInCategory = (id) => {
    const ids = getDescendantIds(categories, id);
    return products.filter((p) => ids.includes(String(p.category_id))).length;
  };

  const sectionOf = (item, preset) => {
    const ref = item ? item.id : preset?.parent_category_id;
    return findCategoryPath(categoryTree, ref)[0] ?? null;
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setEntityError("");
  };

  // ---------------- GESTIÓN DE FOTOGRAFÍAS (HASTA 5) ----------------
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const totalCurrent = existingImages.length + selectedFiles.length;
    if (totalCurrent + files.length > 5) {
      alert(`Solo puedes tener un máximo de 5 fotos. Actualmente ya tienes ${totalCurrent}.`);
      return;
    }

    const newFiles = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeNewFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const removeExistingImage = async (imageId) => {
    if (!window.confirm("¿Deseas eliminar esta fotografía del producto?")) return;
    try {
      if (mediaService.deleteProductImage) {
        await mediaService.deleteProductImage(imageId);
      }
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      alert("Error al eliminar la imagen: " + (err.message || ""));
    }
  };

  // ---------------- PRODUCTOS ----------------
  const handleToggleProductStatus = async (id) => {
    if (!canToggle) return;
    try {
      await catalogService.toggleProductStatus(id);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
      );
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo actualizar el estado del producto.");
    }
  };

  const handleDeleteProduct = async (item) => {
    if (!canDelete) return;
    if (!window.confirm(`¿Eliminar "${item.name}"? También se eliminarán sus variantes y fotos asociadas.`)) {
      return;
    }

    try {
      await catalogService.deleteProduct(item.id);
      setProducts((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo eliminar el producto de la base de datos.");
    }
  };

  const openCreateModal = () => {
    if (!canCreate) return;
    setSelectedProduct(null);
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      brand_id: brands[0]?.id || "",
      supplier_id: suppliers[0]?.id || "",
    });
    setSelectedFiles([]);
    setExistingImages([]);
    setModalError("");
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
    });
    setSelectedFiles([]);
    setExistingImages(product.images || []);
    setModalError("");
    setIsCreatingProduct(true);
  };

  const closeProductModal = () => {
    setIsCreatingProduct(false);
    setSelectedProduct(null);
    setSelectedFiles([]);
    setExistingImages([]);
    setModalError("");
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setModalError("");

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      cost_price: Number(productForm.cost_price),
      sale_price: Number(productForm.sale_price),
      brand_id: toId(productForm.brand_id),
      category_id: toId(productForm.category_id),
      supplier_id: toId(productForm.supplier_id),
      is_active: productForm.is_active,
    };

    if (payload.sale_price <= 0) {
      setModalError("El precio de venta debe ser mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      let savedProduct;
      if (selectedProduct) {
        savedProduct = await catalogService.updateProduct(selectedProduct.id, payload);
      } else {
        savedProduct = await catalogService.createProduct(payload);
      }

      const targetId = savedProduct?.id || selectedProduct?.id;

      if (selectedFiles.length > 0 && targetId) {
        const rawFiles = selectedFiles.map((item) => item.file);
        const shouldSetPrimary = existingImages.length === 0;
        await mediaService.uploadProductImages(targetId, rawFiles, shouldSetPrimary);
      }

      await loadData();
      closeProductModal();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || "Error al procesar el producto.");
    } finally {
      setSubmitting(false);
    }
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

  const handleDeleteVariant = async (v) => {
    if (!canDelete) return;
    if (!window.confirm(`¿Eliminar la variante "${v.sku}"?`)) return;

    try {
      if (catalogService.deleteVariant) {
        await catalogService.deleteVariant(variantsProductId, v.id);
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === variantsProductId
            ? { ...p, variants: p.variants.filter((x) => x.id !== v.id) }
            : p
        )
      );
      if (editingVariantId === v.id) resetVariantForm();
    } catch (err) {
      setVariantError(err.response?.data?.message || "No se pudo eliminar la variante de la base de datos.");
    }
  };

  const setVariantField = (name, value) => {
    setVariantForm((f) => ({ ...f, [name]: value }));
    setVariantError("");
  };

  const handleSaveVariant = async (e) => {
    e.preventDefault();
    const sku = variantForm.sku.trim();
    if (!sku) return;

    const duplicated = products.some((p) =>
      p.variants?.some(
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
      sku: sku.toUpperCase(),
      size: variantForm.size.trim() || null,
      color: variantForm.color.trim() || null,
      weight,
      barcode: variantForm.barcode.trim() || null,
    };

    try {
      if (editingVariantId == null) {
        const newVar = await catalogService.addVariant(editingVariantProduct.id, data);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingVariantProduct.id
              ? { ...p, variants: [...(p.variants || []), newVar] }
              : p
          )
        );
      } else {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === variantsProductId
              ? { ...p, variants: p.variants.map((v) => (v.id === editingVariantId ? { ...v, ...data } : v)) }
              : p
          )
        );
      }
      resetVariantForm();
    } catch (err) {
      setVariantError(err.response?.data?.message || "Error al procesar la variante.");
    }
  };

  // ---------------- MARCAS / CATEGORÍAS / PROVEEDORES (PERSISTENCIA REAL EN BD) ----------------
  const openEntityModal = (type, item = null, preset = {}) => {
    if (!canManageEntities) return;
    setEntityError("");
    setEntityModal({ type, item, preset });
  };

  const handleSaveEntity = async (form) => {
    const { type, item } = entityModal;
    const id = item?.id ?? null;

    try {
      if (type === "brand") {
        const payload = { name: form.name.trim(), description: form.description?.trim() };
        if (id) {
          await catalogService.updateBrand(id, payload);
        } else {
          await catalogService.createBrand(payload);
        }
      } else if (type === "category") {
        const payload = {
          name: form.name.trim(),
          description: form.description?.trim(),
          parent_category_id: toId(form.parent_category_id),
        };
        if (id) {
          await catalogService.updateCategory(id, payload);
        } else {
          await catalogService.createCategory(payload);
        }
      } else if (type === "supplier") {
        const payload = {
          name: form.name.trim(),
          contact_email: form.contact_email?.trim(),
          phone: form.phone?.trim(),
        };
        if (id) {
          await catalogService.updateSupplier(id, payload);
        } else {
          await catalogService.createSupplier(payload);
        }
      }

      await loadData();
      return { ok: true };
    } catch (err) {
      return { error: err.response?.data?.message || err.message || "Error al guardar los cambios en la base de datos." };
    }
  };

  const handleDeleteEntity = async (type, item) => {
    if (!canManageEntities) return;

    if (!window.confirm(ENTITY_LABELS[type].confirm(item.name))) return;

    setEntityError("");
    try {
      if (type === "brand") {
        await catalogService.deleteBrand(item.id);
        setBrands((prev) => prev.filter((b) => !sameId(b.id, item.id)));
      } else if (type === "category") {
        await catalogService.deleteCategory(item.id);
        setCategories((prev) => prev.filter((c) => !sameId(c.id, item.id)));
      } else if (type === "supplier") {
        await catalogService.deleteSupplier(item.id);
        setSuppliers((prev) => prev.filter((s) => !sameId(s.id, item.id)));
      }
    } catch (err) {
      setEntityError(err.response?.data?.message || "No se pudo eliminar el elemento.");
    }
  };

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
      p.name?.toLowerCase().includes(q) ||
      p.brand?.name?.toLowerCase().includes(q) ||
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

      {loading ? (
        <div className="data-card">
          <p className="data-empty">Cargando catálogo desde la base de datos...</p>
        </div>
      ) : (
        <>
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
                    const variantList = item.variants || [];
                    const variantCount = variantList.length;
                    const variantSizes = variantList.map((v) => v.size).filter(Boolean).join(", ");
                    const primaryImg =
                      item.images?.find((i) => i.is_primary)?.image_url ||
                      item.images?.[0]?.image_url ||
                      "/img/placeholder.png";

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="data-cell-main">
                            <div className="data-cell-thumb">
                              <img src={primaryImg} alt={item.name} />
                            </div>
                            <div>
                              <span className="data-cell-title">{item.name}</span>
                              <div className="data-cell-muted">
                                ID: {item.public_id ? item.public_id.slice(0, 8) + "..." : `#${item.id}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{item.brand?.name || brandName.get(String(item.brand_id)) || "Sin marca"}</div>
                          <span className="data-cell-muted">{categoryLabel(item.category_id)}</span>
                        </td>
                        <td>{formatPrice(item.cost_price || 0)}</td>
                        <td><strong>{formatPrice(item.sale_price)}</strong></td>
                        <td>
                          <button
                            type="button"
                            className={`variant-btn ${variantCount === 0 ? "variant-btn-empty" : ""}`}
                            onClick={() => openVariantsModal(item)}
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
                <p className="data-empty">No hay productos en la base de datos.</p>
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

          {/* TAB 3: CATEGORÍAS */}
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
        </>
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO CON SOPORTE HASTA 5 FOTOS */}
      {isCreatingProduct && (
        <div className="catalog-modal-overlay" onClick={closeProductModal}>
          <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>{selectedProduct ? "Editar Producto" : "Nuevo Producto en Catálogo"}</h2>
              <button type="button" className="close-btn" onClick={closeProductModal}>
                ✕
              </button>
            </div>

            {modalError && <div className="modal-error-banner">{modalError}</div>}

            <form onSubmit={handleSaveProduct} className="catalog-form">
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

              {/* SECCIÓN DE GESTIÓN Y SUBIDA DE IMÁGENES A S3 */}
              <div className="form-group" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontWeight: 600 }}>Fotografías del Producto (AWS S3)</label>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    {existingImages.length + selectedFiles.length} de 5 permitidas
                  </span>
                </div>

                {existingImages.length + selectedFiles.length < 5 && (
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    multiple
                    onChange={handleImageChange}
                    style={{ marginTop: "0.5rem" }}
                  />
                )}

                <small className="data-cell-muted" style={{ display: "block", marginTop: "4px" }}>
                  La primera imagen marcada será la portada principal del producto en la tienda.
                </small>

                {/* Galería de imágenes (Guardadas en S3 + Nuevas por subir) */}
                <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
                  {/* Imágenes ya guardadas */}
                  {existingImages.map((img, idx) => (
                    <div
                      key={`saved-${img.id || idx}`}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: img.is_primary ? "2px solid #2563eb" : "1px solid #cbd5e1",
                        position: "relative",
                        background: "#f8fafc",
                      }}
                    >
                      <img src={img.image_url} alt="Producto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      {img.is_primary && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: "#2563eb",
                            color: "#fff",
                            fontSize: "10px",
                            textAlign: "center",
                          }}
                        >
                          Portada
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img.id)}
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          background: "rgba(220, 38, 38, 0.85)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: "20px",
                          height: "20px",
                          cursor: "pointer",
                          fontSize: "11px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Eliminar foto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Nuevas fotos locales seleccionadas */}
                  {selectedFiles.map((item, idx) => {
                    const isFirstNewAndNoSaved = existingImages.length === 0 && idx === 0;
                    return (
                      <div
                        key={`new-${idx}`}
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: isFirstNewAndNoSaved ? "2px solid #2563eb" : "1px dashed #3b82f6",
                          position: "relative",
                          background: "#eff6ff",
                        }}
                      >
                        <img src={item.preview} alt="Nueva foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {isFirstNewAndNoSaved && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: "#2563eb",
                              color: "#fff",
                              fontSize: "10px",
                              textAlign: "center",
                            }}
                          >
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeNewFile(idx)}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            background: "rgba(220, 38, 38, 0.85)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "20px",
                            height: "20px",
                            cursor: "pointer",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Quitar foto"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" disabled={submitting} onClick={closeProductModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VARIANTES */}
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
                <span className="variant-count">{editingVariantProduct.variants?.length || 0}</span>
              </div>

              {(!editingVariantProduct.variants || editingVariantProduct.variants.length === 0) ? (
                <p className="variant-empty">Este producto aún no tiene variantes. Agrega la primera abajo.</p>
              ) : (
                <ul className="variant-cards">
                  {editingVariantProduct.variants.map((v) => (
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
                          <span className={`variant-tag ${v.weight ? "" : "variant-tag-empty"}`}>
                            <b>Peso</b> {v.weight ? `${v.weight} kg` : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="variant-card-actions">
                        <button
                          type="button"
                          className="variant-edit-btn"
                          onClick={() => startEditVariant(v)}
                        >
                          <PencilIcon /> Editar
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            className="variant-icon-btn variant-icon-btn-danger"
                            onClick={() => handleDeleteVariant(v)}
                            title="Eliminar variante"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
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

      {/* MODAL DE MARCA / CATEGORÍA / PROVEEDOR */}
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
    </div>
  );
}
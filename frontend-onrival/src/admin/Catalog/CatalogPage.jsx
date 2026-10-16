import { useEffect, useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import CategoryCascader from "./CategoryCascader";
import { buildCategoryTree, categoryPathLabel } from "./categoryTree";
import { catalogService } from "../../services/catalogService";
import { mediaService } from "../../services/mediaService";
import "../ui/DataTable.css";
import "./CatalogPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const toId = (v) => (v === "" || v == null ? null : Number(v));

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

export default function CatalogPage({ canCreate = true, canToggle = true }) {
  const [activeTab, setActiveTab] = useState("products");

  // Estados de datos (inician vacíos, se llenan desde PostgreSQL)
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtro
  const [searchQuery, setSearchQuery] = useState("");

  // Modales
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [editingVariantProduct, setEditingVariantProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Formulario de producto
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    cost_price: "",
    sale_price: "",
    brand_id: "",
    category_id: "",
    supplier_id: "",
    is_active: true,
  });

  // Manejo de archivos para AWS S3
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  // Formulario de variante
  const [variantForm, setVariantForm] = useState({
    sku: "",
    color: "",
    size: "",
    weight: "",
    barcode: "",
  });

  // 1. Cargar datos del backend
  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, brs, cats, sups] = await Promise.all([
        catalogService.getAdminProducts(),
        catalogService.getBrands(),
        catalogService.getCategories(),
        catalogService.getSuppliers(),
      ]);

      setProducts(prods);
      setBrands(brs);
      setCategories(cats);
      setSuppliers(sups);
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

  // 2. Activar / Desactivar producto en BD
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

  // 3. Manejo de archivos seleccionados
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (files.length > 5) {
      alert("Puedes seleccionar un máximo de 5 fotografías.");
      return;
    }

    setSelectedFiles(files);
    const previews = files.map((f) => URL.createObjectURL(f));
    setFilePreviews(previews);
  };

  const openCreateModal = () => {
    if (!canCreate) return;
    setSelectedProduct(null);
    setProductForm({
      name: "",
      description: "",
      cost_price: "",
      sale_price: "",
      brand_id: brands[0]?.id || "",
      category_id: "",
      supplier_id: suppliers[0]?.id || "",
      is_active: true,
    });
    setSelectedFiles([]);
    setFilePreviews([]);
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
    setFilePreviews([]);
    setModalError("");
    setIsCreatingProduct(true);
  };

  const closeProductModal = () => {
    setIsCreatingProduct(false);
    setSelectedProduct(null);
    setSelectedFiles([]);
    setFilePreviews([]);
    setModalError("");
  };

  // 4. Guardar producto y subir fotos a S3
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

      // Subir fotos a S3 si el usuario seleccionó archivos
      if (selectedFiles.length > 0 && targetId) {
        await mediaService.uploadProductImages(targetId, selectedFiles, true);
      }

      await loadData();
      closeProductModal();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || "Error al procesar el producto.");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Agregar variante en BD
  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!variantForm.sku.trim()) return;

    try {
      const newVar = await catalogService.addVariant(editingVariantProduct.id, {
        sku: variantForm.sku.trim().toUpperCase(),
        color: variantForm.color.trim() || null,
        size: variantForm.size.trim() || null,
        weight: variantForm.weight ? Number(variantForm.weight) : null,
        barcode: variantForm.barcode.trim() || null,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingVariantProduct.id
            ? { ...p, variants: [...(p.variants || []), newVar] }
            : p
        )
      );

      setEditingVariantProduct((prev) => ({
        ...prev,
        variants: [...(prev.variants || []), newVar],
      }));

      setVariantForm({ sku: "", color: "", size: "", weight: "", barcode: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Error al crear la variante.");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="catalog-page">
      <PageHeader
        title="Catálogo de Productos"
        subtitle="Administra publicaciones, precios, marcas, categorías y proveedores"
        actionLabel={activeTab === "products" && canCreate ? "Nuevo Producto" : null}
        onAction={activeTab === "products" && canCreate ? openCreateModal : null}
      />

      {/* Tabs Principales */}
      <div className="catalog-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          Productos ({products.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "brands" ? "active" : ""}`}
          onClick={() => setActiveTab("brands")}
        >
          Marcas ({brands.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => setActiveTab("categories")}
        >
          Categorías ({categories.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "suppliers" ? "active" : ""}`}
          onClick={() => setActiveTab("suppliers")}
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
                          <div>{item.brand?.name || "Sin marca"}</div>
                          <span className="data-cell-muted">{categoryLabel(item.category_id)}</span>
                        </td>
                        <td>{formatPrice(item.cost_price || 0)}</td>
                        <td><strong>{formatPrice(item.sale_price)}</strong></td>
                        <td>
                          <button
                            type="button"
                            className={`variant-btn ${variantCount === 0 ? "variant-btn-empty" : ""}`}
                            onClick={() => setEditingVariantProduct(item)}
                            title={
                              variantCount === 0
                                ? "Este producto aún no tiene variantes"
                                : `Tallas: ${variantSizes || "sin talla definida"}`
                            }
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
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b) => (
                    <tr key={b.id}>
                      <td>#{b.id}</td>
                      <td><strong>{b.name}</strong></td>
                      <td className="data-cell-muted">{b.description || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: CATEGORÍAS */}
          {activeTab === "categories" && (
            <div className="data-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Categoría</th>
                    <th>Depende de (Padre)</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => {
                    const parent = categories.find((cat) => cat.id === c.parent_category_id);
                    return (
                      <tr key={c.id}>
                        <td>#{c.id}</td>
                        <td><strong>{c.name}</strong></td>
                        <td className="data-cell-muted">{parent ? parent.name : "— (Categoría Principal)"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: PROVEEDORES */}
          {activeTab === "suppliers" && (
            <div className="data-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre Proveedor</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td>#{s.id}</td>
                      <td><strong>{s.name}</strong></td>
                      <td className="data-cell-muted">{s.contact_email || "-"}</td>
                      <td>{s.phone || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
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

              {/* SECCIÓN DE SUBIDA DE IMÁGENES A S3 */}
              <div className="form-group" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <label style={{ fontWeight: 600 }}>Fotografías del Producto (AWS S3)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  multiple
                  onChange={handleImageChange}
                  style={{ marginTop: "0.5rem" }}
                />
                <small className="data-cell-muted" style={{ display: "block", marginTop: "4px" }}>
                  Máximo 5 fotos. La primera se guardará como portada.
                </small>

                {filePreviews.length > 0 && (
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                    {filePreviews.map((src, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "6px",
                          overflow: "hidden",
                          border: idx === 0 ? "2px solid #2563eb" : "1px solid #cbd5e1",
                          position: "relative",
                        }}
                      >
                        <img src={src} alt="Vista previa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {idx === 0 && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: "#2563eb",
                              color: "#fff",
                              fontSize: "9px",
                              textAlign: "center",
                            }}
                          >
                            Portada
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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

      {/* MODAL GESTIÓN DE VARIANTES Y SKUs */}
      {editingVariantProduct && (
        <div className="catalog-modal-overlay" onClick={() => setEditingVariantProduct(null)}>
          <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>Variantes y SKUs: {editingVariantProduct.name}</h2>
              <button type="button" className="close-btn" onClick={() => setEditingVariantProduct(null)}>
                ✕
              </button>
            </div>

            <div className="variant-list">
              <h4>SKUs Existentes</h4>
              <ul>
                {(editingVariantProduct.variants || []).map((v) => (
                  <li key={v.id} className="variant-item">
                    <span><strong>SKU:</strong> {v.sku}</span>
                    <span><strong>Color:</strong> {v.color || "-"}</span>
                    <span><strong>Talla:</strong> {v.size || "-"}</span>
                  </li>
                ))}
                {(!editingVariantProduct.variants || editingVariantProduct.variants.length === 0) && (
                  <p className="data-empty">No hay variantes creadas para este producto.</p>
                )}
              </ul>
            </div>

            <form onSubmit={handleAddVariant} className="catalog-form variant-form">
              <h4>Agregar Nueva Variante</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    placeholder="Ej: ADI-F50-43"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Talla / Dimensión</label>
                  <input
                    type="text"
                    placeholder="Ej: 43 o M"
                    value={variantForm.size}
                    onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })}
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
                    onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Código de Barras</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={variantForm.barcode}
                    onChange={(e) => setVariantForm({ ...variantForm, barcode: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary">
                Añadir Variante
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
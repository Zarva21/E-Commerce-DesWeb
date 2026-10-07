import { useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
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

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState("products"); // 'products' | 'brands' | 'categories' | 'suppliers'
  
  // Estados de datos
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [brands, setBrands] = useState(MOCK_BRANDS);
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [suppliers, setSuppliers] = useState(MOCK_SUPPLIERS);

  // Filtro
  const [searchQuery, setSearchQuery] = useState("");

  // Modales
  const [selectedProduct, setSelectedProduct] = useState(null); // null = cerrado
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [editingVariantProduct, setEditingVariantProduct] = useState(null);

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

  // Formulario de variante
  const [variantForm, setVariantForm] = useState({
    sku: "",
    color: "",
    size: "",
    weight: "",
    barcode: "",
  });

  // Manejo de estado activo/inactivo de producto
  const handleToggleProductStatus = (id) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  // Guardar nuevo producto o edición
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (selectedProduct) {
      // Editar
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? {
                ...p,
                ...productForm,
                cost_price: Number(productForm.cost_price),
                sale_price: Number(productForm.sale_price),
                brand: brands.find((b) => b.id === Number(productForm.brand_id)),
                category: categories.find((c) => c.id === Number(productForm.category_id)),
                supplier: suppliers.find((s) => s.id === Number(productForm.supplier_id)),
              }
            : p
        )
      );
    } else {
      // Crear
      const newProd = {
        id: Date.now(),
        public_id: crypto.randomUUID(),
        ...productForm,
        cost_price: Number(productForm.cost_price),
        sale_price: Number(productForm.sale_price),
        brand: brands.find((b) => b.id === Number(productForm.brand_id)),
        category: categories.find((c) => c.id === Number(productForm.category_id)),
        supplier: suppliers.find((s) => s.id === Number(productForm.supplier_id)),
        variants: [],
        images: [],
      };
      setProducts([newProd, ...products]);
    }
    closeProductModal();
  };

  const openCreateModal = () => {
    setSelectedProduct(null);
    setProductForm({
      name: "",
      description: "",
      cost_price: "",
      sale_price: "",
      brand_id: brands[0]?.id || "",
      category_id: categories[0]?.id || "",
      supplier_id: suppliers[0]?.id || "",
      is_active: true,
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
    });
    setIsCreatingProduct(true);
  };

  const closeProductModal = () => {
    setIsCreatingProduct(false);
    setSelectedProduct(null);
  };

  // Agregar variante
  const handleAddVariant = (e) => {
    e.preventDefault();
    if (!variantForm.sku) return;

    const newVariant = {
      id: Date.now(),
      ...variantForm,
      is_active: true,
    };

    setProducts((prev) =>
      prev.map((p) =>
        p.id === editingVariantProduct.id
          ? { ...p, variants: [...p.variants, newVariant] }
          : p
      )
    );

    setEditingVariantProduct((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));

    setVariantForm({ sku: "", color: "", size: "", weight: "", barcode: "" });
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="catalog-page">
      <PageHeader
        title="Catálogo de Productos"
        subtitle="Administra publicaciones, precios, marcas, categorías y proveedores"
        actionLabel={activeTab === "products" ? "Nuevo Producto" : null}
        onAction={activeTab === "products" ? openCreateModal : null}
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
              {filteredProducts.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="data-cell-main">
                      <div className="data-cell-thumb">
                        <img
                          src={item.images[0]?.image_url || "/img/placeholder.png"}
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
                    <div>{item.brand?.name || "Sin marca"}</div>
                    <span className="data-cell-muted">{item.category?.name || "Sin categoría"}</span>
                  </td>
                  <td>{formatPrice(item.cost_price)}</td>
                  <td><strong>{formatPrice(item.sale_price)}</strong></td>
                  <td>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setEditingVariantProduct(item)}
                    >
                      {item.variants.length} Talla(s)/SKUs
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
                      <button
                        type="button"
                        className="data-action-btn"
                        onClick={() => handleToggleProductStatus(item.id)}
                      >
                        {item.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id}>
                  <td>#{brand.id}</td>
                  <td><strong>{brand.name}</strong></td>
                  <td className="data-cell-muted">{brand.description || "-"}</td>
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
              {categories.map((cat) => {
                const parent = categories.find((c) => c.id === cat.parent_category_id);
                return (
                  <tr key={cat.id}>
                    <td>#{cat.id}</td>
                    <td><strong>{cat.name}</strong></td>
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
                <th>Correo Electrónico</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup) => (
                <tr key={sup.id}>
                  <td>#{sup.id}</td>
                  <td><strong>{sup.name}</strong></td>
                  <td>{sup.contact_email || "-"}</td>
                  <td>{sup.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  <label>Categoría</label>
                  <select
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  >
                    <option value="">Seleccione categoría...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                {editingVariantProduct.variants.map((v) => (
                  <li key={v.id} className="variant-item">
                    <span><strong>SKU:</strong> {v.sku}</span>
                    <span><strong>Color:</strong> {v.color || "-"}</span>
                    <span><strong>Talla:</strong> {v.size || "-"}</span>
                  </li>
                ))}
                {editingVariantProduct.variants.length === 0 && (
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
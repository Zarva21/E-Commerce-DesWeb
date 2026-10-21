import { useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import CategoryCascader from "../Catalog/CategoryCascader";
import ProductImageField from "../Catalog/ProductImageField";
import { TrashIcon } from "../Catalog/icons";
import { buildCategoryTree, findCategoryPath } from "../Catalog/categoryTree";
import { MOCK_BRANDS, MOCK_CATEGORIES, MOCK_SUPPLIERS } from "../Catalog/mockCatalog";
import { MOCK_INVENTORY, MOCK_MOVEMENTS } from "./mockInventory";
import "../ui/DataTable.css";
import "../Catalog/CatalogPage.css"; // modales, formularios, campo de imagen y botones de icono
import "./InventoryPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value) =>
  new Date(value).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function stockBadge(quantityOnHand, reorderLevel) {
  if (quantityOnHand === 0) return <StatusBadge label="Agotado" tone="danger" />;
  if (quantityOnHand <= reorderLevel) return <StatusBadge label="Stock bajo" tone="warning" />;
  return <StatusBadge label="Disponible" tone="success" />;
}

const PLACEHOLDER_IMAGE = "/img/placeholder.png";
const DEFAULT_REORDER_LEVEL = 5;

const norm = (v) => String(v ?? "").trim().toLowerCase();
const str = (v) => String(v ?? "").trim();
const toId = (v) => (v === "" || v == null ? null : Number(v));
const flatNodes = (nodes) => nodes.flatMap((n) => [n, ...flatNodes(n.subcategories ?? [])]);

// Marcas, categorías y proveedores: los mismos datos de prueba del catálogo.
// TODO: con backend, vienen de la API (getTree() para el árbol de categorías).
const CATEGORY_TREE = buildCategoryTree(MOCK_CATEGORIES);
const BRAND_NAME = new Map(MOCK_BRANDS.map((b) => [String(b.id), b.name]));

// Los datos de prueba viejos del inventario solo traen texto (marca, categoría, género).
// Se intenta enlazarlos con los ids del catálogo; lo que no coincida queda con su texto.
function guessCategoryId(row) {
  const section = CATEGORY_TREE.find((r) => norm(r.name) === norm(row.gender));
  const pool = flatNodes(section ? section.subcategories ?? [] : CATEGORY_TREE);
  return pool.find((n) => norm(n.name) === norm(row.category))?.id ?? null;
}

const SEED_INVENTORY = MOCK_INVENTORY.map((row) => ({
  ...row,
  brand_id: MOCK_BRANDS.find((b) => norm(b.name) === norm(row.brand))?.id ?? null,
  category_id: guessCategoryId(row),
  supplier_id: null,
  cost_price: null,
  description: "",
  size: "",
  color: "",
  weight: null,
  barcode: "",
  location: "",
}));

// Marca y categoría que se muestran en la tabla: por id si existe, si no el texto original
const brandLabel = (row) => BRAND_NAME.get(String(row.brand_id)) ?? (row.brand || "Sin marca");

function categoryInfo(row) {
  const path = findCategoryPath(CATEGORY_TREE, row.category_id);
  if (path.length) {
    return { category: path[path.length - 1].name, gender: path.length > 1 ? path[0].name : "" };
  }
  return { category: row.category || "Sin categoría", gender: row.gender || "" };
}

const EMPTY_PRODUCT_FORM = {
  image: "",
  name: "",
  description: "",
  cost_price: "",
  sale_price: "",
  brand_id: "",
  supplier_id: "",
  category_id: "",
  sku: "",
  size: "",
  color: "",
  weight: "",
  barcode: "",
  quantity: "",
  reorder_level: String(DEFAULT_REORDER_LEVEL),
  location: "",
};

const EMPTY_MOVEMENT = {
  movement_type: "PURCHASE_IN",
  quantity: "",
  reference: "",
  notes: "",
};

// canAddProduct: puede crear productos nuevos desde el inventario (solo admin).
// canDelete: puede eliminar productos del inventario (solo admin).
// Sin esos permisos sigue pudiendo editar, ajustar stock y ver el historial.
export default function InventoryPage({ canAddProduct = true, canDelete = true }) {
  const [inventory, setInventory] = useState(SEED_INVENTORY);
  const [movements, setMovements] = useState(MOCK_MOVEMENTS);
  const [activeTab, setActiveTab] = useState("stock"); // 'stock' | 'movements'

  // Estado para el modal de ajuste de inventario
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT);
  const [errorMsg, setErrorMsg] = useState("");

  // Estado para el modal de producto (nuevo / editar)
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = producto nuevo
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [productError, setProductError] = useState("");

  // Para mostrar el SKU en el historial en vez de solo el id de la variante
  const skuByVariant = useMemo(
    () => new Map(inventory.map((row) => [String(row.product_variant_id), row.sku])),
    [inventory]
  );

  // ---------------- PRODUCTO: NUEVO / EDITAR / ELIMINAR ----------------
  const setProductField = (name, value) => {
    setProductForm((f) => ({ ...f, [name]: value }));
    setProductError("");
  };

  const openCreateModal = () => {
    if (!canAddProduct) return;
    setEditingItem(null);
    setProductForm(EMPTY_PRODUCT_FORM);
    setProductError("");
    setProductModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setProductForm({
      image: item.image && item.image !== PLACEHOLDER_IMAGE ? item.image : "",
      name: item.name ?? "",
      description: item.description ?? "",
      cost_price: item.cost_price ?? "",
      sale_price: item.price ?? "",
      brand_id: item.brand_id ?? "",
      supplier_id: item.supplier_id ?? "",
      category_id: item.category_id ?? "",
      sku: item.sku ?? "",
      size: item.size ?? "",
      color: item.color ?? "",
      weight: item.weight ?? "",
      barcode: item.barcode ?? "",
      quantity: "",
      reorder_level: item.reorder_level ?? DEFAULT_REORDER_LEVEL,
      location: item.location ?? "",
    });
    setProductError("");
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    setProductModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!editingItem && !canAddProduct) return;

    const name = str(productForm.name);
    const sku = str(productForm.sku);
    if (!name) return setProductError("El nombre del producto es obligatorio.");
    if (!sku) return setProductError("El SKU es obligatorio.");

    const costPrice = Number(productForm.cost_price);
    const salePrice = Number(productForm.sale_price);
    if (Number.isNaN(costPrice) || Number.isNaN(salePrice) || costPrice < 0 || salePrice < 0) {
      return setProductError("Los precios deben ser números mayores o iguales a 0.");
    }

    // El SKU no se puede repetir (la API responde 409)
    const editingId = editingItem?.product_variant_id;
    if (inventory.some((r) => norm(r.sku) === norm(sku) && r.product_variant_id !== editingId)) {
      return setProductError(`El SKU "${sku}" ya está en uso.`);
    }

    let weight = null;
    if (str(productForm.weight) !== "") {
      weight = Number(productForm.weight);
      if (Number.isNaN(weight) || weight < 0) {
        return setProductError("El peso debe ser un número mayor o igual a 0.");
      }
    }

    const reorderLevel = parseInt(productForm.reorder_level, 10);
    if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
      return setProductError("El nivel de reorden debe ser un número entero mayor o igual a 0.");
    }

    let quantity = 0;
    if (!editingItem) {
      quantity = parseInt(productForm.quantity, 10);
      if (Number.isNaN(quantity) || quantity < 0) {
        return setProductError("El stock inicial debe ser un número entero mayor o igual a 0.");
      }
    }

    const brandId = toId(productForm.brand_id);
    const categoryId = toId(productForm.category_id);
    const supplierId = toId(productForm.supplier_id);

    // Si el producto venía solo con texto (datos viejos) y no se eligió nada nuevo, se conserva ese texto
    const keepLegacy = (field, idField, newId) =>
      newId == null && editingItem && editingItem[idField] == null ? editingItem[field] ?? "" : "";

    const data = {
      name,
      description: str(productForm.description),
      price: salePrice,
      cost_price: costPrice,
      image: productForm.image || PLACEHOLDER_IMAGE,
      brand_id: brandId,
      category_id: categoryId,
      supplier_id: supplierId,
      brand: keepLegacy("brand", "brand_id", brandId),
      category: keepLegacy("category", "category_id", categoryId),
      gender: keepLegacy("gender", "category_id", categoryId),
      sku,
      size: str(productForm.size),
      color: str(productForm.color),
      weight,
      barcode: str(productForm.barcode),
      location: str(productForm.location),
      reorder_level: reorderLevel,
    };

    if (editingItem) {
      // La cantidad en stock no se toca acá: se cambia con "Ajustar Stock"
      setInventory((prev) =>
        prev.map((r) => (r.product_variant_id === editingId ? { ...r, ...data } : r))
      );
    } else {
      const id = Date.now();
      setInventory((prev) => [{ product_variant_id: id, ...data, quantity_on_hand: quantity }, ...prev]);

      // El stock inicial queda registrado en el historial
      if (quantity > 0) {
        setMovements((prev) => [
          {
            id: id + 1,
            product_variant_id: id,
            sku,
            employee_id: 1, // Simulación de sesión actual
            movement_type: "PURCHASE_IN",
            quantity,
            reference: "STOCK-INICIAL",
            notes: "Stock inicial al crear el producto",
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    }

    closeProductModal();
  };

  const handleDeleteProduct = (item) => {
    if (!canDelete) return;

    const stockNote =
      item.quantity_on_hand > 0 ? `\n\nTodavía tiene ${item.quantity_on_hand} unidad(es) en stock.` : "";
    const message = `¿Eliminar "${item.name}" (${item.sku}) del inventario?${stockNote}\n\nEl historial de movimientos se conserva.`;
    if (!window.confirm(message)) return;

    setInventory((prev) => prev.filter((r) => r.product_variant_id !== item.product_variant_id));
  };

  // ---------------- AJUSTE DE STOCK ----------------
  const handleOpenAdjustModal = (item) => {
    setSelectedVariant(item);
    setMovementForm(EMPTY_MOVEMENT);
    setErrorMsg("");
  };

  const handleSaveMovement = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const qty = parseInt(movementForm.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Ingresa una cantidad válida mayor a 0.");
      return;
    }

    const isOutgoing = ["DAMAGE_OUT", "SUPPLIER_RETURN_OUT"].includes(movementForm.movement_type);

    // Validación de stock mínimo para salidas
    if (isOutgoing && selectedVariant.quantity_on_hand < qty) {
      setErrorMsg(`Stock insuficiente. Solo hay ${selectedVariant.quantity_on_hand} unidades disponibles.`);
      return;
    }

    const delta = isOutgoing ? -qty : qty;

    // Actualización local de stock (simulando la respuesta de recordMovement)
    setInventory((prev) =>
      prev.map((item) =>
        item.product_variant_id === selectedVariant.product_variant_id
          ? { ...item, quantity_on_hand: item.quantity_on_hand + delta }
          : item
      )
    );

    // Registrar en el historial de movimientos
    const newMovement = {
      id: Date.now(),
      product_variant_id: selectedVariant.product_variant_id,
      sku: selectedVariant.sku,
      employee_id: 1, // Simulación de sesión actual
      movement_type: movementForm.movement_type,
      quantity: delta,
      reference: movementForm.reference || (movementForm.movement_type === "PURCHASE_IN" ? "COMPRA-MANUAL" : "AJUSTE-MANUAL"),
      notes: movementForm.notes,
      createdAt: new Date().toISOString(),
    };

    setMovements([newMovement, ...movements]);
    setSelectedVariant(null);
  };

  return (
    <div className="inventory-page">
      <PageHeader
        title="Gestión de Inventario"
        subtitle="Control de existencias y movimientos por variante"
        actionLabel={canAddProduct ? "Nuevo Producto" : null}
        onAction={canAddProduct ? openCreateModal : null}
      />

      {/* Tabs de Navegación */}
      <div className="inventory-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "stock" ? "active" : ""}`}
          onClick={() => setActiveTab("stock")}
        >
          Existencias (Stock)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "movements" ? "active" : ""}`}
          onClick={() => setActiveTab("movements")}
        >
          Historial de Movimientos
        </button>
      </div>

      {/* TAB 1: TABLA DE STOCK */}
      {activeTab === "stock" && (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto / SKU</th>
                <th>Marca / Cat.</th>
                <th>Precio</th>
                <th>Stock Actual</th>
                <th>Nivel Reorden</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const { category, gender } = categoryInfo(item);
                const variantLabel = [item.size && `Talla ${item.size}`, item.color].filter(Boolean).join(" · ");

                return (
                  <tr key={item.product_variant_id}>
                    <td>
                      <div className="data-cell-main">
                        <div className="data-cell-thumb">
                          <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} />
                        </div>
                        <div>
                          <span className="data-cell-title">{item.name}</span>
                          <div className="data-cell-muted">
                            SKU: {item.sku}
                            {variantLabel ? ` · ${variantLabel}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{brandLabel(item)}</div>
                      <span className="data-cell-muted">
                        {category}
                        {gender ? ` (${gender})` : ""}
                      </span>
                    </td>
                    <td>{formatPrice(item.price)}</td>
                    <td>
                      <strong className="stock-qty">{item.quantity_on_hand}</strong> unid.
                    </td>
                    <td>{item.reorder_level} unid.</td>
                    <td>{stockBadge(item.quantity_on_hand, item.reorder_level)}</td>
                    <td>
                      <div className="data-actions">
                        <button
                          type="button"
                          className="data-action-btn"
                          onClick={() => handleOpenAdjustModal(item)}
                        >
                          Ajustar Stock
                        </button>
                        <button
                          type="button"
                          className="data-action-btn"
                          onClick={() => openEditModal(item)}
                        >
                          Editar
                        </button>
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

          {inventory.length === 0 && (
            <p className="data-empty">No hay productos ni variantes registradas.</p>
          )}
        </div>
      )}

      {/* TAB 2: HISTORIAL DE MOVIMIENTOS */}
      {activeTab === "movements" && (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Variante</th>
                <th>Tipo Movimiento</th>
                <th>Cantidad</th>
                <th>Referencia</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov) => (
                <tr key={mov.id}>
                  <td className="data-cell-muted">{formatDate(mov.createdAt)}</td>
                  <td>
                    {mov.sku ?? skuByVariant.get(String(mov.product_variant_id)) ?? `#${mov.product_variant_id}`}
                  </td>
                  <td>
                    <span className={`movement-tag tag-${mov.movement_type.toLowerCase()}`}>
                      {mov.movement_type}
                    </span>
                  </td>
                  <td>
                    <strong className={mov.quantity > 0 ? "qty-plus" : "qty-minus"}>
                      {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                    </strong>
                  </td>
                  <td>{mov.reference || "-"}</td>
                  <td className="data-cell-muted">{mov.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {movements.length === 0 && (
            <p className="data-empty">No hay movimientos registrados.</p>
          )}
        </div>
      )}

      {/* MODAL NUEVO / EDITAR PRODUCTO */}
      {productModalOpen && (
        <div className="catalog-modal-overlay" onClick={closeProductModal}>
          <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>{editingItem ? "Editar Producto" : "Nuevo Producto en Inventario"}</h2>
              <button type="button" className="close-btn" onClick={closeProductModal}>
                ✕
              </button>
            </div>

            {productError && <div className="catalog-error">{productError}</div>}

            <form onSubmit={handleSaveProduct} className="catalog-form">
              <div className="form-group">
                <label>Imagen del producto</label>
                <ProductImageField
                  value={productForm.image}
                  onChange={(image) => setProductField("image", image)}
                />
              </div>

              <div className="form-group">
                <label>Nombre del Producto *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductField("name", e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio Costo (GTQ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.cost_price}
                    onChange={(e) => setProductField("cost_price", e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Precio Venta (GTQ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.sale_price}
                    onChange={(e) => setProductField("sale_price", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Marca</label>
                  <select
                    value={productForm.brand_id}
                    onChange={(e) => setProductField("brand_id", e.target.value)}
                  >
                    <option value="">Seleccione marca...</option>
                    {MOCK_BRANDS.map((b) => (
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
                    onChange={(e) => setProductField("supplier_id", e.target.value)}
                  >
                    <option value="">Seleccione proveedor...</option>
                    {MOCK_SUPPLIERS.map((s) => (
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
                  tree={CATEGORY_TREE}
                  value={productForm.category_id}
                  onChange={(id) => setProductField("category_id", id)}
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  rows="3"
                  placeholder="Opcional"
                  value={productForm.description}
                  onChange={(e) => setProductField("description", e.target.value)}
                />
              </div>

              {/* VARIANTE Y EXISTENCIAS */}
              <div className="inv-form-section">
                <h4 className="inv-form-section-title">Variante y existencias</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>SKU *</label>
                    <input
                      type="text"
                      placeholder="Ej: ADI-F50-43"
                      value={productForm.sku}
                      onChange={(e) => setProductField("sku", e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Talla / Dimensión</label>
                    <input
                      type="text"
                      placeholder="Ej: 43 o M"
                      value={productForm.size}
                      onChange={(e) => setProductField("size", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Color</label>
                    <input
                      type="text"
                      placeholder="Ej: Rojo"
                      value={productForm.color}
                      onChange={(e) => setProductField("color", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Peso (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ej: 0.45"
                      value={productForm.weight}
                      onChange={(e) => setProductField("weight", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Código de Barras</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={productForm.barcode}
                    onChange={(e) => setProductField("barcode", e.target.value)}
                  />
                </div>

                <div className="form-row">
                  {!editingItem && (
                    <div className="form-group">
                      <label>Stock inicial *</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Ej: 10"
                        value={productForm.quantity}
                        onChange={(e) => setProductField("quantity", e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Nivel de reorden *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={productForm.reorder_level}
                      onChange={(e) => setProductField("reorder_level", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Ubicación en bodega</label>
                  <input
                    type="text"
                    placeholder="Opcional. Ej: Estante A-3"
                    value={productForm.location}
                    onChange={(e) => setProductField("location", e.target.value)}
                  />
                </div>

                {editingItem && (
                  <p className="inv-form-note">
                    Para cambiar las existencias usá <strong>Ajustar Stock</strong>: así queda registrado en el historial.
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeProductModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? "Guardar cambios" : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR MOVIMIENTO MANUAL */}
      {selectedVariant && (
        <div className="inventory-modal-overlay" onClick={() => setSelectedVariant(null)}>
          <div className="inventory-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal-header">
              <h2>Ajuste de Stock: {selectedVariant.name}</h2>
              <button type="button" className="close-btn" onClick={() => setSelectedVariant(null)}>
                ✕
              </button>
            </div>

            {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}

            <form onSubmit={handleSaveMovement} className="inventory-form">
              <div className="form-group">
                <label>Tipo de Operación</label>
                <select
                  value={movementForm.movement_type}
                  onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                >
                  <option value="PURCHASE_IN">PURCHASE_IN (Recepción de Proveedor)</option>
                  <option value="DAMAGE_OUT">DAMAGE_OUT (Baja por Producto Dañado/Merma)</option>
                  <option value="SUPPLIER_RETURN_OUT">SUPPLIER_RETURN_OUT (Devolución a Proveedor)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ej: 10"
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Referencia / N° Factura</label>
                <input
                  type="text"
                  placeholder="Ej: FAC-10293 o AJUSTE-01"
                  value={movementForm.reference}
                  onChange={(e) => setMovementForm({ ...movementForm, reference: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notas / Justificación</label>
                <textarea
                  rows="3"
                  placeholder="Observaciones de la entrada o salida de inventario"
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelectedVariant(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Aplicar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
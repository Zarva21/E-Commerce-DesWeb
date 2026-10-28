import { useEffect, useMemo, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { MOCK_BRANDS, MOCK_CATEGORIES } from "../Catalog/mockCatalog";
import { MOCK_INVENTORY, MOCK_MOVEMENTS } from "./mockInventory";
import { buildCategoryTree, findCategoryPath } from "../Catalog/categoryTree";
import { inventoryService } from "../../services/inventoryService";
import "../ui/DataTable.css";
import "./InventoryPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (value) => {
  if (!value) return "Reciente";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? "Reciente"
    : d.toLocaleDateString("es-GT", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

function stockBadge(quantityOnHand, reorderLevel) {
  if (quantityOnHand === 0) return <StatusBadge label="Agotado" tone="danger" />;
  if (quantityOnHand <= reorderLevel) return <StatusBadge label="Stock bajo" tone="warning" />;
  return <StatusBadge label="Disponible" tone="success" />;
}

const PLACEHOLDER_IMAGE = "/img/placeholder.png";
const CATEGORY_TREE = buildCategoryTree(MOCK_CATEGORIES);
const BRAND_NAME = new Map(MOCK_BRANDS.map((b) => [String(b.id), b.name]));

function categoryInfo(row) {
  const path = findCategoryPath(CATEGORY_TREE, row.category_id);
  if (path.length) {
    return { category: path[path.length - 1].name, gender: path.length > 1 ? path[0].name : "" };
  }
  return { category: row.category || "Sin categoría", gender: row.gender || "" };
}

const EMPTY_MOVEMENT = {
  movement_type: "PURCHASE_IN",
  quantity: "",
  reference: "",
  notes: "",
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [movements, setMovements] = useState(MOCK_MOVEMENTS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stock");

  // Filtros reactivos en Frontend
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBrand, setFilterBrand] = useState("ALL");
  const [filterStockStatus, setFilterStockStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("name_asc");

  // Modal individual de ajuste
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal de Ingreso por Lote / Factura
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchReference, setBatchReference] = useState("");
  const [batchNotes, setBatchNotes] = useState("");
  const [batchItems, setBatchItems] = useState([]); // [{ variantId, sku, name, qty }]
  const [variantSearchText, setVariantSearchText] = useState("");
  const [batchProgress, setBatchProgress] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stockData, movData] = await Promise.all([
        inventoryService.getStock(),
        inventoryService.getMovements(),
      ]);
      setInventory(Array.isArray(stockData) && stockData.length > 0 ? stockData : MOCK_INVENTORY);
      setMovements(Array.isArray(movData) && movData.length > 0 ? movData : MOCK_MOVEMENTS);
    } catch (err) {
      console.warn("Fallo al obtener inventario real, usando fallback:", err);
      setInventory(MOCK_INVENTORY);
      setMovements(MOCK_MOVEMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const skuByVariant = useMemo(
    () => new Map(inventory.map((row) => [String(row.product_variant_id), row.sku])),
    [inventory]
  );

  const availableBrands = useMemo(() => {
    const brands = new Set();
    inventory.forEach((item) => {
      const b = BRAND_NAME.get(String(item.brand_id)) || item.brand;
      if (b) brands.add(b);
    });
    return Array.from(brands).sort();
  }, [inventory]);

  // Filtrado principal de la tabla de stock
  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventory
      .filter((item) => {
        const name = String(item.name || "").toLowerCase();
        const sku = String(item.sku || "").toLowerCase();
        const brand = (BRAND_NAME.get(String(item.brand_id)) || item.brand || "").toLowerCase();
        const { category } = categoryInfo(item);

        const matchesQuery =
          !q ||
          name.includes(q) ||
          sku.includes(q) ||
          brand.includes(q) ||
          category.toLowerCase().includes(q);

        if (!matchesQuery) return false;

        if (filterBrand !== "ALL") {
          const itemBrand = BRAND_NAME.get(String(item.brand_id)) || item.brand || "";
          if (itemBrand !== filterBrand) return false;
        }

        const qty = item.quantity_on_hand || 0;
        const reorder = item.reorder_level || 5;

        if (filterStockStatus === "OUT_OF_STOCK" && qty > 0) return false;
        if (filterStockStatus === "LOW_STOCK" && (qty === 0 || qty > reorder)) return false;
        if (filterStockStatus === "IN_STOCK" && qty <= reorder) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "stock_asc") return a.quantity_on_hand - b.quantity_on_hand;
        if (sortBy === "stock_desc") return b.quantity_on_hand - a.quantity_on_hand;
        return 0;
      });
  }, [inventory, searchQuery, filterBrand, filterStockStatus, sortBy]);

  // Filtrado del buscador interno de variantes en el modal con Checkbox
  const searchedVariantsForBatch = useMemo(() => {
    const term = variantSearchText.trim().toLowerCase();
    if (!term) return inventory;
    return inventory.filter((v) => {
      const name = String(v.name || "").toLowerCase();
      const sku = String(v.sku || "").toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [inventory, variantSearchText]);

  // Manejador del toggle de Checkbox
  const handleToggleVariantInBatch = (variant) => {
    const exists = batchItems.some((item) => item.variantId === variant.product_variant_id);
    if (exists) {
      setBatchItems((prev) => prev.filter((item) => item.variantId !== variant.product_variant_id));
    } else {
      setBatchItems((prev) => [
        ...prev,
        {
          variantId: variant.product_variant_id,
          sku: variant.sku,
          name: variant.name,
          qty: 1,
        },
      ]);
    }
  };

  const handleBatchQtyChange = (variantId, newQty) => {
    const parsed = parseInt(newQty, 10);
    setBatchItems((prev) =>
      prev.map((item) =>
        item.variantId === variantId ? { ...item, qty: isNaN(parsed) ? "" : parsed } : item
      )
    );
  };

  const handleOpenBatchModal = () => {
    setBatchReference("");
    setBatchNotes("");
    setBatchItems([]);
    setVariantSearchText("");
    setErrorMsg("");
    setBatchProgress(null);
    setBatchModalOpen(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (batchItems.length === 0) {
      setErrorMsg("Debes seleccionar al menos una variante con su casilla.");
      return;
    }

    const invalid = batchItems.some((item) => !item.qty || item.qty <= 0);
    if (invalid) {
      setErrorMsg("Todas las variantes deben tener una cantidad mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        setBatchProgress(`Guardando ${i + 1} de ${batchItems.length}: SKU ${item.sku}`);

        await inventoryService.recordMovement({
          product_variant_id: Number(item.variantId),
          movement_type: "PURCHASE_IN",
          quantity: Number(item.qty),
          reference: batchReference.trim() || "FACTURA-LOTE",
          notes: batchNotes.trim() || "Ingreso masivo por factura",
        });
      }

      await loadData();
      setBatchModalOpen(false);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || "Error procesando el lote de productos."
      );
    } finally {
      setSubmitting(false);
      setBatchProgress(null);
    }
  };

  const handleOpenAdjustModal = (item) => {
    setSelectedVariant(item);
    setMovementForm(EMPTY_MOVEMENT);
    setErrorMsg("");
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const qty = parseInt(movementForm.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Ingresa una cantidad válida mayor a 0.");
      return;
    }

    const isOutgoing = ["DAMAGE_OUT", "SUPPLIER_RETURN_OUT"].includes(movementForm.movement_type);
    if (isOutgoing && selectedVariant.quantity_on_hand < qty) {
      setErrorMsg(`Stock insuficiente. Solo hay ${selectedVariant.quantity_on_hand} unidades disponibles.`);
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.recordMovement({
        product_variant_id: Number(selectedVariant.product_variant_id),
        movement_type: movementForm.movement_type,
        quantity: qty,
        reference: movementForm.reference?.trim() || undefined,
        notes: movementForm.notes?.trim() || undefined,
      });

      await loadData();
      setSelectedVariant(null);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || "Error al registrar movimiento."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inventory-page">
      {/* Cabecera balanceada para que el botón no quede descuadrado ni sobresalga */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ flex: "1 1 300px" }}>
          <PageHeader
            title="Gestión de Inventario"
            subtitle="Control de existencias, filtros y recepción rápida por factura"
          />
        </div>
        <div>
          <button
            type="button"
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "#059669",
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              whiteSpace: "nowrap",
            }}
            onClick={handleOpenBatchModal}
          >
            <span>+ Ingreso por Factura</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="inventory-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "stock" ? "active" : ""}`}
          onClick={() => setActiveTab("stock")}
        >
          Existencias ({filteredInventory.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "movements" ? "active" : ""}`}
          onClick={() => setActiveTab("movements")}
        >
          Historial de Movimientos ({movements.length})
        </button>
      </div>

      <div className="data-card">
        {/* Barra con Búsqueda y Filtros */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            padding: "1rem",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <input
            type="text"
            placeholder={
              activeTab === "stock"
                ? "Buscar por nombre, SKU, marca o categoría..."
                : "Buscar por SKU, referencia o tipo..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="catalog-search-input"
            style={{ flex: "1 1 250px", minWidth: "220px" }}
          />

          {activeTab === "stock" && (
            <>
              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                style={{ padding: "0.55rem 0.8rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                <option value="ALL">Todas las marcas</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>

              <select
                value={filterStockStatus}
                onChange={(e) => setFilterStockStatus(e.target.value)}
                style={{ padding: "0.55rem 0.8rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                <option value="ALL">Todos los estados</option>
                <option value="IN_STOCK">En Existencia</option>
                <option value="LOW_STOCK">Stock Bajo</option>
                <option value="OUT_OF_STOCK">Agotados (0 uds)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: "0.55rem 0.8rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                <option value="name_asc">Nombre (A - Z)</option>
                <option value="stock_asc">Menor stock primero</option>
                <option value="stock_desc">Mayor stock primero</option>
              </select>
            </>
          )}
        </div>

        {loading ? (
          <p className="data-empty">Cargando datos de almacén...</p>
        ) : (
          <>
            {activeTab === "stock" && (
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
                  {filteredInventory.map((item) => {
                    const { category, gender } = categoryInfo(item);
                    const brand = BRAND_NAME.get(String(item.brand_id)) || item.brand || "Sin marca";
                    const variantLabel = [item.size && `Talla ${item.size}`, item.color]
                      .filter(Boolean)
                      .join(" · ");

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
                                SKU: <strong>{item.sku}</strong>
                                {variantLabel ? ` · ${variantLabel}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{brand}</div>
                          <span className="data-cell-muted">
                            {category} {gender ? `(${gender})` : ""}
                          </span>
                        </td>
                        <td>{formatPrice(item.price)}</td>
                        <td>
                          <strong className="stock-qty">{item.quantity_on_hand}</strong> unid.
                        </td>
                        <td>{item.reorder_level} unid.</td>
                        <td>{stockBadge(item.quantity_on_hand, item.reorder_level)}</td>
                        <td>
                          <button
                            type="button"
                            className="data-action-btn"
                            onClick={() => handleOpenAdjustModal(item)}
                          >
                            Ajustar Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* MODAL: AJUSTE INDIVIDUAL */}
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
                  <option value="DAMAGE_OUT">DAMAGE_OUT (Baja por Merma / Daño)</option>
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
                  placeholder="Ej: FAC-10293"
                  value={movementForm.reference}
                  onChange={(e) => setMovementForm({ ...movementForm, reference: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notas / Justificación</label>
                <textarea
                  rows="3"
                  placeholder="Observaciones de la entrada"
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelectedVariant(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Aplicando..." : "Aplicar Movimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INGRESO POR FACTURA (CON BUSCADOR + CHECKBOXES) */}
      {batchModalOpen && (
        <div className="inventory-modal-overlay" onClick={() => !submitting && setBatchModalOpen(false)}>
          <div
            className="inventory-modal-card"
            style={{ maxWidth: "760px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <h2>Recepción de Factura / Ingreso de Variantes</h2>
              <button
                type="button"
                className="close-btn"
                disabled={submitting}
                onClick={() => setBatchModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}
            {batchProgress && (
              <div style={{ padding: "0.75rem", background: "#eff6ff", color: "#1d4ed8", borderRadius: "6px", marginBottom: "1rem" }}>
                {batchProgress}
              </div>
            )}

            <form onSubmit={handleSaveBatch} className="inventory-form">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>N° Factura / Documento Proveedor *</label>
                  <input
                    type="text"
                    placeholder="Ej: FAC-89301"
                    value={batchReference}
                    onChange={(e) => setBatchReference(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Notas del Envío</label>
                  <input
                    type="text"
                    placeholder="Ej: Entrega parcial proveedor"
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* SECCIÓN BUSCADOR CON CHECKBOXES */}
              <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                  1. Buscar y marcar las variantes recibidas en la factura:
                </label>
                <input
                  type="text"
                  placeholder="Escribe 'S', nombre del producto o SKU para filtrar la lista..."
                  value={variantSearchText}
                  onChange={(e) => setVariantSearchText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.8rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    marginBottom: "0.6rem",
                  }}
                />

                {/* Lista filtrable de checkboxes */}
                <div
                  style={{
                    maxHeight: "150px",
                    overflowY: "auto",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    backgroundColor: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {searchedVariantsForBatch.map((v) => {
                    const isChecked = batchItems.some((i) => i.variantId === v.product_variant_id);
                    return (
                      <label
                        key={v.product_variant_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          padding: "0.35rem 0.5rem",
                          backgroundColor: isChecked ? "#e0f2fe" : "#ffffff",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.88rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleVariantInBatch(v)}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                        <span>
                          <strong>{v.sku}</strong> — {v.name} (Stock: {v.quantity_on_hand})
                        </span>
                      </label>
                    );
                  })}
                  {searchedVariantsForBatch.length === 0 && (
                    <div style={{ color: "#94a3b8", textAlign: "center", padding: "0.5rem" }}>
                      No se encontraron variantes que coincidan.
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN TABLA: CANTIDADES DE LAS VARIANTES MARCADAS */}
              <div style={{ marginTop: "1rem" }}>
                <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                  2. Ingresar cantidades a recibir ({batchItems.length} seleccionadas):
                </label>

                <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>SKU / Nombre</th>
                        <th style={{ width: "130px" }}>Cantidad Entrante</th>
                        <th style={{ width: "50px", textAlign: "center" }}>Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchItems.map((item) => (
                        <tr key={item.variantId}>
                          <td>
                            <strong>{item.sku}</strong>
                            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{item.name}</div>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleBatchQtyChange(item.variantId, e.target.value)}
                              style={{
                                width: "100%",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                              }}
                              required
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleVariantInBatch({ product_variant_id: item.variantId })}
                              style={{
                                border: "none",
                                background: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: "1.1rem",
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                      {batchItems.length === 0 && (
                        <tr>
                          <td colSpan="3" style={{ textAlign: "center", color: "#94a3b8", padding: "1.2rem" }}>
                            Marca las casillas arriba para agregar variantes a esta factura.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: "1.2rem" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={submitting}
                  onClick={() => setBatchModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || batchItems.length === 0}
                >
                  {submitting ? "Registrando Lote..." : `Guardar Factura (${batchItems.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
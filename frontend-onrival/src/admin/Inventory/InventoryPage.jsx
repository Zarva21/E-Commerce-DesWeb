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

  // Cuadro de búsqueda
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de ajuste de stock
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT);
  const [errorMsg, setErrorMsg] = useState("");

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

  // Filtrado reactivo en inventario
  const q = searchQuery.trim().toLowerCase();
  const filteredInventory = useMemo(() => {
    if (!q) return inventory;
    return inventory.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const sku = String(item.sku || "").toLowerCase();
      const brand = (BRAND_NAME.get(String(item.brand_id)) || item.brand || "").toLowerCase();
      const { category } = categoryInfo(item);
      return (
        name.includes(q) ||
        sku.includes(q) ||
        brand.includes(q) ||
        category.toLowerCase().includes(q)
      );
    });
  }, [inventory, q]);

  const filteredMovements = useMemo(() => {
    if (!q) return movements;
    return movements.filter((mov) => {
      const sku = (mov.sku || skuByVariant.get(String(mov.product_variant_id)) || "").toLowerCase();
      const ref = String(mov.reference || "").toLowerCase();
      const type = String(mov.movement_type || "").toLowerCase();
      return sku.includes(q) || ref.includes(q) || type.includes(q);
    });
  }, [movements, q, skuByVariant]);

  // Modal para ajuste manual
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
    // Se envía el id numérico y la cantidad parseada
    await inventoryService.recordMovement({
      product_variant_id: Number(selectedVariant.product_variant_id),
      movement_type: movementForm.movement_type,
      quantity: qty,
      reference: movementForm.reference?.trim() || undefined,
      notes: movementForm.notes?.trim() || undefined,
    });

    // Recargar los datos reales confirmados por la base de datos
    await loadData();
    setSelectedVariant(null);
  } catch (err) {
    // Mostrar el error genuino retornado por Express / PostgreSQL
    const serverMessage =
      err.response?.data?.message ||
      err.message ||
      "Error al registrar el movimiento en el servidor.";
    console.error("[Inventory Error]:", serverMessage);
    setErrorMsg(serverMessage);
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="inventory-page">
      <PageHeader
        title="Gestión de Inventario"
        subtitle="Control de existencias y movimientos por almacén"
      />

      {/* Pestañas de Navegación */}
      <div className="inventory-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "stock" ? "active" : ""}`}
          onClick={() => setActiveTab("stock")}
        >
          Existencias ({inventory.length})
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
        {/* Barra con Cuadro de Búsqueda */}
        <div className="catalog-filter-bar" style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder={
              activeTab === "stock"
                ? "Buscar por nombre, SKU, marca o categoría..."
                : "Buscar por SKU, referencia o tipo de movimiento..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="catalog-search-input"
            style={{ width: "100%", maxWidth: "420px" }}
          />
        </div>

        {loading ? (
          <p className="data-empty">Cargando datos de almacén...</p>
        ) : (
          <>
            {activeTab === "stock" && (
              <>
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
                            <div className="data-actions">
                              <button
                                type="button"
                                className="data-action-btn"
                                onClick={() => handleOpenAdjustModal(item)}
                              >
                                Ajustar Stock
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredInventory.length === 0 && (
                  <p className="data-empty">No se encontraron productos que coincidan con la búsqueda.</p>
                )}
              </>
            )}

            {activeTab === "movements" && (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Variante (SKU)</th>
                      <th>Tipo Movimiento</th>
                      <th>Cantidad</th>
                      <th>Referencia</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((mov) => (
                      <tr key={mov.id}>
                        <td className="data-cell-muted">{formatDate(mov.created_at || mov.createdAt)}</td>
                        <td>
                          <strong>{mov.sku ?? skuByVariant.get(String(mov.product_variant_id)) ?? `#${mov.product_variant_id}`}</strong>
                        </td>
                        <td>
                          <span className={`movement-tag tag-${String(mov.movement_type).toLowerCase()}`}>
                            {mov.movement_type}
                          </span>
                        </td>
                        <td>
                          <strong className={Number(mov.quantity) > 0 ? "qty-plus" : "qty-minus"}>
                            {Number(mov.quantity) > 0 ? `+${mov.quantity}` : mov.quantity}
                          </strong>
                        </td>
                        <td>{mov.reference || "-"}</td>
                        <td className="data-cell-muted">{mov.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredMovements.length === 0 && (
                  <p className="data-empty">No se encontraron movimientos registrados con ese criterio.</p>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* MODAL DE AJUSTE DE STOCK */}
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
                <label>Referencia / N° Documento</label>
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
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={submitting}
                  onClick={() => setSelectedVariant(null)}
                >
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
    </div>
  );
}
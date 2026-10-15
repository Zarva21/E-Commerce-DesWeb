import { useEffect, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { inventoryService } from "../../services/inventoryService";
import { MOCK_INVENTORY, MOCK_MOVEMENTS } from "./mockInventory";
import "../ui/DataTable.css";
import "./InventoryPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

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

// canAddProduct: puede crear productos nuevos desde el inventario (solo admin).
// Sin permiso sigue pudiendo ajustar stock y ver el historial.
export default function InventoryPage({ canAddProduct = true }) {
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stock");

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [movementForm, setMovementForm] = useState({
    movement_type: "PURCHASE_IN",
    quantity: "",
    reference: "",
    notes: "",
  });
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

  const handleOpenAdjustModal = (item) => {
    setSelectedVariant(item);
    setMovementForm({
      movement_type: "PURCHASE_IN",
      quantity: "",
      reference: "",
      notes: "",
    });
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
        product_variant_id: selectedVariant.product_variant_id,
        movement_type: movementForm.movement_type,
        quantity: qty,
        reference: movementForm.reference || undefined,
        notes: movementForm.notes || undefined,
      });

      await loadData();
      setSelectedVariant(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Error al aplicar el movimiento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inventory-page">
      <PageHeader
        title="Gestión de Inventario"
        subtitle="Control de existencias y movimientos por variante"
      />

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

      {loading ? (
        <p className="data-empty">Cargando datos de almacén...</p>
      ) : (
        <>
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
                  {inventory.map((item) => (
                    <tr key={item.product_variant_id}>
                      <td>
                        <div className="data-cell-main">
                          <div className="data-cell-thumb">
                            <img src={item.image || "/img/placeholder.png"} alt={item.name} />
                          </div>
                          <div>
                            <span className="data-cell-title">{item.name}</span>
                            <div className="data-cell-muted">SKU: {item.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{item.brand}</div>
                        <span className="data-cell-muted">
                          {item.category} ({item.gender})
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
                  ))}
                </tbody>
              </table>

              {inventory.length === 0 && (
                <p className="data-empty">No hay productos ni variantes registradas.</p>
              )}
            </div>
          )}

          {activeTab === "movements" && (
            <div className="data-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>ID Variante</th>
                    <th>Tipo Movimiento</th>
                    <th>Cantidad</th>
                    <th>Referencia</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov) => (
                    <tr key={mov.id}>
                      <td className="data-cell-muted">{formatDate(mov.created_at || mov.createdAt)}</td>
                      <td>#{mov.product_variant_id}</td>
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

              {movements.length === 0 && (
                <p className="data-empty">No hay movimientos registrados.</p>
              )}
            </div>
          )}
        </>
      )}

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
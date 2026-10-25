import { useEffect, useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { couponService } from "../../services/couponService";
import { catalogService } from "../../services/catalogService";
import api from "../../config/api";
import { MOCK_OFFERS } from "./mockOffers";
import "../ui/DataTable.css";
import "./OffersPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
};

const toInputDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingOffer, setEditingOffer] = useState(null); // null = Crear, objeto = Editar

  // Catálogos para restricciones
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Formulario
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "PERCENTAGE",
    discount_value: "",
    max_uses: "",
    valid_from: "",
    valid_to: "",
    scope: "GLOBAL", // 'GLOBAL' | 'CUSTOMER' | 'PRODUCT' | 'CATEGORY'
    customer_id: "",
    product_id: "",
    category_id: "",
  });

  const [formError, setFormError] = useState("");

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [couponsRes, prodsRes, catsRes, custsRes] = await Promise.allSettled([
        couponService.getAll(),
        catalogService.getProducts(),
        catalogService.getCategories(),
        api.get("/users/customers").then((r) => r.data?.data || r.data || []),
      ]);

      if (couponsRes.status === "fulfilled" && Array.isArray(couponsRes.value)) {
        setOffers(couponsRes.value.length > 0 ? couponsRes.value : MOCK_OFFERS);
      } else {
        setOffers(MOCK_OFFERS);
      }

      if (prodsRes.status === "fulfilled") setProducts(prodsRes.value || []);
      if (catsRes.status === "fulfilled") setCategories(catsRes.value || []);
      if (custsRes.status === "fulfilled") setCustomers(custsRes.value || []);
    } catch (err) {
      console.warn("Fallo cargando catálogos de ofertas:", err);
      setOffers(MOCK_OFFERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const toggleActive = async (offer) => {
    setUpdatingId(offer.id);
    const newStatus = !offer.is_active;

    try {
      await couponService.update(offer.id, { is_active: newStatus });
      setOffers((prev) =>
        prev.map((item) => (item.id === offer.id ? { ...item, is_active: newStatus } : item))
      );
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo actualizar el estado del cupón.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingOffer(null);
    setFormError("");
    setFormData({
      code: "",
      description: "",
      discount_type: "PERCENTAGE",
      discount_value: "",
      max_uses: "",
      valid_from: new Date().toISOString().split("T")[0],
      valid_to: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      scope: "GLOBAL",
      customer_id: "",
      product_id: "",
      category_id: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (offer) => {
    setEditingOffer(offer);
    setFormError("");

    let initialScope = "GLOBAL";
    if (offer.customer_id) initialScope = "CUSTOMER";
    else if (offer.product_id) initialScope = "PRODUCT";
    else if (offer.category_id) initialScope = "CATEGORY";

    setFormData({
      code: offer.code,
      description: offer.description || "",
      discount_type: String(offer.discount_type).toUpperCase(),
      discount_value: offer.discount_value,
      max_uses: offer.max_uses !== null && offer.max_uses !== undefined ? offer.max_uses : "",
      valid_from: toInputDate(offer.valid_from),
      valid_to: toInputDate(offer.valid_to),
      scope: initialScope,
      customer_id: offer.customer_id || "",
      product_id: offer.product_id || "",
      category_id: offer.category_id || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.code.trim()) {
      setFormError("El código del cupón es obligatorio.");
      return;
    }
    if (!formData.discount_value || Number(formData.discount_value) <= 0) {
      setFormError("El valor del descuento debe ser mayor a 0.");
      return;
    }
    if (formData.discount_type === "PERCENTAGE" && Number(formData.discount_value) > 100) {
      setFormError("El descuento porcentual no puede exceder el 100%.");
      return;
    }
    if (!formData.valid_from || !formData.valid_to) {
      setFormError("Debes especificar fecha de inicio y fin.");
      return;
    }
    if (new Date(formData.valid_from) >= new Date(formData.valid_to)) {
      setFormError("La fecha de inicio debe ser anterior a la de fin.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        valid_from: new Date(`${formData.valid_from}T00:00:00`).toISOString(),
        valid_to: new Date(`${formData.valid_to}T23:59:59`).toISOString(),
        customer_id: formData.scope === "CUSTOMER" && formData.customer_id ? Number(formData.customer_id) : null,
        product_id: formData.scope === "PRODUCT" && formData.product_id ? Number(formData.product_id) : null,
        category_id: formData.scope === "CATEGORY" && formData.category_id ? Number(formData.category_id) : null,
      };

      if (editingOffer) {
        await couponService.update(editingOffer.id, payload);
      } else {
        await couponService.create({ ...payload, is_active: true });
      }

      await loadInitialData();
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.message || "Error al procesar el cupón.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="offers-page">
      <PageHeader
        title="Ofertas y Cupones"
        subtitle="Gestión de promociones por cliente, producto o categoría"
        actionLabel="Crear nuevo cupón"
        onAction={openCreateModal}
      />

      <div className="data-card">
        {loading ? (
          <p className="data-empty">Cargando cupones...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Código / Descripción</th>
                <th>Descuento</th>
                <th>Usos / Límite</th>
                <th>Alcance / Aplicación</th>
                <th>Vigencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                let scopeLabel = "Público General";
                if (offer.customer_id) scopeLabel = `Cliente #${offer.customer_id}`;
                else if (offer.product_id) scopeLabel = `Producto #${offer.product_id}`;
                else if (offer.category_id) scopeLabel = `Categoría #${offer.category_id}`;

                return (
                  <tr key={offer.id}>
                    <td>
                      <div className="coupon-code-badge">{offer.code}</div>
                      <div className="data-cell-muted offer-desc">
                        {offer.description || "Sin descripción"}
                      </div>
                    </td>
                    <td>
                      <strong className="offer-discount-value">
                        {String(offer.discount_type).toUpperCase() === "PERCENTAGE"
                          ? `${Number(offer.discount_value)}%`
                          : formatPrice(offer.discount_value)}
                      </strong>
                    </td>
                    <td>
                      <span className="offer-uses">
                        {offer.used_count || 0} / {offer.max_uses ?? "∞"}
                      </span>
                    </td>
                    <td>
                      <span className={`coupon-type-tag ${offer.customer_id ? "type-credit" : "type-general"}`}>
                        {scopeLabel}
                      </span>
                    </td>
                    <td className="data-cell-muted">
                      {formatDate(offer.valid_from)} – {formatDate(offer.valid_to)}
                    </td>
                    <td>
                      <StatusBadge
                        label={offer.is_active ? "Activo" : "Inactivo"}
                        tone={offer.is_active ? "success" : "neutral"}
                      />
                    </td>
                    <td>
                      <div className="data-actions">
                        <button
                          type="button"
                          className="data-action-btn"
                          onClick={() => openEditModal(offer)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === offer.id}
                          className="data-action-btn"
                          onClick={() => toggleActive(offer)}
                        >
                          {updatingId === offer.id
                            ? "..."
                            : offer.is_active
                            ? "Desactivar"
                            : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && offers.length === 0 && (
          <p className="data-empty">Todavía no hay cupones creados en la base de datos.</p>
        )}
      </div>

      {/* MODAL CREAR / EDITAR CUPÓN */}
      {isModalOpen && (
        <div className="offers-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="offers-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="offers-modal-header">
              <h2>{editingOffer ? `Editar Cupón: ${editingOffer.code}` : "Crear Nuevo Cupón"}</h2>
              <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            {formError && <div className="modal-error-banner">{formError}</div>}

            <form onSubmit={handleSubmit} className="offers-form">
              <div className="form-group">
                <label>Código del cupón *</label>
                <input
                  type="text"
                  name="code"
                  placeholder="Ej: NAVIDAD2026"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  name="description"
                  placeholder="Ej: 20% de descuento en Calzado deportivo"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de Descuento</label>
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED">Monto Fijo (GTQ)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Valor del Descuento *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="discount_value"
                    placeholder={formData.discount_type === "PERCENTAGE" ? "20" : "50.00"}
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* SECCIÓN: ALCANCE Y RESTRICCIÓN DEL CUPÓN */}
              <div className="form-group" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }}>
                <label style={{ fontWeight: 600 }}>¿A quién o a qué aplica este cupón?</label>
                <select name="scope" value={formData.scope} onChange={handleInputChange}>
                  <option value="GLOBAL">Público General (Cualquier producto / cliente)</option>
                  <option value="CUSTOMER">Cliente Específico (Saldo a favor / Cupón personal)</option>
                  <option value="PRODUCT">Producto Específico</option>
                  <option value="CATEGORY">Categoría Completa</option>
                </select>
              </div>

              {formData.scope === "CUSTOMER" && (
                <div className="form-group">
                  <label>Selecciona el Cliente Beneficiario *</label>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seleccione cliente...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.first_name} {c.last_name} ({c.user?.email || c.email || "Sin correo"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.scope === "PRODUCT" && (
                <div className="form-group">
                  <label>Selecciona el Producto Elegible *</label>
                  <select
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seleccione producto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.price || p.sale_price)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.scope === "CATEGORY" && (
                <div className="form-group">
                  <label>Selecciona la Categoría Elegible *</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seleccione categoría...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha Inicio *</label>
                  <input
                    type="date"
                    name="valid_from"
                    value={formData.valid_from}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fecha Fin *</label>
                  <input
                    type="date"
                    name="valid_to"
                    value={formData.valid_to}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Límite de Usos Totales (Opcional)</label>
                <input
                  type="number"
                  name="max_uses"
                  placeholder="Ej: 100 (dejar vacío para ilimitado)"
                  value={formData.max_uses}
                  onChange={handleInputChange}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting
                    ? "Guardando..."
                    : editingOffer
                    ? "Actualizar Cupón"
                    : "Guardar Cupón"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
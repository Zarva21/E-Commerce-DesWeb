import { useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { MOCK_OFFERS } from "./mockOffers";
import "../ui/DataTable.css";
import "./OffersPage.css";

// Formateador de moneda GTQ
const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value) =>
  new Date(value).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });

export default function OffersPage() {
  const [offers, setOffers] = useState(MOCK_OFFERS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario de creación
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    max_uses: "",
    valid_from: "",
    valid_to: "",
  });

  const [formError, setFormError] = useState("");

  // Cambiar estado activo/inactivo
  const toggleActive = (id) => {
    // TODO API: PUT /api/coupons/:id enviando { is_active: !current }
    setOffers((prev) =>
      prev.map((offer) =>
        offer.id === id ? { ...offer, is_active: !offer.is_active } : offer
      )
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCoupon = (e) => {
    e.preventDefault();
    setFormError("");

    // Validaciones sincronizadas con las reglas de coupon.service.js
    if (!formData.code.trim()) {
      setFormError("El código del cupón es obligatorio.");
      return;
    }
    if (!formData.discount_value || Number(formData.discount_value) <= 0) {
      setFormError("El valor del descuento debe ser mayor a 0.");
      return;
    }
    if (formData.discount_type === "percentage" && Number(formData.discount_value) > 100) {
      setFormError("El descuento porcentual no puede exceder el 100%.");
      return;
    }
    if (!formData.valid_from || !formData.valid_to) {
      setFormError("Debes especificar la fecha de inicio y fin.");
      return;
    }
    if (new Date(formData.valid_from) >= new Date(formData.valid_to)) {
      setFormError("La fecha de inicio debe ser anterior a la de fin.");
      return;
    }

    // Objeto listo para enviar a POST /api/coupons
    const newCoupon = {
      id: Date.now(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description,
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      max_uses: formData.max_uses ? Number(formData.max_uses) : null,
      used_count: 0,
      valid_from: new Date(formData.valid_from).toISOString(),
      valid_to: new Date(formData.valid_to).toISOString(),
      is_active: true,
      customer_id: null,
    };

    setOffers([newCoupon, ...offers]);
    setIsModalOpen(false);
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      max_uses: "",
      valid_from: "",
      valid_to: "",
    });
  };

  return (
    <div className="offers-page">
      <PageHeader
        title="Ofertas y Cupones"
        subtitle="Gestión de promociones, descuentos y saldos a favor"
        actionLabel="Crear nuevo cupón"
        onAction={() => setIsModalOpen(true)}
      />

      <div className="data-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código / Descripción</th>
              <th>Descuento</th>
              <th>Usos / Límite</th>
              <th>Tipo</th>
              <th>Vigencia</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id}>
                <td>
                  <div className="coupon-code-badge">{offer.code}</div>
                  <div className="data-cell-muted offer-desc">{offer.description || "Sin descripción"}</div>
                </td>
                <td>
                  <strong className="offer-discount-value">
                    {offer.discount_type === "percentage"
                      ? `${offer.discount_value}%`
                      : formatPrice(offer.discount_value)}
                  </strong>
                </td>
                <td>
                  <span className="offer-uses">
                    {offer.used_count} / {offer.max_uses !== null ? offer.max_uses : "∞"}
                  </span>
                </td>
                <td>
                  <span className={`coupon-type-tag ${offer.customer_id ? "type-credit" : "type-general"}`}>
                    {offer.customer_id ? `Saldo a favor (ID #${offer.customer_id})` : "Público"}
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
                      onClick={() => toggleActive(offer.id)}
                    >
                      {offer.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {offers.length === 0 && <p className="data-empty">Todavía no hay cupones creados.</p>}
      </div>

      {/* MODAL CREAR CUPÓN */}
      {isModalOpen && (
        <div className="offers-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="offers-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="offers-modal-header">
              <h2>Crear nuevo cupón / oferta</h2>
              <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            {formError && <div className="modal-error-banner">{formError}</div>}

            <form onSubmit={handleCreateCoupon} className="offers-form">
              <div className="form-group">
                <label>Código del cupón *</label>
                <input
                  type="text"
                  name="code"
                  placeholder="Ej: VERANO2026"
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
                  placeholder="Ej: 15% de descuento en colección verano"
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
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo (Q)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="discount_value"
                    placeholder={formData.discount_type === "percentage" ? "15" : "100.00"}
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

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
                <label>Límite de Usos (dejar vacío para ilimitado)</label>
                <input
                  type="number"
                  name="max_uses"
                  placeholder="Ej: 50"
                  value={formData.max_uses}
                  onChange={handleInputChange}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Cupón
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
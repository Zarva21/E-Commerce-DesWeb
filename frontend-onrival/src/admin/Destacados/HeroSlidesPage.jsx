import { useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { useHeroSlides } from "../../context/HeroSlidesContext";
import { MOCK_PRODUCTS } from "../../components/Catalog/mockProducts";
import "../ui/DataTable.css";
import "../Catalog/CatalogPage.css";
import "./HeroSlidesPage.css";

// Productos y categorías de la TIENDA (los mismos que ve el cliente en el catálogo)
const STORE_PRODUCTS = [
  ...new Map(
    Object.entries(MOCK_PRODUCTS)
      .filter(([key]) => key !== "catalogo")
      .flatMap(([, list]) => list)
      .map((p) => [p.id, p])
  ).values(),
];
const STORE_CATEGORIES = [...new Set(STORE_PRODUCTS.map((p) => p.category).filter(Boolean))];

const EMPTY_FORM = {
  image: "",
  eyebrow: "",
  title: "",
  ctaLabel: "",
  linkType: "none", // none | product | offers | category
  productId: "",
  category: "",
};

const slideToForm = (s) => ({
  image: s.image,
  eyebrow: s.eyebrow ?? "",
  title: s.title,
  ctaLabel: s.ctaLabel ?? "",
  linkType: s.link?.type ?? "none",
  productId: s.link?.productId ?? "",
  category: s.link?.category ?? "",
});

const formToSlide = (f) => {
  let link = { type: "none" };
  if (f.linkType === "product") link = { type: "product", productId: f.productId };
  if (f.linkType === "offers") link = { type: "offers" };
  if (f.linkType === "category") link = { type: "category", category: f.category };

  return {
    image: f.image,
    eyebrow: f.eyebrow.trim(),
    title: f.title.trim(),
    // sin destino no tiene sentido mostrar botón
    ctaLabel: link.type === "none" ? "" : f.ctaLabel.trim(),
    link,
  };
};

const destinationLabel = (link) => {
  if (!link || link.type === "none") return "Sin enlace";
  if (link.type === "offers") return "Filtro: Ofertas";
  if (link.type === "category") return `Filtro: Categoría ${link.category}`;
  const prod = STORE_PRODUCTS.find((p) => p.id === link.productId);
  return `Producto: ${prod?.name ?? link.productId}`;
};

export default function HeroSlidesPage() {
  const { slides, addSlide, updateSlide, toggleSlide, removeSlide } = useHeroSlides();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = nuevo
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (slide) => {
    setEditingId(slide.id);
    setForm(slideToForm(slide));
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
  };

  // TODO: con backend, acá se sube el archivo (multer) y se guarda la URL que devuelva.
  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setField("image", reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.image) {
      setError("Seleccioná una imagen para el destacado");
      return;
    }
    const data = formToSlide(form);
    if (editingId) updateSlide(editingId, data);
    else addSlide(data);
    closeModal();
  };

  const handleDelete = (slide) => {
    if (window.confirm(`¿Eliminar el destacado "${slide.title}"?`)) removeSlide(slide.id);
  };

  const productKnown = STORE_PRODUCTS.some((p) => p.id === form.productId);

  return (
    <div className="catalog-page">
      <PageHeader
        title="Destacados del menú principal"
        subtitle="Administra las imágenes y anuncios del carrusel de la página de inicio"
        actionLabel="Nuevo destacado"
        onAction={openCreate}
      />

      <div className="data-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Contenido</th>
              <th>Botón</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {slides.map((s) => (
              <tr key={s.id}>
                <td>
                  <img className="hero-admin-thumb" src={s.image} alt={s.title} />
                </td>
                <td>
                  <span className="data-cell-title">{s.title}</span>
                  <div className="data-cell-muted">{s.eyebrow || "Sin texto"}</div>
                </td>
                <td>{s.ctaLabel || <span className="data-cell-muted">Sin botón</span>}</td>
                <td className="data-cell-muted">{destinationLabel(s.link)}</td>
                <td>
                  <StatusBadge
                    label={s.active ? "Visible" : "Oculto"}
                    tone={s.active ? "success" : "muted"}
                  />
                </td>
                <td>
                  <div className="data-actions">
                    <button type="button" className="data-action-btn" onClick={() => openEdit(s)}>
                      Editar
                    </button>
                    <button type="button" className="data-action-btn" onClick={() => toggleSlide(s.id)}>
                      {s.active ? "Ocultar" : "Mostrar"}
                    </button>
                    <button type="button" className="data-action-btn" onClick={() => handleDelete(s)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {slides.length === 0 && (
          <p className="data-empty">No hay destacados. El carrusel no se mostrará en el inicio.</p>
        )}
      </div>

      {modalOpen && (
        <div className="catalog-modal-overlay" onClick={closeModal}>
          <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>{editingId ? "Editar destacado" : "Nuevo destacado"}</h2>
              <button type="button" className="close-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="catalog-form">
              <div className="form-group">
                <label>Imagen *</label>
                <input type="file" accept="image/*" onChange={handleImage} />
                {form.image && <img className="hero-admin-preview" src={form.image} alt="Vista previa" />}
              </div>

              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Ej: ADIDAS TRIONDA FINAL PRO"
                  required
                />
              </div>

              <div className="form-group">
                <label>Texto (sobre el título)</label>
                <input
                  type="text"
                  value={form.eyebrow}
                  onChange={(e) => setField("eyebrow", e.target.value)}
                  placeholder="Ej: NUEVO BALÓN"
                />
              </div>

              <div className="form-group">
                <label>El botón lleva a</label>
                <select value={form.linkType} onChange={(e) => setField("linkType", e.target.value)}>
                  <option value="none">Ningún lugar (sin botón)</option>
                  <option value="product">Un producto en específico</option>
                  <option value="offers">Ofertas (filtro del catálogo)</option>
                  <option value="category">Una categoría (filtro del catálogo)</option>
                </select>
              </div>

              {form.linkType === "product" && (
                <div className="form-group">
                  <label>Producto *</label>
                  <select
                    value={form.productId}
                    onChange={(e) => setField("productId", e.target.value)}
                    required
                  >
                    <option value="">Seleccione producto...</option>
                    {form.productId && !productKnown && (
                      <option value={form.productId}>Actual: {form.productId}</option>
                    )}
                    {STORE_PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.linkType === "category" && (
                <div className="form-group">
                  <label>Categoría *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    required
                  >
                    <option value="">Seleccione categoría...</option>
                    {STORE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.linkType !== "none" && (
                <div className="form-group">
                  <label>Texto del botón *</label>
                  <input
                    type="text"
                    value={form.ctaLabel}
                    onChange={(e) => setField("ctaLabel", e.target.value)}
                    placeholder="Ej: Ir a comprar"
                    required
                  />
                </div>
              )}

              {error && <p className="hero-admin-error">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? "Guardar cambios" : "Añadir destacado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
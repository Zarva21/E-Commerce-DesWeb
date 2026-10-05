import { useEffect, useState } from "react";
import FilterPanel from "./FilterPanel";
import ProductCard from "./ProductCard";
import { catalogService } from "../../services/catalogService";
import { DEFAULT_FILTERS } from "./filterOptions";
import { normalize } from "../../utils/normalize";
import "./CatalogSection.css";

const SECTION_LINKS = [
  { id: "hombre", label: "Hombre" },
  { id: "mujer", label: "Mujer" },
  { id: "accesorios", label: "Accesorios" },
];

function applyFilters(products, filters) {
  return products.filter((product) => {
    if (filters.categoria && normalize(product.category) !== normalize(filters.categoria)) return false;
    if (filters.marca && normalize(product.brand) !== normalize(filters.marca)) return false;
    if (filters.deporte && normalize(product.sport) !== normalize(filters.deporte)) return false;
    if (filters.oferta && !product.onSale) return false;
    if (product.price < filters.priceMin || product.price > filters.priceMax) return false;
    return true;
  });
}

export default function CatalogSection({ section, onSelectSection, onSelectProduct }) {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const isGeneralCatalog = section === "catalogo";

  useEffect(() => {
    setLoading(true);
    catalogService
      .getAll()
      .then((data) => setAllProducts(data))
      .catch((err) => console.error("Error al obtener catálogo:", err))
      .finally(() => setLoading(false));
  }, []);

  // Filtrar base según la sección activa ("hombre", "mujer", "accesorios" o todo)
  const baseProducts = isGeneralCatalog
    ? allProducts
    : allProducts.filter((p) => {
        const secNorm = normalize(section || "");
        return (
          normalize(p.gender).includes(secNorm) ||
          normalize(p.category).includes(secNorm)
        );
      });

  const products = applyFilters(baseProducts, filters);

  if (loading) {
    return (
      <section id="catalogo" className="catalog">
        <div style={{ padding: "3rem", width: "100%", textAlign: "center" }}>
          <p>Cargando artículos deportivos...</p>
        </div>
      </section>
    );
  }

  // Dentro de CatalogSection.jsx:
console.log("1. Productos directos de la BD:", allProducts);
console.log("2. BaseProducts tras filtro de sección:", baseProducts);
console.log("3. Filtros activos actualmente:", filters);
console.log("4. Productos que pasaron todos los filtros:", products);


  return (
    <section id="catalogo" className="catalog">
      <aside className="catalog-sidebar">
        <p className="catalog-eyebrow">Catálogo</p>
        <h2>ARTÍCULOS DEPORTIVOS</h2>

        {isGeneralCatalog && (
          <div className="catalog-section-links">
            {SECTION_LINKS.map((link) => (
              <button key={link.id} type="button" className="catalog-section-link" onClick={() => onSelectSection(link.id)}>
                {link.label}
              </button>
            ))}
          </div>
        )}

        <button type="button" className="catalog-filter-toggle" onClick={() => setPanelOpen(true)}>
          Filtrar
        </button>
      </aside>

      <div className="catalog-grid">
        {products.length > 0 ? (
          products.map((product) => (
            <ProductCard key={product.id} {...product} onSelect={onSelectProduct} />
          ))
        ) : (
          <div className="catalog-empty">
            <span className="catalog-empty-mark" aria-hidden="true" />
            <p>No hay productos que coincidan con esos filtros.</p>
          </div>
        )}
      </div>

      <FilterPanel
        open={panelOpen}
        value={filters}
        onClose={() => setPanelOpen(false)}
        onApply={setFilters}
      />
    </section>
  );
}
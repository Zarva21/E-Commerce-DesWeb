import { useEffect, useState } from "react";
import ProductCard from "../Catalog/ProductCard";
import { catalogService } from "../../services/catalogService";
import "./HomeProductCarousel.css";

const ITEMS_PER_PAGE = 4;
const MAX_PRODUCTS = 8;

export default function HomeProductCarousel({ onSelectProduct, onViewCatalog }) {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogService
      .getAll()
      .then((data) => setProducts(data.slice(0, MAX_PRODUCTS)))
      .catch((err) => console.error("Error al cargar carrusel de inicio:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));

  if (loading) {
    return (
      <section className="home-carousel">
        <p style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
          Cargando destacados...
        </p>
      </section>
    );
  }

  if (products.length === 0) return null;

  const start = page * ITEMS_PER_PAGE;
  const visibleProducts = products.slice(start, start + ITEMS_PER_PAGE);
  const isFirstPage = page === 0;
  const isLastPage = page === totalPages - 1;

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <section className="home-carousel">
      <div className="home-carousel-head">
        <h2>DESTACADOS DEL CATÁLOGO</h2>
        <div className="home-carousel-arrows">
          <button type="button" onClick={goPrev} disabled={isFirstPage} aria-label="Productos anteriores">‹</button>
          <button type="button" onClick={goNext} disabled={isLastPage} aria-label="Siguientes productos">›</button>
        </div>
      </div>
      <div className="home-carousel-grid">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} {...product} onSelect={onSelectProduct} />
        ))}
      </div>
      {isLastPage && (
        <button type="button" className="home-carousel-more" onClick={onViewCatalog}>
          <span>VER MÁS</span>
        </button>
      )}
    </section>
  );
}
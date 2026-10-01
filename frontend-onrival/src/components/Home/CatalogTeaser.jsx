import "./CatalogTeaser.css";

export default function CatalogTeaser({ onViewCatalog }) {
  return (
    <section className="catalog-teaser">
      <h2 className="catalog-teaser-title">Aquí encontrás de todo</h2>

      <div className="catalog-teaser-images">
        <div className="catalog-teaser-image">
          <img src="/img/catalogo.jpg" alt="Catálogo Sporty" />
        </div>
        <div className="catalog-teaser-image">
          <img src="/img/catalogo2.jpg" alt="Catálogo Sporty" />
        </div>
      </div>

      <button type="button" className="catalog-teaser-cta" onClick={onViewCatalog}>
        <span>VER CATÁLOGO COMPLETO</span>
      </button>
    </section>
  );
}
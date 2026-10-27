import "./ProductCard.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", minimumFractionDigits: 2 }).format(value);

export default function ProductCard({ id, image, brand, name, gender, price, onSelect }) {
  return (
    <article
      className="product-card"
      onClick={() => onSelect?.(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.(id);
      }}
    >
      <div className="product-card-image">
        <img src={image} alt={name} />
      </div>
      <div className="product-card-info">
        <p className="product-card-brand">{brand}</p>
        <h3 className="product-card-name">{name}</h3>
        <p className="product-card-gender">{gender}</p>
        <p className="product-card-price">{formatPrice(price)}</p>
      </div>
    </article>
  );
}
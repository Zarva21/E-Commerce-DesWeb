import "./CartItem.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

export default function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="cart-item">
      <div className="cart-item-image">
        <img src={item.image} alt={item.name} />
      </div>

      <div className="cart-item-info">
        <p className="cart-item-brand">{item.brand}</p>
        <h3 className="cart-item-name">{item.name}</h3>
        <p className="cart-item-gender">
          {item.gender} · Talla {item.size}
        </p>
      </div>

      <div className="cart-item-qty">
        <button type="button" onClick={() => onDecrease(item.cartId)} aria-label="Restar cantidad">−</button>
        <span>{item.quantity}</span>
        <button type="button" onClick={() => onIncrease(item.cartId)} aria-label="Sumar cantidad">+</button>
      </div>

      <p className="cart-item-price">{formatPrice(item.price * item.quantity)}</p>

      <button
        type="button"
        className="cart-item-remove"
        onClick={() => onRemove(item.cartId)}
        aria-label="Eliminar producto"
      >
        ✕
      </button>
    </div>
  );
}
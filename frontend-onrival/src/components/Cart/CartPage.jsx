import { useCart } from "../../context/CartContext";
import CartItem from "./CartItem";
import "./CartPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", minimumFractionDigits: 2 }).format(value);

export default function CartPage({ onContinueShopping, onCheckout }) {
  const { items, increase, decrease, remove, subtotal } = useCart();

  return (
    <section className="cart-page">
      <div className="cart-page-head">
        <p className="cart-eyebrow">Mi cuenta</p>
        <h1>CARRITO DE COMPRAS</h1>
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <span className="cart-empty-mark" aria-hidden="true" />
          <p>Todavía no agregaste productos a tu carrito.</p>
          <button type="button" className="cart-empty-cta" onClick={onContinueShopping}><span>Ir al catálogo</span></button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => (
              <CartItem key={item.cartId} item={item} onIncrease={increase} onDecrease={decrease} onRemove={remove} />
            ))}
          </div>
          <aside className="cart-summary">
            <h2>Resumen</h2>
            <div className="cart-summary-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="cart-summary-row"><span>Envío</span><span className="cart-summary-muted">Se calcula al finalizar</span></div>
            <div className="cart-summary-row cart-summary-total"><span>Total</span><span>{formatPrice(subtotal)}</span></div>
            <button type="button" className="cart-checkout" onClick={onCheckout}><span>Continuar con la compra</span></button>
          </aside>
        </div>
      )}
    </section>
  );
}
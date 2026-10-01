import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { SHIPPING_COST } from "./shippingCost";
import "./CheckoutPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const EMPTY_FORM = { nombre: "", numero: "", vencimiento: "", cvv: "" };

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatCVV(value) {
  return value.replace(/\D/g, "").slice(0, 4);
}

export default function CheckoutPage({ shippingData, onBack, onFinish }) {
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;
    if (name === "numero") formatted = formatCardNumber(value);
    if (name === "vencimiento") formatted = formatExpiry(value);
    if (name === "cvv") formatted = formatCVV(value);
    setForm((f) => ({ ...f, [name]: formatted }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: acá va la integración real con la pasarela de pago / API de pedidos
    console.log("pago", form, items, shippingData);
    clearCart();
    setSubmitted(true);
  };

  const total = subtotal + SHIPPING_COST;

  if (submitted) {
    return (
      <section className="checkout-page checkout-success">
        <div className="checkout-success-mark" aria-hidden="true">✓</div>
        <h1>¡Listo, tu pedido fue confirmado!</h1>
        <p>Te vamos a avisar cuando esté en camino.</p>
        <button type="button" className="checkout-submit" onClick={onFinish}>
          <span>Volver al menú principal</span>
        </button>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <button type="button" className="checkout-back" onClick={onBack}>
        ‹ Volver a datos de envío
      </button>

      <div className="checkout-head">
        <p className="checkout-eyebrow">Pago</p>
        <h1>DATOS DE PAGO</h1>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <label className="checkout-field">
            <span>Titular de la tarjeta</span>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Como aparece en la tarjeta"
              type="text"
              required
            />
          </label>

          <label className="checkout-field">
            <span>Número de tarjeta</span>
            <input
              name="numero"
              value={form.numero}
              onChange={handleChange}
              placeholder="0000 0000 0000 0000"
              type="text"
              inputMode="numeric"
              maxLength={19}
              required
            />
          </label>

          <div className="checkout-field-row">
            <label className="checkout-field">
              <span>Vencimiento</span>
              <input
                name="vencimiento"
                value={form.vencimiento}
                onChange={handleChange}
                placeholder="MM/AA"
                type="text"
                inputMode="numeric"
                maxLength={5}
                required
              />
            </label>
            <label className="checkout-field">
              <span>CVV</span>
              <input
                name="cvv"
                value={form.cvv}
                onChange={handleChange}
                placeholder="123"
                type="text"
                inputMode="numeric"
                maxLength={4}
                required
              />
            </label>
          </div>

          <button type="submit" className="checkout-submit">
            <span>CONFIRMAR PAGO</span>
          </button>
        </form>

        <aside className="checkout-summary">
          {shippingData && (
            <div className="checkout-shipping-recap">
              <h3>Enviar a</h3>
              <p className="checkout-recap-line"><strong>{shippingData.nombre}</strong></p>
              <p className="checkout-recap-line checkout-summary-muted">{shippingData.direccion}</p>
              {shippingData.direccion2 && (
                <p className="checkout-recap-line checkout-summary-muted">{shippingData.direccion2}</p>
              )}
              <p className="checkout-recap-line checkout-summary-muted">
                {shippingData.ciudad}, {shippingData.departamento}
              </p>
              <p className="checkout-recap-line checkout-summary-muted">{shippingData.telefono}</p>
            </div>
          )}

          <h2>TU PEDIDO</h2>
          <ul className="checkout-summary-list">
            {items.map((it) => (
              <li key={it.cartId}>
                <span>
                  {it.name} · {it.size} x{it.quantity}
                </span>
                <span>{formatPrice(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="checkout-summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="checkout-summary-row">
            <span>Envío</span>
            <span>{formatPrice(SHIPPING_COST)}</span>
          </div>
          <div className="checkout-summary-total">
            <span>TOTAL</span>
            <span>{formatPrice(total)}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
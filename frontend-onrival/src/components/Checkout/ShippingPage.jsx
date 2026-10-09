import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { SHIPPING_COST } from "./shippingCost";
import "./ShippingPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const EMPTY_FORM = {
  email: "",
  nombre: "",
  telefono: "",
  direccion: "",
  direccion2: "",
  ciudad: "",
  departamento: "",
};

export default function ShippingPage({ isLoggedIn = false, onBackToCart, onContinue }) {
  const { items, subtotal } = useCart();
  const [form, setForm] = useState(EMPTY_FORM);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Si está registrado no hay correo de invitado, así que no lo mandamos
    const { email, ...rest } = form;
    onContinue(isLoggedIn ? rest : form);
  };

  const total = subtotal + SHIPPING_COST;

  return (
    <section className="shipping-page">
      <button type="button" className="shipping-back" onClick={onBackToCart}>
        ‹ Volver al carrito
      </button>

      <div className="shipping-head">
        <p className="shipping-eyebrow">Envío</p>
        <h1>DATOS DE ENVÍO</h1>
      </div>

      <div className="shipping-layout">
        <form className="shipping-form" onSubmit={handleSubmit}>
          {!isLoggedIn && (
            <label className="shipping-field">
              <span>Contacto</span>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Correo electrónico"
                type="email"
                required
              />
            </label>
          )}

          <label className="shipping-field">
            <span>Nombre completo</span>
            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre y apellido" type="text" required />
          </label>

          <label className="shipping-field">
            <span>Teléfono</span>
            <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="0000-0000" type="tel" required />
          </label>

          <label className="shipping-field">
            <span>Dirección</span>
            <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Calle, avenida, zona..." type="text" required />
          </label>

          <label className="shipping-field">
            <span>Dirección 2 <span className="shipping-optional">(opcional)</span></span>
            <input name="direccion2" value={form.direccion2} onChange={handleChange} placeholder="Apto, referencia, etc." type="text" />
          </label>

          <div className="shipping-field-row">
            <label className="shipping-field">
              <span>Municipio</span>
              <input name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Ciudad" type="text" required />
            </label>
            <label className="shipping-field">
              <span>Departamento</span>
              <input name="departamento" value={form.departamento} onChange={handleChange} placeholder="Departamento" type="text" required />
            </label>
          </div>

          <button type="submit" className="shipping-submit">
            <span>Ir a pagar</span>
          </button>
        </form>

        <aside className="shipping-summary">
          <h2>TU PEDIDO</h2>
          <ul className="shipping-summary-list">
            {items.map((it) => (
              <li key={it.cartId}>
                <span>{it.name} · {it.size} x{it.quantity}</span>
                <span>{formatPrice(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="shipping-summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="shipping-summary-row">
            <span>Envío</span>
            <span>{formatPrice(SHIPPING_COST)}</span>
          </div>
          <div className="shipping-summary-row shipping-summary-total">
            <span>TOTAL</span>
            <span>{formatPrice(total)}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
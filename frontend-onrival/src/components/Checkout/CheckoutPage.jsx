import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardNumberElement } from "@stripe/react-stripe-js";
import { useCart } from "../../context/CartContext";
import { checkoutService } from "../../services/checkoutService";
import { couponService } from "../../services/couponService";
import { SHIPPING_COST } from "./shippingCost";
import StripeCardFields from "./StripeCardFields";
import "./CheckoutPage.css";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_TU_CLAVE");

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

const PAYMENT_METHODS = [
  { id: "CARD", label: "Tarjeta de crédito/débito", hint: "Pagás seguro en línea con Stripe" },
  { id: "CASH", label: "Pago contra entrega", hint: "Pagás en efectivo cuando recibís tu pedido" },
];

function CheckoutFormContent({ shippingData, onBack, onFinish }) {
  const stripe = useStripe();
  const elements = useElements();
  const { items, subtotal, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [cardHolder, setCardHolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Estados para Cupones
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount_amount, coupon_id }

  // Cálculo del total con descuento
  const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const total = Math.max(0, subtotal - discount) + SHIPPING_COST;

  // Manejador de validación de cupón
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await couponService.validate(couponInput.trim(), subtotal, items);
      setAppliedCoupon({
        code: couponInput.trim().toUpperCase(),
        discount_amount: Number(res.discount_amount),
        coupon_id: res.coupon_id,
      });
      setCouponInput("");
    } catch (err) {
      setCouponError(err.response?.data?.message || "Cupón no válido o no aplicable.");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const authUser = JSON.parse(localStorage.getItem("user") || "{}");
      let cartId = null;

      if (authUser.customer_id) {
        try {
          const cartRes = await checkoutService.getCustomerCart(authUser.customer_id);
          cartId = cartRes.id || cartRes.cart_id;
        } catch (err) {
          console.warn("Fallo al obtener carrito previo:", err);
        }
      }

      if (!cartId) {
        const guestCart = await checkoutService.createGuestCart();
        cartId = guestCart.id || guestCart.cart_id;
      }

      // 1. SOLUCIÓN AL DUPLICADO: Limpiar ítems previos antes de poblar con el estado del front
      try {
        await checkoutService.clearCartItems(cartId);
      } catch (e) {
        // Si no existe el endpoint, continuamos
      }

      // 2. Insertar los ítems actuales exactos del carrito
      await checkoutService.syncCart(cartId, items);

      let stripePaymentIntentId = null;

      // Si es tarjeta, se crea el intent considerando el cupón
      if (paymentMethod === "CARD") {
        if (!stripe || !elements) {
          throw new Error("El módulo de pagos no está listo todavía.");
        }

        const cardNumberElement = elements.getElement(CardNumberElement);

        const intentRes = await checkoutService.createPaymentIntent(
          cartId,
          appliedCoupon?.code || null,
          SHIPPING_COST
        );
        const { client_secret, payment_intent_id } = intentRes;

        const stripePaymentResult = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              name: cardHolder,
              email: shippingData.email,
              phone: shippingData.telefono,
            },
          },
        });

        if (stripePaymentResult.error) {
          throw new Error(stripePaymentResult.error.message);
        }

        if (stripePaymentResult.paymentIntent.status !== "succeeded") {
          throw new Error("El banco no autorizó la transacción.");
        }

        stripePaymentIntentId = payment_intent_id;
      }

      // Payload para confirmCheckout
      // 1. Identificar si tenemos una dirección guardada válida
      const hasSavedAddress =
        shippingData.address_id !== null &&
        shippingData.address_id !== undefined &&
        !isNaN(Number(shippingData.address_id)) &&
        Number(shippingData.address_id) > 0;

      // 2. Armar el payload base limpio
      const confirmPayload = {
        cart_id: Number(cartId), // 👈 Asegurar que sea entero
        payment_method: paymentMethod,
      };

      // 3. Cupón: solo agregarlo si realmente está aplicado
      if (appliedCoupon && appliedCoupon.code) {
        confirmPayload.coupon_code = appliedCoupon.code.trim().toUpperCase();
      }

      // 4. Pago con tarjeta
      if (paymentMethod === "CARD") {
        confirmPayload.stripe_payment_intent_id = stripePaymentIntentId;
      }

      // 5. address_id vs guest_data (Cumpliendo estrictamente con el .xor de Joi)
      if (authUser?.customer_id && hasSavedAddress) {
        // Caso Usuario Registrado con dirección guardada: SOLO address_id
        confirmPayload.address_id = Number(shippingData.address_id);
      } else {
        // Caso Invitado o Usuario que ingresó dirección manual: SOLO guest_data
        const fullName = (shippingData.nombre || "").trim();
        const firstSpaceIndex = fullName.indexOf(" ");

        let firstName = "Cliente";
        let lastName = "General";

        if (firstSpaceIndex !== -1) {
          firstName = fullName.substring(0, firstSpaceIndex).trim();
          lastName = fullName.substring(firstSpaceIndex + 1).trim() || "General";
        } else if (fullName) {
          firstName = fullName;
        }

        const guestAddress = {
          country: shippingData.country || "GT",
          city: shippingData.ciudad || "Guatemala",
          address_line1: shippingData.direccion || "Ciudad de Guatemala",
        };

        if (shippingData.direccion2 && shippingData.direccion2.trim().length > 0) {
          guestAddress.address_line2 = shippingData.direccion2.trim();
        }

        if (shippingData.departamento && shippingData.departamento.trim().length > 0) {
          guestAddress.state = shippingData.departamento.trim();
        }

        if (shippingData.codigo_postal) {
          guestAddress.postal_code = String(shippingData.codigo_postal);
        }

        confirmPayload.guest_data = {
          email: shippingData.email,
          first_name: firstName,
          last_name: lastName,
          address: guestAddress,
        };
      }

      const orderResult = await checkoutService.confirmCheckout(confirmPayload);

      clearCart();
      localStorage.removeItem("cart_id");
      setConfirmedOrder(orderResult);
    } catch (err) {
      console.error("Error en checkout:", err);
      setErrorMessage(
        err.response?.data?.message ||
        err.response?.data?.details?.[0] ||
        err.message ||
        "Error procesando el pedido."
      );
    } finally {
      setLoading(false);
    }
  };

  if (confirmedOrder) {
    return (
      <section className="checkout-page checkout-success">
        <div className="checkout-success-mark" aria-hidden="true">✓</div>
        <h1>¡Listo, tu pedido fue confirmado!</h1>
        <p>Número de orden: <strong>#{confirmedOrder.order_number || confirmedOrder.order_id}</strong></p>
        <p>Método de pago: <strong>{paymentMethod === "CASH" ? "Pago contra entrega (Pendiente)" : "Tarjeta de crédito/débito"}</strong></p>
        <p>Enviamos la confirmación a <strong>{shippingData.email}</strong>.</p>
        <button type="button" className="checkout-submit" onClick={onFinish}>
          <span>Volver al inicio</span>
        </button>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <button type="button" className="checkout-back" onClick={onBack} disabled={loading}>
        ‹ Volver a datos de envío
      </button>

      <div className="checkout-head">
        <p className="checkout-eyebrow">Pago Seguro</p>
        <h1>DATOS DE PAGO</h1>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          {errorMessage && (
            <div style={{ color: "#dc2626", backgroundColor: "#fee2e2", padding: "0.75rem 1rem", borderRadius: "6px", marginBottom: "1rem" }}>
              {errorMessage}
            </div>
          )}

          {/* Selector de Método de Pago */}
          <fieldset className="checkout-methods" style={{ marginBottom: "1.5rem" }}>
            <legend style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Selecciona cómo deseas pagar</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`checkout-method${paymentMethod === m.id ? " is-selected" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    border: paymentMethod === m.id ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: paymentMethod === m.id ? "#eff6ff" : "transparent"
                  }}
                >
                  <input
                    type="radio"
                    name="metodoPago"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                  />
                  <span className="checkout-method-text" style={{ display: "flex", flexDirection: "column" }}>
                    <strong>{m.label}</strong>
                    <small style={{ color: "#64748b" }}>{m.hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Formulario de Stripe si eligió tarjeta */}
          {paymentMethod === "CARD" ? (
            <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
              <StripeCardFields
                cardHolder={cardHolder}
                onChangeHolder={setCardHolder}
                loading={loading}
              />
            </div>
          ) : (
            <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "1.5rem", color: "#334155" }}>
              Pagas el total en efectivo al momento de recibir el paquete en la puerta de tu casa.
            </div>
          )}

          <button type="submit" className="checkout-submit" disabled={loading}>
            <span>
              {loading
                ? "PROCESANDO PEDIDO..."
                : paymentMethod === "CARD"
                ? `CONFIRMAR Y PAGAR (${formatPrice(total)})`
                : `CONFIRMAR PEDIDO (${formatPrice(total)})`}
            </span>
          </button>
        </form>

        <aside className="checkout-summary">
          {shippingData && (
            <div className="checkout-shipping-recap">
              <h3>Enviar a</h3>
              <p className="checkout-recap-line"><strong>{shippingData.nombre}</strong></p>
              <p className="checkout-recap-line checkout-summary-muted">{shippingData.direccion}</p>
              <p className="checkout-recap-line checkout-summary-muted">
                {shippingData.ciudad}, {shippingData.departamento}
              </p>
              <p className="checkout-recap-line checkout-summary-muted">{shippingData.telefono}</p>
              <p className="checkout-recap-line checkout-summary-muted">{shippingData.email}</p>
            </div>
          )}

          <h2>TU PEDIDO</h2>
          <ul className="checkout-summary-list">
            {items.map((it) => (
              <li key={it.cartId || it.product_variant_id}>
                <span>{it.name} · {it.size} x{it.quantity}</span>
                <span>{formatPrice(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>

          {/* SECCIÓN DEL CUPÓN */}
          <div style={{ margin: "1.25rem 0", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
            {appliedCoupon ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #86efac", padding: "0.6rem 0.8rem", borderRadius: "6px" }}>
                <div>
                  <strong style={{ color: "#166534" }}>{appliedCoupon.code}</strong>
                  <div style={{ fontSize: "0.85rem", color: "#15803d" }}>
                    Descuento: -{formatPrice(appliedCoupon.discount_amount)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}
                >
                  ✕ Quitar
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Cupón de descuento"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", textTransform: "uppercase" }}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  style={{ padding: "0.5rem 1rem", background: "#0f172a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                >
                  {couponLoading ? "..." : "Aplicar"}
                </button>
              </div>
            )}
            {couponError && (
              <p style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: "0.4rem" }}>
                {couponError}
              </p>
            )}
          </div>

          <div className="checkout-summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          {appliedCoupon && (
            <div className="checkout-summary-row" style={{ color: "#16a34a" }}>
              <span>Descuento cupón</span>
              <span>-{formatPrice(appliedCoupon.discount_amount)}</span>
            </div>
          )}

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

export default function CheckoutPage(props) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutFormContent {...props} />
    </Elements>
  );
}
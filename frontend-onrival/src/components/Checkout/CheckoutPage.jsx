import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardNumberElement } from "@stripe/react-stripe-js";
import { useCart } from "../../context/CartContext";
import { checkoutService } from "../../services/checkoutService";
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

  const total = subtotal + SHIPPING_COST;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // 1. Obtener o crear carrito en la BD (cliente o invitado)
      const authUser = JSON.parse(localStorage.getItem("user") || "{}");
      let cartId = null;

      if (authUser.customer_id) {
        try {
          const cartRes = await checkoutService.getCustomerCart(authUser.customer_id);
          cartId = cartRes.id || cartRes.cart_id;
        } catch (err) {
          console.warn("Fallo al obtener carrito previo, creando uno nuevo:", err);
        }
      }

      if (!cartId) {
        const guestCart = await checkoutService.createGuestCart();
        cartId = guestCart.id || guestCart.cart_id;
      }

      // 2. Sincronizar ítems en el carrito de la BD
      for (const item of items) {
        await checkoutService.addItemToCart(cartId, item.product_variant_id, item.quantity);
      }

      let stripePaymentIntentId = null;

      // 3. Si eligió tarjeta, procesar cobro en Stripe
      if (paymentMethod === "CARD") {
        if (!stripe || !elements) {
          throw new Error("El módulo de pagos no está listo todavía.");
        }

        const cardNumberElement = elements.getElement(CardNumberElement);

        console.log("Creando PaymentIntent en backend para cartId:", cartId);
        const intentRes = await checkoutService.createPaymentIntent(cartId);
        const { client_secret, payment_intent_id } = intentRes;

        console.log("Confirmando pago en Stripe con client_secret...");
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

      // 4. Construcción del payload según Joi y método de pago
      const hasSavedAddress =
        shippingData.address_id !== null &&
        shippingData.address_id !== undefined &&
        !isNaN(Number(shippingData.address_id));

      const isRegisteredUser = Boolean(authUser?.customer_id && hasSavedAddress);

      let confirmPayload = {
        cart_id: cartId,
        payment_method: paymentMethod, // "CARD" o "CASH"
      };

      if (paymentMethod === "CARD") {
        confirmPayload.stripe_payment_intent_id = stripePaymentIntentId;
      }

      if (isRegisteredUser) {
        // CLIENTE REGISTRADO CON DIRECCIÓN PREVIA
        confirmPayload.address_id = Number(shippingData.address_id);
      } else {
        // GHOST USER O DIRECCIÓN NUEVA
        const [firstName, ...restName] = (shippingData.nombre || "").trim().split(" ");

        const guestAddress = {
          country: "GT",
          city: shippingData.ciudad || "Guatemala",
          address_line1: shippingData.direccion || "Ciudad de Guatemala",
        };

        if (shippingData.direccion2 && shippingData.direccion2.trim().length > 0) {
          guestAddress.address_line2 = shippingData.direccion2.trim();
        }

        confirmPayload.guest_data = {
          email: shippingData.email,
          first_name: firstName || "Cliente",
          last_name: restName.join(" ") || "General",
          phone: shippingData.telefono || "00000000",
          address: guestAddress,
        };
      }

      console.log("Enviando confirmCheckout al backend:", confirmPayload);
      const orderResult = await checkoutService.confirmCheckout(confirmPayload);
      console.log("¡Orden confirmada en el backend!", orderResult);

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
          <span>Volver al menú principal</span>
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

          {/* Formulario de Stripe sólo si eligió TARJETA */}
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
                ? "CONFIRMAR Y PAGAR CON TARJETA"
                : "CONFIRMAR PEDIDO CONTRA ENTREGA"}
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
              <li key={it.cartId}>
                <span>{it.name} · {it.size} x{it.quantity}</span>
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

export default function CheckoutPage(props) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutFormContent {...props} />
    </Elements>
  );
}
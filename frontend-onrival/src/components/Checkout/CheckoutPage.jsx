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

const EMPTY_FORM = { nombre: "", numero: "", vencimiento: "", cvv: "" };

const PAYMENT_METHODS = [
  { id: "contra-entrega", label: "Pago contra entrega", hint: "Pagás cuando recibís tu pedido" },
  { id: "tarjeta", label: "Tarjeta de crédito/débito", hint: "Pagás ahora con tu tarjeta" },
];

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

  const [cardHolder, setCardHolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const total = subtotal + SHIPPING_COST;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setErrorMessage(null);
    setLoading(true);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);

      // 1. Obtener o crear carrito en la BD (cliente o invitado)
      const authUser = JSON.parse(localStorage.getItem("user") || "{}");
      let cartId = null;

      if (authUser.customer_id) {
        try {
          console.log("[checkoutService] Solicitando carrito para customerId real:", authUser.customer_id);
          const cartRes = await checkoutService.getCustomerCart(authUser.customer_id);
          cartId = cartRes.id || cartRes.cart_id;
        } catch (err) {
          console.warn("Fallo al obtener carrito previo, creando uno nuevo:", err);
        }
      }

      // Si es un Ghost User o no tiene customer_id válido
      if (!cartId) {
        console.log("[checkoutService] Creando carrito anónimo...");
        const guestCart = await checkoutService.createGuestCart();
        cartId = guestCart.id || guestCart.cart_id;
      }

      // 2. Sincronizar ítems en el carrito de la BD
      for (const item of items) {
        await checkoutService.addItemToCart(cartId, item.product_variant_id, item.quantity);
      }

      // 3. Crear el PaymentIntent en tu backend
      console.log("Creando PaymentIntent en backend para cartId:", cartId);
      const intentRes = await checkoutService.createPaymentIntent(cartId);
      const { client_secret, payment_intent_id } = intentRes;

      // 4. Confirmar el cobro directamente con Stripe Elements en el navegador
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

      // 5. Construcción condicional del payload según las reglas de Joi (XOR entre address_id y guest_data)
      const hasSavedAddress =
        shippingData.address_id !== null &&
        shippingData.address_id !== undefined &&
        !isNaN(Number(shippingData.address_id));

      const isRegisteredUser = Boolean(authUser?.customer_id && hasSavedAddress);

      let confirmPayload = {
        cart_id: cartId,
        payment_method: "CARD",
        stripe_payment_intent_id: payment_intent_id,
      };

      if (isRegisteredUser) {
        // CASO CLIENTE REGISTRADO: Solo address_id numérico
        confirmPayload.address_id = Number(shippingData.address_id);
      } else {
        // CASO GHOST USER O NUEVA DIRECCIÓN: Solo guest_data
        const [firstName, ...restName] = (shippingData.nombre || "").trim().split(" ");

        const guestAddress = {
          country: "GT",
          city: shippingData.ciudad || "Guatemala",
          address_line1: shippingData.direccion || "Ciudad de Guatemala",
        };

        // Evitar el error de string vacío en Joi
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
          <fieldset className="checkout-methods">
            <legend>Método de pago</legend>
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.id}
                className={`checkout-method${paymentMethod === m.id ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="metodoPago"
                  value={m.id}
                  checked={paymentMethod === m.id}
                  onChange={() => handleMethodChange(m.id)}
                />
                <span className="checkout-method-text">
                  <strong>{m.label}</strong>
                  <small>{m.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>

          {paymentMethod === "tarjeta" && (
            <>
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
            </>
          )}

          <button type="submit" className="checkout-submit" disabled={!paymentMethod}>
            <span>CONFIRMAR COMPRA</span>
          {errorMessage && (
            <div style={{ color: "#dc2626", backgroundColor: "#fee2e2", padding: "0.75rem 1rem", borderRadius: "6px", marginBottom: "1rem" }}>
              {errorMessage}
            </div>
          )}

          <StripeCardFields
            cardHolder={cardHolder}
            onChangeHolder={setCardHolder}
            loading={loading}
          />

          <button type="submit" className="checkout-submit" disabled={!stripe || loading}>
            <span>{loading ? "PROCESANDO PAGO..." : "CONFIRMAR PAGO"}</span>
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
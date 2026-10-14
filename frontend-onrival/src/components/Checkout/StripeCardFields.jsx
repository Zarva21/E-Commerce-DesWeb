import { CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";

const ELEMENT_STYLE = {
  style: {
    base: {
      fontSize: "15px",
      color: "#1e293b",
      fontFamily: "inherit",
      "::placeholder": { color: "#94a3b8" },
    },
    invalid: { color: "#dc2626" },
  },
};

export default function StripeCardFields({ cardHolder, onChangeHolder, loading }) {
  return (
    <>
      <label className="checkout-field">
        <span>Titular de la tarjeta</span>
        <input
          name="nombre"
          value={cardHolder}
          onChange={(e) => onChangeHolder(e.target.value)}
          placeholder="Como aparece en la tarjeta"
          type="text"
          required
          disabled={loading}
        />
      </label>

      <label className="checkout-field">
        <span>Número de tarjeta</span>
        <div className="stripe-input-wrapper">
          <CardNumberElement options={ELEMENT_STYLE} />
        </div>
      </label>

      <div className="checkout-field-row">
        <label className="checkout-field">
          <span>Vencimiento</span>
          <div className="stripe-input-wrapper">
            <CardExpiryElement options={ELEMENT_STYLE} />
          </div>
        </label>
        <label className="checkout-field">
          <span>CVV</span>
          <div className="stripe-input-wrapper">
            <CardCvcElement options={ELEMENT_STYLE} />
          </div>
        </label>
      </div>
    </>
  );
}
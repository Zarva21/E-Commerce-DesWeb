const Joi = require("joi");

const addressSchema = Joi.object({
  country: Joi.string().required(),        // NOT NULL en la tabla real
  state: Joi.string().optional(),
  city: Joi.string().required(),            // NOT NULL en la tabla real
  address_line1: Joi.string().required(),   // NOT NULL en la tabla real (no "street")
  address_line2: Joi.string().optional(),
  postal_code: Joi.string().optional()
});

const guestDataSchema = Joi.object({
  email: Joi.string().email().required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  address: addressSchema.required()
});

// ---- POST /sales/checkout/intent ----
const checkoutIntentSchema = Joi.object({
  cart_id: Joi.number().integer().required(),
  coupon_code: Joi.string().trim().uppercase().optional()
});

// ---- POST /sales/checkout/confirm ----
const checkoutConfirmSchema = Joi.object({
  cart_id: Joi.number().integer().required(),
  payment_method: Joi.string().valid("CARD", "CASH").required(),

  stripe_payment_intent_id: Joi.string().when("payment_method", {
    is: "CARD",
    then: Joi.required(),
    otherwise: Joi.optional()
  }),

  coupon_code: Joi.string().trim().uppercase().optional(),

  // Exactamente UNA de las dos: cliente logueado manda address_id,
  // invitado manda guest_data completo (True Shadow User).
  address_id: Joi.number().integer(),
  guest_data: guestDataSchema
})
  .xor("address_id", "guest_data")
  .messages({
    "object.xor": "Debes enviar exactamente uno de: address_id (cliente logueado) o guest_data (invitado)."
  });

module.exports = { checkoutIntentSchema, checkoutConfirmSchema };

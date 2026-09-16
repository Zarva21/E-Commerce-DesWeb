// marketing.service.js — CONTRATO PÚBLICO del módulo Marketing.
//
// Igual que catalog.service.js: esta es la puerta por la que Sales/Checkout y
// el flujo de devoluciones me hablan. La firma de las funciones y la forma del
// JSON de salida NO se cambian.

const couponService = require("./coupons/coupon.service.js");

/**
 * CONTRATO B.1
 *
 * validateCoupon(code, { subtotal, customerId })
 *
 * Devuelve:
 *   { coupon_id, discount_amount: number }  -> si el cupón es válido
 *   null                                    -> si venció, superó max_uses o is_active = false
 *
 * Importante: validar NO es canjear. El used_count solo sube cuando Sales
 * confirma la orden y llama a redeemCoupon().
 */
exports.validateCoupon = (code, { subtotal, customerId } = {}) =>
  couponService.validate(code, { subtotal, customerId });

/**
 * CONTRATO B.2
 *
 * issueStoreCredit(customerId, amount)
 *
 * Devuelve: { coupon_id, code, amount }
 *
 * Crea un cupón de un solo uso (max_uses: 1) para dar saldo a favor por una
 * devolución. No se devuelve dinero a Stripe: se emite crédito de tienda.
 */
exports.issueStoreCredit = (customerId, amount, options) =>
  couponService.issueStoreCredit(customerId, amount, options);

/**
 * EXTRA (no rompe el contrato, solo lo complementa).
 * Marca el cupón como consumido. La llama Sales dentro de la transacción del
 * checkout, cuando el pago ya fue exitoso.
 */
exports.redeemCoupon = (couponId, options) => couponService.redeem(couponId, options);

const db = require("../index.js");
const catalogService = require("../catalog/catalog.service.js");

const Coupon = db.coupon;

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * CONTRATO (no cambia la firma que ya usa Sales):
 * validateCoupon(code, { subtotal, customerId, cartItems })
 * -> { coupon_id, discount_amount } si aplica
 * -> null si no existe / expiró / no aplica a este carrito
 *
 * cartItems: [{ product_id, category_id, product_variant_id, quantity, line_total }]
 * (esta es la forma que ya devuelve cart.service.js -> getCartWithTotals().items)
 */
exports.validateCoupon = async (code, { subtotal, customerId, cartItems = [] } = {}) => {
  const coupon = await Coupon.findOne({ where: { code, is_active: true } });
  if (!coupon) return null;

  // --- Validez temporal y de uso ---
  const now = new Date();
  if (now < coupon.valid_from || now > coupon.valid_to) return null;
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return null;

  // --- Cupón de Store Credit: solo lo puede usar el cliente al que quedó amarrado ---
  if (coupon.customer_id !== null) {
    if (!customerId || String(coupon.customer_id) !== String(customerId)) return null;
  }

  const productIds = Array.isArray(coupon.applicable_product_ids) ? coupon.applicable_product_ids : [];
  const categoryIds = Array.isArray(coupon.applicable_category_ids) ? coupon.applicable_category_ids : [];
  const hasProductFilter = productIds.length > 0;
  const hasCategoryFilter = categoryIds.length > 0;

  const calcDiscount = (base) =>
    coupon.discount_type === "percentage"
      ? Number((base * (Number(coupon.discount_value) / 100)).toFixed(2))
      : Math.min(Number(coupon.discount_value), base); // "fixed" nunca descuenta más de lo que hay

  // --- Caso COMBO: deben estar TODOS los productos listados, o no aplica ---
  if (coupon.is_bundle) {
    if (!hasProductFilter) return null; // un combo sin lista de productos no tiene sentido

    const cartProductIds = new Set(cartItems.map((i) => String(i.product_id)));
    const allPresent = productIds.every((id) => cartProductIds.has(String(id)));
    if (!allPresent) return null; // falta al menos un producto del combo

    return { coupon_id: coupon.id, discount_amount: calcDiscount(subtotal) };
  }

  // --- Sin filtros: cupón general, aplica a toda la orden ---
  if (!hasProductFilter && !hasCategoryFilter) {
    return { coupon_id: coupon.id, discount_amount: calcDiscount(subtotal) };
  }

  // --- Con filtros: solo descuenta sobre los ítems que califican (unión producto U categoría) ---
  let expandedCategoryIds = [];
  if (hasCategoryFilter) {
    expandedCategoryIds = await catalogService.getDescendantCategoryIds(categoryIds);
  }

  const productIdSet = new Set(productIds.map(String));
  const categoryIdSet = new Set(expandedCategoryIds.map(String));

  const applicableItems = cartItems.filter(
    (item) => productIdSet.has(String(item.product_id)) || categoryIdSet.has(String(item.category_id))
  );

  if (applicableItems.length === 0) return null; // nada en el carrito califica para este cupón

  const applicableSubtotal = applicableItems.reduce((sum, i) => sum + i.line_total, 0);

  return { coupon_id: coupon.id, discount_amount: calcDiscount(applicableSubtotal) };
};

/**
 * Se llama SOLO después de que el checkout confirma la venta (commit exitoso).
 * Incrementa used_count — nunca se incrementa en validateCoupon, porque
 * validar no significa que la compra se haya completado.
 */
exports.registerCouponUsage = async (couponId, transaction) => {
  await Coupon.increment("used_count", { where: { id: couponId }, transaction });
};

exports.issueStoreCredit = async (customerId, amount) => {
  const code = `CREDIT-${customerId}-${Date.now()}`;
  return Coupon.create({
    code,
    description: `Store credit por devolución — cliente ${customerId}`,
    discount_type: "fixed",
    discount_value: amount,
    max_uses: 1,
    used_count: 0,
    valid_from: new Date(),
    valid_to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 año
    customer_id: customerId
  }).then((c) => ({ coupon_id: c.id, code: c.code, amount }));
};
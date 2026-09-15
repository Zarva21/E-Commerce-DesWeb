// coupon.service.js — Lógica de cupones: fechas, límite de usos y matemática
// del descuento. Nada de esto vive en el controller.

const db = require("../../index.js");
const { Op } = require("sequelize");
const crypto = require("crypto");

const Coupon = db.coupon;

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const VALID_TYPES = ["percentage", "fixed"];

/** Redondeo monetario a 2 decimales, evitando los errores de coma flotante. */
const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------------------
// CRUD de administración
// ---------------------------------------------------------------------------

exports.getAll = ({ q, only_active } = {}) => {
  const where = {};
  if (q) where.code = { [Op.iLike]: `%${q}%` };
  if (only_active === "true") where.is_active = true;

  return Coupon.findAll({ where, order: [["created_at", "DESC"]] });
};

exports.getById = async (id) => {
  const coupon = await Coupon.findByPk(id);
  if (!coupon) throw httpError("Cupón no encontrado.", 404);
  return coupon;
};

exports.create = async (data) => {
  const {
    code, description, discount_type, discount_value,
    max_uses, valid_from, valid_to, is_active, customer_id
  } = data;

  if (!code) throw httpError("El código del cupón es obligatorio.", 400);
  if (!VALID_TYPES.includes(discount_type)) {
    throw httpError("discount_type debe ser 'percentage' o 'fixed'.", 400);
  }
  if (discount_value === undefined || Number(discount_value) <= 0) {
    throw httpError("discount_value debe ser mayor que cero.", 400);
  }
  if (discount_type === "percentage" && Number(discount_value) > 100) {
    throw httpError("Un descuento porcentual no puede ser mayor a 100.", 400);
  }
  if (!valid_from || !valid_to) {
    throw httpError("valid_from y valid_to son obligatorios.", 400);
  }
  if (new Date(valid_from) >= new Date(valid_to)) {
    throw httpError("valid_from debe ser anterior a valid_to.", 400);
  }
  if (max_uses !== undefined && max_uses !== null && Number(max_uses) < 1) {
    throw httpError("max_uses debe ser al menos 1 (o null para ilimitado).", 400);
  }

  const normalizedCode = code.trim().toUpperCase();
  const existing = await Coupon.findOne({ where: { code: normalizedCode } });
  if (existing) throw httpError(`Ya existe un cupón con el código "${normalizedCode}".`, 409);

  return Coupon.create({
    code: normalizedCode,
    description,
    discount_type,
    discount_value,
    max_uses: max_uses ?? null,
    used_count: 0,
    valid_from,
    valid_to,
    is_active: is_active ?? true,
    customer_id: customer_id ?? null
  });
};

exports.update = async (id, data) => {
  const coupon = await exports.getById(id);

  if (data.discount_type && !VALID_TYPES.includes(data.discount_type)) {
    throw httpError("discount_type debe ser 'percentage' o 'fixed'.", 400);
  }
  if (data.code) {
    data.code = data.code.trim().toUpperCase();
    if (data.code !== coupon.code) {
      const existing = await Coupon.findOne({ where: { code: data.code } });
      if (existing) throw httpError(`Ya existe un cupón con el código "${data.code}".`, 409);
    }
  }

  const from = data.valid_from || coupon.valid_from;
  const to = data.valid_to || coupon.valid_to;
  if (new Date(from) >= new Date(to)) {
    throw httpError("valid_from debe ser anterior a valid_to.", 400);
  }

  // used_count nunca se edita a mano: es un contador del sistema.
  const { used_count, ...safeData } = data;

  return coupon.update(safeData);
};

exports.remove = async (id) => {
  const coupon = await exports.getById(id);
  await coupon.destroy(); // soft delete
};

// ---------------------------------------------------------------------------
// Lógica de negocio (la usa marketing.service.js y, a través de él, el checkout)
// ---------------------------------------------------------------------------

/**
 * Valida un cupón y calcula cuánto descuenta.
 * Devuelve { coupon_id, discount_amount } o null si NO es válido.
 * No lanza errores: el checkout solo quiere saber sí o no.
 */
exports.validate = async (code, { subtotal, customerId } = {}) => {
  if (!code) return null;

  const amount = Number(subtotal);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const coupon = await Coupon.findOne({
    where: { code: code.trim().toUpperCase(), is_active: true }
  });
  if (!coupon) return null;

  const now = new Date();
  if (new Date(coupon.valid_from) > now) return null;   // todavía no empieza
  if (new Date(coupon.valid_to) < now) return null;     // ya caducó

  // max_uses null = usos ilimitados
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return null;

  // Cupón nominal (Store Credit): solo lo canjea su dueño.
  if (coupon.customer_id !== null && coupon.customer_id !== undefined) {
    if (!customerId || coupon.customer_id.toString() !== customerId.toString()) return null;
  }

  let discount;
  if (coupon.discount_type === "percentage") {
    discount = money(amount * (Number(coupon.discount_value) / 100));
  } else {
    discount = money(Number(coupon.discount_value));
  }

  // El descuento nunca puede dejar el total en negativo.
  if (discount > amount) discount = money(amount);

  return { coupon_id: coupon.id, discount_amount: discount };
};

/**
 * Crea un cupón nominal de un solo uso por devolución de mercadería.
 * Devuelve { coupon_id, code, amount }.
 */
exports.issueStoreCredit = async (customerId, amount, options = {}) => {
  const value = money(amount);
  if (!customerId) throw httpError("Se requiere el customerId para emitir saldo a favor.", 400);
  if (!Number.isFinite(value) || value <= 0) {
    throw httpError("El monto del saldo a favor debe ser mayor que cero.", 400);
  }

  // Código legible y prácticamente imposible de repetir: SC-A1B2C3D4
  const code = `SC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  const validFrom = new Date();
  const validTo = new Date();
  validTo.setFullYear(validTo.getFullYear() + 1); // el saldo a favor vence en 1 año

  const coupon = await Coupon.create(
    {
      code,
      description: `Saldo a favor por devolución (cliente ${customerId}).`,
      discount_type: "fixed",
      discount_value: value,
      max_uses: 1,
      used_count: 0,
      valid_from: validFrom,
      valid_to: validTo,
      is_active: true,
      customer_id: customerId
    },
    options // permite pasar { transaction } desde el flujo de devoluciones
  );

  return { coupon_id: coupon.id, code: coupon.code, amount: value };
};

/**
 * Marca un cupón como usado (suma 1 a used_count).
 * La llama el módulo Sales cuando la orden queda confirmada, NO antes:
 * validar no es canjear.
 */
exports.redeem = async (couponId, options = {}) => {
  const coupon = await Coupon.findByPk(couponId, options);
  if (!coupon) throw httpError("Cupón no encontrado.", 404);

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    throw httpError("El cupón ya alcanzó su límite de usos.", 409);
  }

  await coupon.increment("used_count", { by: 1, ...options });

  // Un cupón de un solo uso se apaga automáticamente al consumirse.
  if (coupon.max_uses !== null && coupon.used_count + 1 >= coupon.max_uses) {
    await coupon.update({ is_active: false }, options);
  }

  return coupon;
};

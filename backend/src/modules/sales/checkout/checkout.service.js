const db = require("../../index.js");
const cartService = require("../carts/cart.service.js");
const inventoryService = require("../../inventory/inventory.service.js");
const marketingService = require("../../marketing/marketing.service.js");
const stripe = require("../../../config/stripe.config.js");
const businessConfig = require("../../../config/business.js");

const User = db.user;
const Role = db.role;
const Customer = db.customer;
const Address = db.address;
const Order = db.order;
const OrderItem = db.orderItem;
const OrderCoupon = db.orderCoupon;
const Invoice = db.invoice;
const Payment = db.payment;

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Recalcula subtotal/descuento/total desde CERO, siempre contra datos
 * actuales de BD. JAMÁS se confía en un total que mande el frontend.
 *
 * CAMBIO: ahora le pasamos cart.items a validateCoupon, porque Marketing
 * necesita saber QUÉ productos/categorías hay en el carrito para poder
 * filtrar cupones por producto, categoría, o combo.
 */
const computeTotals = async (cartId, couponCode, customerId, shippingCost = 35) => {
  const cart = await cartService.getCartWithTotals(cartId);
  if (!cart.items.length) throw httpError("El carrito está vacío.", 400);

  const subtotal = Number(cart.subtotal);
  let discount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const result = await marketingService.validateCoupon(couponCode, {
      subtotal,
      customerId,
      cartItems: cart.items
    });
    if (!result) throw httpError("El cupón no es válido, expiró o no aplica a estos productos.", 400);
    appliedCoupon = result;
    discount = Number(result.discount_amount);
  }

  // Base gravable tras aplicar descuento
  const taxableBase = Math.max(0, subtotal - discount);

  // IVA (12%) sobre la base gravable
  const tax = Number((taxableBase * 0.12).toFixed(2));

  // Costo de envío (Q35 por defecto si no es especificado)
  const shipping = Number(Number(shippingCost).toFixed(2));

  // Total final de la orden
  const total = Number((taxableBase + tax + shipping).toFixed(2));

  return { cart, subtotal, discount, tax, shipping_cost: shipping, total, appliedCoupon };
};

const resolveGuestIdentity = async (
  guestData, // Recibimos el objeto completo
  transaction
) => {
  const email = guestData.email;
  // Soportar first_name (snake_case) o firstName (camelCase)
  const firstName = (guestData.first_name || guestData.firstName || "Cliente").trim();
  const lastName = (guestData.last_name || guestData.lastName || "Invitado").trim();
  const phone = guestData.phone || guestData.telefono || null;
  const address = guestData.address;

  let user = await User.findOne({ where: { email }, transaction });

  if (user && !user.is_guest) {
    throw httpError("Ese correo ya tiene una cuenta registrada. Inicia sesión para continuar.", 409);
  }

  if (!user) {
    const customerRole = await Role.findOne({ where: { name: "customer" }, transaction });
    if (!customerRole) throw httpError('El rol "customer" no existe en la base de datos.', 500);

    user = await User.create(
      { email, password_hash: null, role_id: customerRole.id, is_guest: true },
      { transaction }
    );
  }

  let customer = await Customer.findOne({ where: { user_id: user.id }, transaction });
  if (!customer) {
    customer = await Customer.create(
      {
        user_id: user.id,
        first_name: firstName, 
        last_name: lastName,   
        phone: phone || null
      },
      { transaction }
    );
  } else if (phone && !customer.phone) {
    customer.phone = phone;
    await customer.save({ transaction });
  }

  const newAddress = await Address.create(
    { customer_id: customer.id, ...address, is_default: true },
    { transaction }
  );

  return { customer, address: newAddress };
};

const resolveAuthenticatedIdentity = async ({ userId, addressId, guestData }, transaction) => {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) throw httpError("No se encontró un perfil de cliente para este usuario.", 404);

  let address = null;

  // 1. Si mandó un ID válido, buscar esa dirección específica
  if (addressId) {
    address = await Address.findOne({
      where: { id: addressId, customer_id: customer.id },
      transaction
    });
  }

  // 2. Si no mandó ID pero el usuario ya tenía direcciones en BD, tomar la principal
  if (!address && !guestData?.address) {
    address = await Address.findOne({
      where: { customer_id: customer.id },
      order: [["is_default", "DESC"], ["created_at", "DESC"]],
      transaction
    });
  }

  // 3. Si mandó una dirección nueva en el formulario (guestData.address), crearla en la BD asociada a este customer
  if (!address && guestData?.address) {
    address = await Address.create(
      {
        customer_id: customer.id,
        ...guestData.address,
        is_default: false
      },
      { transaction }
    );
  }

  if (!address) {
    throw httpError("No se encontró ni se pudo registrar una dirección de entrega válida.", 400);
  }

  return { customer, address };
};

exports.createIntent = async ({ cartId, couponCode, userId, shippingCost = 35 }) => {
  const activeCouponCode =
    typeof couponCode === "string" && couponCode.trim() !== ""
      ? couponCode.trim().toUpperCase()
      : null;

  let resolvedCustomerId = null;
  if (userId) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (customer) resolvedCustomerId = customer.id;
  }

  const { cart, subtotal, discount, tax, shipping_cost, total } = await computeTotals(
    cartId,
    activeCouponCode,
    resolvedCustomerId,
    shippingCost
  );

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100), // Monto exacto en centavos (ej: Q135.00 -> 13500)
    currency: "usd",
    metadata: {
      cart_id: String(cartId),
      coupon_code: activeCouponCode || "",
      customer_id: resolvedCustomerId ? String(resolvedCustomerId) : ""
    }
  });

  return {
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id,
    subtotal,
    discount,
    tax,
    shipping_cost,
    total
  };
};

exports.confirmCheckout = async ({
  cartId,
  paymentMethod,
  paymentMethodId,
  stripePaymentIntentId,
  couponCode,
  addressId,
  guestData,
  userId,
  employeeId = null,
  shippingCost = 35
}) => {
  const activeCouponCode =
    typeof couponCode === "string" && couponCode.trim() !== ""
      ? couponCode.trim().toUpperCase()
      : null;

  let resolvedCustomerId = null;
  if (userId) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (customer) resolvedCustomerId = customer.id;
  }

  // 1. Recalcular montos reales con IVA y Envío
  const { cart, subtotal, discount, tax, shipping_cost, total, appliedCoupon } = await computeTotals(
    cartId,
    activeCouponCode,
    resolvedCustomerId,
    shippingCost
  );

  if (paymentMethod === "CASH" && total > businessConfig.payment.maxCashLimit) {
    throw httpError(
      `No se permite efectivo para montos mayores a ${businessConfig.payment.maxCashLimit}.`,
      400
    );
  }

  let stripeIntent = null;

if (paymentMethod === "CARD") {
  const amountInCents = Math.round(total * 100);

  // Flujo con token seguro generado por Stripe Elements
  if (paymentMethodId) {
    try {
      stripeIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
        metadata: {
          cart_id: String(cartId),
        },
      });
    } catch (stripeErr) {
      throw httpError(`Error de pago en Stripe: ${stripeErr.message}`, 400);
    }
  } 
  // Flujo alternativo (por si se envía un intent ya creado previamente)
  else if (stripePaymentIntentId) {
    stripeIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    if (stripeIntent.metadata.cart_id !== String(cartId)) {
      throw httpError("El PaymentIntent no corresponde a este carrito.", 400);
    }
    if (stripeIntent.amount !== amountInCents) {
      throw httpError("El monto cobrado no coincide con el total actual del carrito.", 409);
    }
  } else {
    throw httpError("Falta el método de pago (payment_method_id o stripe_payment_intent_id).", 400);
  }

  if (stripeIntent.status !== "succeeded") {
    throw httpError(`El pago no se ha completado en Stripe (status: ${stripeIntent.status}).`, 402);
  }
}

  const t = await db.sequelize.transaction();
  try {
    const { customer, address } = userId
      ? await resolveAuthenticatedIdentity({ userId, addressId, guestData }, t)
      : await resolveGuestIdentity(guestData, t);

    await cartService.attachCustomerToCart(cartId, customer.id, t);

    // 2. Crear la orden con subtotal, tax, shipping_cost y total reales
    const order = await Order.create(
      {
        customer_id: customer.id,
        address_id: address.id,
        order_number: `ORD-${Date.now()}`,
        status: paymentMethod === "CASH" ? "pending_payment" : "paid",
        subtotal,
        tax,
        shipping_cost,
        discount,
        total,
      },
      { transaction: t }
    );

    for (const item of cart.items) {
      await OrderItem.create(
        {
          order_id: order.id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.line_total,
        },
        { transaction: t }
      );
    }

    if (appliedCoupon) {
      await OrderCoupon.create(
        {
          order_id: order.id,
          coupon_id: appliedCoupon.coupon_id,
          discount_amount: discount,
        },
        { transaction: t }
      );
      await marketingService.registerCouponUsage(appliedCoupon.coupon_id, t);
    }

    await inventoryService.deductStockForCheckout(
      cart.items.map((i) => ({
        product_variant_id: i.product_variant_id,
        quantity: i.quantity,
      })),
      t,
      employeeId
    );

    const invoice = await Invoice.create(
      {
        order_id: order.id,
        employee_id: employeeId,
        invoice_number: `INV-${Date.now()}`,
        subtotal,
        tax,
        total,
        status: "issued",
      },
      { transaction: t }
    );

    await Payment.create(
      {
        invoice_id: invoice.id,
        provider: paymentMethod === "CARD" ? "stripe" : "cash",
        transaction_id: stripeIntent ? stripeIntent.id : `CASH-${Date.now()}`,
        amount: total,
        status: paymentMethod === "CASH" ? "pending" : "completed",
        payment_date: paymentMethod === "CASH" ? null : new Date(),
      },
      { transaction: t }
    );

    await cartService.clearCart(cartId, t);

    await t.commit();

    return {
      order_id: order.id,
      order_number: order.order_number,
      total,
      status: order.status,
    };
  } catch (err) {
    await t.rollback();

    // Si Stripe ya había cobrado y la transacción de BD colapsó, se reembolsa de inmediato
    if (stripeIntent && stripeIntent.status === "succeeded") {
      try {
        await stripe.refunds.create({ payment_intent: stripeIntent.id });
      } catch (refundErr) {
        console.error(
          "FALLO CRÍTICO: no se pudo reembolsar tras rollback del checkout:",
          refundErr.message
        );
      }
    }

    throw err;
  }
  

  
};
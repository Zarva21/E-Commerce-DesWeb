const db = require("../../index.js");
const inventoryService = require("../../inventory/inventory.service.js");

const Order = db.order;
const OrderItem = db.orderItem;
const Customer = db.customer;
const User = db.user;
const Invoice = db.invoice;
const Payment = db.payment;
const Address = db.address;
const ProductVariant = db.productVariant;
const Product = db.product;
const OrderCoupon = db.orderCoupon;
const Coupon = db.coupon;

// orders es INMUTABLE en su contenido — nunca agregas/quitas un OrderItem.
// Solo se permite mover `status` siguiendo transiciones válidas.
const VALID_TRANSITIONS = {
  pending_payment: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  cancelled: [],
  delivered: []
};

/**
 * Listado completo para el panel de administración / empleados.
 * Incluye cliente, dirección, factura y estado del pago.
 */
exports.getAll = async (filters = {}) => {
  const where = {};
  if (filters.customer_id) where.customer_id = filters.customer_id;
  if (filters.status) where.status = filters.status;

  const orders = await Order.findAll({
    where,
    include: [
      {
        model: Customer,
        attributes: ["id", "first_name", "last_name", "phone"],
        include: [
          {
            model: User,
            attributes: ["email"]
          }
        ]
      },
      {
        model: Address,
        attributes: ["address_line1", "address_line2", "city", "state", "postal_code", "country"]
      },
      {
        model: Invoice,
        include: [
          {
            model: Payment
          }
        ]
      },
      {
        model: OrderItem,
        include: [
          {
            model: ProductVariant,
            attributes: ["id", "sku", "size", "color"],
            include: [{ model: Product, attributes: ["id", "name"] }]
          }
        ]
      },
      {
        model: OrderCoupon,
        include: [
          {
            model: Coupon,
            attributes: ["id", "code", "description", "discount_type", "discount_value"]
          }
        ]
      }
    ],
    order: [["created_at", "DESC"]]
  });

  return orders.map((ordInstance) => {
    const ord = ordInstance.toJSON ? ordInstance.toJSON() : ordInstance;

    // 1. Extraer Cliente
    const cust = ord.customer || ord.Customer;
    let customerName = "Cliente General";
    let customerEmail = "—";
    let customerPhone = "—";

    if (cust) {
      const fn = cust.first_name || "";
      const ln = cust.last_name || "";
      const fullName = `${fn} ${ln}`.trim();
      if (fullName) customerName = fullName;
      customerPhone = cust.phone || "—";
      customerEmail = cust.user?.email || cust.User?.email || cust.email || "—";
    }

    // 2. Extraer Factura y Pago
    const inv =
      (Array.isArray(ord.invoices) ? ord.invoices[0] : ord.invoices) ||
      (Array.isArray(ord.Invoices) ? ord.Invoices[0] : ord.Invoices) ||
      ord.invoice ||
      ord.Invoice;

    let paymentMethod = "cash";
    let paymentStatus = "pending";

    if (inv) {
      const pay =
        (Array.isArray(inv.payments) ? inv.payments[0] : inv.payments) ||
        (Array.isArray(inv.Payments) ? inv.Payments[0] : inv.Payments) ||
        inv.payment ||
        inv.Payment;

      if (pay) {
        paymentMethod = pay.provider; // "stripe" | "cash"
        paymentStatus = pay.status;   // "completed" | "pending"
      }
    } else {
      paymentMethod = ord.status === "paid" ? "stripe" : "cash";
      paymentStatus = ord.status === "paid" ? "completed" : "pending";
    }

    // 3. Extraer Cupón aplicado
    const appliedCoupon =
      (Array.isArray(ord.order_coupons) ? ord.order_coupons[0] : ord.order_coupons) ||
      (Array.isArray(ord.OrderCoupons) ? ord.OrderCoupons[0] : ord.OrderCoupons) ||
      ord.order_coupon ||
      ord.OrderCoupon ||
      null;

    const couponObj = appliedCoupon?.coupon || appliedCoupon?.Coupon || null;

    return {
      id: ord.id,
      order_number: ord.order_number,
      customer: customerName,
      customer_id: ord.customer_id,
      email: customerEmail,
      phone: customerPhone,
      date: ord.created_at || ord.createdAt || ord.order_date,
      status: ord.status,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      subtotal: Number(ord.subtotal || 0),
      tax: Number(ord.tax || 0),
      shipping_cost: Number(ord.shipping_cost || 0),
      discount: Number(ord.discount || appliedCoupon?.discount_amount || 0),
      coupon_code: couponObj?.code || null,
      coupon_description: couponObj?.description || null,
      total: Number(ord.total || 0),
      address: ord.address || ord.Address || null,
      items: (ord.order_items || ord.orderItems || []).map((it) => ({
        id: it.id,
        name: it.product_variant?.product?.name || "Artículo",
        size: it.product_variant?.size || "Única",
        color: it.product_variant?.color || null,
        quantity: it.quantity,
        price: Number(it.unit_price)
      }))
    };
  });
};

/**
 * Obtener detalle individual por ID
 */
exports.getById = async (id) => {
  const order = await Order.findByPk(id, {
    include: [
      {
        model: Customer,
        attributes: ["id", "first_name", "last_name", "phone"],
        include: [{ model: User, attributes: ["email"] }],
      },
      {
        model: Address,
      },
      {
        model: Invoice,
        include: [{ model: Payment }],
      },
      {
        model: OrderItem,
        include: [
          {
            model: ProductVariant,
            include: [{ model: Product, attributes: ["id", "name"] }],
          },
        ],
      },
      {
        model: OrderCoupon,
        include: [
          {
            model: Coupon,
            attributes: ["id", "code", "description", "discount_type", "discount_value"],
          },
        ],
      },
    ],
  });

  if (!order) {
    const error = new Error("Pedido no encontrado.");
    error.status = 404;
    throw error;
  }

  return order;
};

/**
 * Cambio de estado controlado.
 * - Si se cancela un pedido que ya descontó inventario ("paid"), devuelve stock en transacción.
 * - Si un pedido en efectivo pasa a "paid", actualiza el pago a "completed".
 */
exports.updateStatus = async (id, newStatus, employeeId = null) => {
  const order = await Order.findByPk(id, {
    include: [{ model: Invoice, include: [{ model: Payment }] }],
  });

  if (!order) {
    const error = new Error("Pedido no encontrado.");
    error.status = 404;
    throw error;
  }

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    const error = new Error(`No se puede pasar de "${order.status}" a "${newStatus}".`);
    error.status = 400;
    throw error;
  }

  await db.sequelize.transaction(async (t) => {
    // 1. Reposición de inventario en cancelaciones
    if (newStatus === "cancelled" && (order.status === "paid" || order.status === "shipped")) {
      const items = await OrderItem.findAll({ where: { order_id: id }, transaction: t });
      await inventoryService.restockForCancellation(
        items.map((i) => ({ product_variant_id: i.product_variant_id, quantity: i.quantity })),
        t,
        employeeId,
        `order-${id}-cancelled`
      );
    }

    // 2. Liquidación de pago en efectivo
    if (order.status === "pending_payment" && newStatus === "paid") {
      const invoice = Array.isArray(order.invoices) ? order.invoices[0] : order.invoice;
      const payment = Array.isArray(invoice?.payments) ? invoice?.payments[0] : invoice?.payment;

      if (payment && payment.status === "pending") {
        payment.status = "completed";
        payment.payment_date = new Date();
        await payment.save({ transaction: t });
      }
    }

    // 3. Guardar nuevo estado
    order.status = newStatus;
    await order.save({ transaction: t });
  });

  return order;
};

/**
 * Consulta de pedidos propios del cliente (Storefront)
 */
exports.getOrdersByUserId = async (userId) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    return []; // Si el usuario no tiene perfil de cliente aún, retorna array vacío sin reventar 404
  }

  const orders = await Order.findAll({
    where: { customer_id: customer.id },
    include: [
      {
        model: OrderItem,
        required: false,
        include: [
          {
            model: ProductVariant,
            attributes: ["id", "sku", "size", "color"],
            include: [{ model: Product, attributes: ["id", "name"] }],
          },
        ],
      },
      {
        model: OrderCoupon,
        required: false,
        include: [
          {
            model: Coupon,
            attributes: ["code"],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  return orders.map((ordInstance) => {
    const ord = ordInstance.toJSON ? ordInstance.toJSON() : ordInstance;

    const appliedCoupon =
      (Array.isArray(ord.order_coupons) ? ord.order_coupons[0] : ord.order_coupons) ||
      (Array.isArray(ord.OrderCoupons) ? ord.OrderCoupons[0] : ord.OrderCoupons) ||
      ord.order_coupon ||
      ord.OrderCoupon ||
      null;

    const items = ord.order_items || ord.orderItems || [];

    return {
      id: ord.order_number,
      db_id: ord.id,
      fecha: ord.created_at || ord.createdAt || ord.order_date,
      estado: ord.status,
      subtotal: Number(ord.subtotal || 0),
      impuesto: Number(ord.tax || 0),
      envio: Number(ord.shipping_cost || 0),
      descuento: Number(ord.discount || appliedCoupon?.discount_amount || 0),
      cupon: appliedCoupon?.coupon?.code || appliedCoupon?.Coupon?.code || null,
      total: Number(ord.total || 0),
      items: items.map((item) => {
        const variant = item.product_variant || item.ProductVariant || {};
        const prod = variant.product || variant.Product || {};
        return {
          name: prod.name || "Producto",
          size: variant.size || "Única",
          color: variant.color || null,
          quantity: item.quantity,
          price: Number(item.unit_price || 0),
        };
      }),
    };
  });
};

/**
 * Liquida exclusivamente el pago en efectivo (CASH) y actualiza el estado de la orden
 */
exports.collectCashPayment = async (orderId, employeeId = null) => {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Invoice, include: [{ model: Payment }] }],
  });

  if (!order) {
    const error = new Error("Pedido no encontrado.");
    error.status = 404;
    throw error;
  }

  if (order.status === "cancelled") {
    const error = new Error("No se puede cobrar un pedido cancelado.");
    error.status = 400;
    throw error;
  }

  const invoice = Array.isArray(order.invoices) ? order.invoices[0] : order.invoice;
  const payment = Array.isArray(invoice?.payments) ? invoice?.payments[0] : invoice?.payment;

  if (!payment) {
    const error = new Error("No se encontró registro de pago asociado a la factura.");
    error.status = 404;
    throw error;
  }

  if (payment.status === "completed") {
    return { message: "El pedido ya fue cobrado previamente.", order, payment };
  }

  await db.sequelize.transaction(async (t) => {
    payment.status = "completed";
    payment.payment_date = new Date();
    await payment.save({ transaction: t });

    // Si la orden estaba esperando pago, se activa a 'paid' (en preparación)
    if (order.status === "pending_payment") {
      order.status = "paid";
      await order.save({ transaction: t });
    }
  });

  return {
    message: "Cobro liquidado con éxito.",
    payment_status: "completed",
    paid_at: payment.payment_date,
    order_status: order.status
  };
};

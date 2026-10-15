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
        attributes: ["address_line1", "address_line2", "city"]
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
      }
    ],
    order: [["created_at", "DESC"]]
  });

  return orders.map((ordInstance) => {
    const ord = ordInstance.toJSON ? ordInstance.toJSON() : ordInstance;

    // 1. Extraer Cliente (verificando Customer o customer)
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

    // 2. Extraer Factura y Pago (manejando tanto hasOne como hasMany)
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
      // Fallback si por alguna razón la orden vieja no tuvo invoice
      paymentMethod = ord.status === "paid" ? "stripe" : "cash";
      paymentStatus = ord.status === "paid" ? "completed" : "pending";
    }

    return {
      id: ord.id,
      order_number: ord.order_number,
      customer: customerName,
      email: customerEmail,
      phone: customerPhone,
      date: ord.created_at || ord.createdAt || ord.order_date,
      status: ord.status,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      total: Number(ord.total),
      subtotal: Number(ord.subtotal),
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
    // 1. Caso de Cancelación con reposición de inventario
    if (newStatus === "cancelled" && (order.status === "paid" || order.status === "shipped")) {
      const items = await OrderItem.findAll({ where: { order_id: id }, transaction: t });
      await inventoryService.restockForCancellation(
        items.map((i) => ({ product_variant_id: i.product_variant_id, quantity: i.quantity })),
        t,
        employeeId,
        `order-${id}-cancelled`
      );
    }

    // 2. Caso Pago Contra Entrega liquidado: Si pasa de pending_payment a paid, liquidar Payment
    if (order.status === "pending_payment" && newStatus === "paid") {
      const invoice = Array.isArray(order.invoices) ? order.invoices[0] : order.invoice;
      const payment = Array.isArray(invoice?.payments) ? invoice?.payments[0] : invoice?.payment;

      if (payment && payment.status === "pending") {
        payment.status = "completed";
        payment.payment_date = new Date();
        await payment.save({ transaction: t });
      }
    }

    // 3. Persistir nuevo estado de la orden
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
    const error = new Error("Cliente no encontrado.");
    error.status = 404;
    throw error;
  }

  const orders = await Order.findAll({
    where: { customer_id: customer.id },
    include: [
      {
        model: OrderItem,
        include: [
          {
            model: ProductVariant,
            attributes: ["id", "sku", "size", "color"],
            include: [{ model: Product, attributes: ["id", "name"] }],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  return orders.map((ord) => ({
    id: ord.order_number,
    db_id: ord.id,
    fecha: ord.created_at,
    estado: ord.status,
    subtotal: ord.subtotal,
    envio: ord.shipping_cost,
    descuento: ord.discount,
    total: ord.total,
    items: (ord.order_items || ord.orderItems || []).map((item) => ({
      name: item.product_variant?.product?.name || "Producto",
      size: item.product_variant?.size || "Única",
      color: item.product_variant?.color || null,
      quantity: item.quantity,
      price: Number(item.unit_price),
    })),
  }));
};

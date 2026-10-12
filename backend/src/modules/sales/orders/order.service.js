const db = require("../../index.js");
const inventoryService = require("../../inventory/inventory.service.js");

const Order = db.order;
const OrderItem = db.orderItem;
const ProductVariant = db.productVariant;
const Product = db.product;
const Customer = db.customer;

exports.getAll = (filters = {}) => {
  const where = {};
  if (filters.customer_id) where.customer_id = filters.customer_id;
  if (filters.status) where.status = filters.status;
  return Order.findAll({ where, order: [["created_at", "DESC"]] });
};

exports.getById = async (id) => {
  const order = await Order.findByPk(id);
  if (!order) {
    const error = new Error("Pedido no encontrado.");
    error.status = 404;
    throw error;
  }
  const items = await OrderItem.findAll({ where: { order_id: id } });
  return { ...order.toJSON(), items };
};

// orders es INMUTABLE en su contenido — nunca agregas/quitas un OrderItem.
// Solo se permite mover `status` siguiendo transiciones válidas.
const VALID_TRANSITIONS = {
  pending_payment: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  cancelled: [],
  delivered: []
};

exports.updateStatus = async (id, newStatus, employeeId = null) => {
  const order = await Order.findByPk(id);
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

  // Cancelar un pedido YA pagado exige devolver el inventario — transacción propia.
  if (newStatus === "cancelled" && order.status === "paid") {
    const items = await OrderItem.findAll({ where: { order_id: id } });
    await db.sequelize.transaction(async (t) => {
      await inventoryService.restockForCancellation(
        items.map((i) => ({ product_variant_id: i.product_variant_id, quantity: i.quantity })),
        t,
        employeeId,
        `order-${id}-cancelled`
      );
      order.status = newStatus;
      await order.save({ transaction: t });
    });
    return order;
  }

  order.status = newStatus;
  await order.save();
  return order;
};

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
            attributes: ["id", "sku", "size", "color"], // 👈 corregido: 'attributes' con doble 't'
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


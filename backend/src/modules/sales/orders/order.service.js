const db = require("../../index.js");
const inventoryService = require("../../inventory/inventory.service.js");

const Order = db.order;
const OrderItem = db.orderItem;

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

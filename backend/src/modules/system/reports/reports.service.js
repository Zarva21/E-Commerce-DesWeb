// src/modules/system/reports/reports.service.js
const db = require("../../index.js");



const Sequelize = db.Sequelize;
const Op = Sequelize.Op;

// Modelos requeridos
const Order = db.order;
const OrderItem = db.orderItem || db.order_item;
const Stock = db.stock;
const ProductVariant = db.productVariant || db.product_variant;
const Product = db.product;
const Brand = db.brand;
const Customer = db.customer;
const User = db.user;
const Role = db.role;
const Coupon = db.coupon;

const VALID_STATUSES = ["paid", "shipped", "delivered"];

// REPORTE 1: Ventas Mensuales Realizadas
exports.getMonthlySales = async () => {
  const isPostgres = db.sequelize.getDialect() === "postgres";
  const dateGrouping = isPostgres
    ? Sequelize.fn("TO_CHAR", Sequelize.col("orders.created_at"), "YYYY-MM")
    : Sequelize.fn("DATE_FORMAT", Sequelize.col("orders.created_at"), "%Y-%m");

  const results = await Order.findAll({
    attributes: [
      [dateGrouping, "period"],
      [Sequelize.fn("COUNT", Sequelize.col("orders.id")), "orders_count"],
      [Sequelize.fn("SUM", Sequelize.col("orders.total")), "total_amount"],
    ],
    where: {
      status: { [Op.in]: VALID_STATUSES },
    },
    group: ["period"],
    order: [[Sequelize.literal("period"), "ASC"]],
    raw: true,
  });

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  return results.map((r) => {
    const [year, monthNum] = (r.period || "").split("-");
    const monthName = monthNames[parseInt(monthNum, 10) - 1] || r.period;
    return {
      month: `${monthName} ${year}`,
      ordersCount: parseInt(r.orders_count || 0, 10),
      totalAmount: parseFloat(r.total_amount || 0),
    };
  });
};

// REPORTE 2: Productos Más Vendidos
exports.getTopProducts = async (limit = 5) => {
  const results = await OrderItem.findAll({
    attributes: [
      "product_variant_id",
      // Usamos snake_case en minúsculas para compatibilidad 100% con PostgreSQL
      [Sequelize.fn("SUM", Sequelize.col("order_items.quantity")), "sales_count"],
      [Sequelize.fn("SUM", Sequelize.col("order_items.subtotal")), "revenue"],
    ],
    include: [
      {
        model: Order,
        attributes: [],
        where: { status: { [Op.in]: VALID_STATUSES } },
      },
      {
        model: ProductVariant,
        attributes: ["id", "sku", "color", "size"],
        include: [
          {
            model: Product,
            attributes: ["id", "name"],
            include: [{ model: Brand, attributes: ["name"] }],
          },
        ],
      },
    ],
    group: [
      "order_items.product_variant_id",
      "product_variant.id",
      "product_variant->product.id",
      "product_variant->product->brand.id",
    ],
    // Literal con comillas dobles explícitas o directamente sales_count
    order: [[Sequelize.literal("sales_count"), "DESC"]],
    limit,
    raw: true,
  });

  return results.map((r, idx) => {
    // Si viene crudo o instancia toJSON
    const sku = r["product_variant.sku"] || r.sku || "—";
    const size = r["product_variant.size"] || r.size;
    const color = r["product_variant.color"] || r.color;
    const prodName = r["product_variant.product.name"] || r.name || "Producto";
    const brandName = r["product_variant.product.brand.name"] || r.brand || "Sin marca";

    const variantLabel = [size, color, sku].filter(Boolean).join(" · ");

    return {
      id: r.product_id || idx + 1,
      variantId: r.product_variant_id,
      name: `${prodName} (${variantLabel})`,
      brand: brandName,
      // Leemos sales_count o salesCount
      salesCount: parseInt(r.sales_count || r.salesCount || 0, 10),
      revenue: parseFloat(r.revenue || 0),
    };
  });
};

// REPORTE 3: Existencias Críticas (Bajo Stock)
exports.getLowStock = async (threshold = 10) => {
  const lowItems = await Stock.findAll({
    where: {
      quantity_on_hand: { [Op.lte]: threshold },
    },
    include: [
      {
        model: ProductVariant,
        attributes: ["id", "sku", "color", "size"],
        include: [
          {
            model: Product,
            attributes: ["id", "name"],
            include: [{ model: Brand, attributes: ["name"] }],
          },
        ],
      },
    ],
    order: [["quantity_on_hand", "ASC"]],
    limit: 10,
  });

  return lowItems.map((item) => {
    const s = item.toJSON ? item.toJSON() : item;
    const variant = s.product_variant || s.productVariant || {};
    const prod = variant.product || {};

    return {
      id: s.id,
      variantId: variant.id,
      sku: variant.sku || "—",
      productName: prod.name || "Sin nombre",
      brand: prod.brand?.name || "—",
      size: variant.size || "—",
      color: variant.color || "—",
      stock: s.quantity_on_hand,
      reorderLevel: s.reorder_level,
      status: s.quantity_on_hand === 0 ? "Agotado" : "Bajo stock",
    };
  });
};

// REPORTE 4: Pedidos Guest vs Registrados
exports.getGuestVsRegistered = async () => {
  const results = await Order.findAll({
    attributes: [
      [
        Sequelize.literal(
          `CASE WHEN "customer->user"."is_guest" = true OR "customer->user"."id" IS NULL THEN 'Invitado' ELSE 'Registrado' END`
        ),
        "customerType",
      ],
      [Sequelize.fn("COUNT", Sequelize.col("orders.id")), "ordersCount"],
      [Sequelize.fn("SUM", Sequelize.col("orders.total")), "totalAmount"],
    ],
    include: [
      {
        model: Customer,
        attributes: [],
        include: [{ model: User, attributes: [] }],
      },
    ],
    where: {
      status: { [Op.in]: VALID_STATUSES },
    },
    group: ["customerType"],
    raw: true,
  });

  return results.map((r) => ({
    type: r.customerType,
    ordersCount: parseInt(r.ordersCount || 0, 10),
    totalAmount: parseFloat(r.totalAmount || 0),
  }));
};

exports.getHomeStats = async () => {
  const [
    stockStats,
    activeEmployees,
    pendingOrders,
    activeCoupons,
    recentOrders,
  ] = await Promise.all([
    // 1. Inventario: total, normal, bajo y agotado
    Stock.findAll({
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("id")), "totalItems"],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal("CASE WHEN quantity_on_hand > reorder_level THEN 1 ELSE 0 END")
          ),
          "normalCount",
        ],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN quantity_on_hand <= reorder_level AND quantity_on_hand > 0 THEN 1 ELSE 0 END"
            )
          ),
          "lowCount",
        ],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal("CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END")
          ),
          "outCount",
        ],
      ],
      raw: true,
    }),

    // 2. Colaboradores activos (admin / employee)
    User.count({
      include: [
        {
          model: Role, 
          where: { name: { [Op.in]: ["admin", "employee"] } },
        },
      ],
      where: { is_active: true },
    }),

    // 3. Pedidos pendientes de pago
    Order.count({
      where: { status: "pending_payment" },
    }),

    // 4. Cupones de marketing activos
    Coupon ? Coupon.count({ where: { is_active: true } }) : Promise.resolve(0),

    // 5. Últimos 5 pedidos
    Order.findAll({
      attributes: ["id", "order_number", "total", "status", "created_at"],
      include: [
        {
          model: Customer,
          attributes: ["first_name", "last_name"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 5,
    }),
  ]);

  const st = stockStats[0] || {};

  return {
    inventory: {
      total: parseInt(st.totalItems || 0, 10),
      normal: parseInt(st.normalCount || 0, 10),
      low: parseInt(st.lowCount || 0, 10),
      out: parseInt(st.outCount || 0, 10),
    },
    activeEmployees: parseInt(activeEmployees || 0, 10),
    pendingOrders: parseInt(pendingOrders || 0, 10),
    activeCoupons: parseInt(activeCoupons || 0, 10),
    recentOrders: recentOrders.map((o) => {
      const ord = o.toJSON ? o.toJSON() : o;
      const c = ord.customer || {};
      return {
        id: ord.id,
        order_number: ord.order_number,
        customer: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Cliente Tienda",
        total: parseFloat(ord.total || 0),
        status: ord.status,
        date: ord.created_at,
      };
    }),
  };
};

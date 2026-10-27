const db = require("../../index.js");

const Sequelize = db.Sequelize;
const Op = Sequelize.Op;

// Modelos requeridos (con compatibilidad de alias camelCase y snake_case)
const Order = db.order || db.Order;
const OrderItem = db.orderItem || db.order_item || db.OrderItem;
const Stock = db.stock || db.Stock;
const ProductVariant = db.productVariant || db.product_variant || db.ProductVariant;
const Product = db.product || db.Product;
const Brand = db.brand || db.Brand;
const Customer = db.customer || db.Customer;
const User = db.user || db.User;
const Role = db.role || db.Role;
const Coupon = db.coupon || db.Coupon;

const VALID_STATUSES = ["paid", "shipped", "delivered"];

// ---------------------------------------------------------------------------
// REPORTES DEL DASHBOARD (/reports/dashboard)
// ---------------------------------------------------------------------------

/**
 * REPORTE 1: Ventas Mensuales Realizadas
 * Agrupa por año y mes filtrando únicamente órdenes cobradas/completadas.
 */
exports.getMonthlySales = async () => {
  const isPostgres = db.sequelize.getDialect() === "postgres";
  const dateGrouping = isPostgres
    ? Sequelize.fn("TO_CHAR", Sequelize.col("orders.created_at"), "YYYY-MM")
    : Sequelize.fn("DATE_FORMAT", Sequelize.col("orders.created_at"), "%Y-%m");

  const results = await Order.findAll({
    attributes: [
      [dateGrouping, "period"],
      [Sequelize.fn("COUNT", Sequelize.col("orders.id")), "orders_count"],
      [
        Sequelize.fn("COALESCE", Sequelize.fn("SUM", Sequelize.col("orders.total")), 0),
        "total_amount",
      ],
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

/**
 * REPORTE 2: Productos Más Vendidos
 * Ranking por unidades facturadas con compatibilidad para PostgreSQL.
 */
exports.getTopProducts = async (limit = 5) => {
  const results = await OrderItem.findAll({
    attributes: [
      "product_variant_id",
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
    order: [[Sequelize.literal("sales_count"), "DESC"]],
    limit,
    raw: true,
  });

  return results.map((r, idx) => {
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
      salesCount: parseInt(r.sales_count || r.salesCount || 0, 10),
      revenue: parseFloat(r.revenue || 0),
    };
  });
};

/**
 * REPORTE 3: Existencias Críticas (Stock Crítico / Alertas)
 * Consulta variantes que estén activas, excluye huérfanos sin producto y
 * evalúa si la existencia actual está en o por debajo del punto de reorden (quantity_on_hand <= reorder_level).
 */
exports.getLowStock = async () => {
  const variants = await ProductVariant.findAll({
    where: { is_active: true },
    include: [
      {
        model: Product,
        attributes: ["id", "name"],
        where: { is_active: true },
        required: true, // 👈 Excluye huérfanos sin producto para evitar "Sin nombre (—/—)"
        include: [{ model: Brand, attributes: ["name"] }],
      },
      {
        model: Stock,
        required: false,
      },
    ],
    order: [
      [Product, "name", "ASC"],
      ["size", "ASC"],
    ],
  });

  const criticalItems = [];

  variants.forEach((vInstance) => {
    const v = vInstance.toJSON ? vInstance.toJSON() : vInstance;
    const stock = v.stock || v.Stock;
    const prod = v.product || v.Product || {};
    const brand = prod.brand || prod.Brand || {};

    const qty = stock ? parseInt(stock.quantity_on_hand, 10) : 0;
    const min = stock ? parseInt(stock.reorder_level, 10) : 5;

    // Condición real de alerta: agotado o existencias por debajo o igual al nivel de reorden
    if (qty <= min) {
      criticalItems.push({
        id: v.id,
        variantId: v.id,
        sku: v.sku || `SKU-${v.id}`,
        productName: prod.name || "Producto OnRival",
        name: `${prod.name || "Producto"} (${v.size || "U"}${v.color ? " / " + v.color : ""})`,
        brand: brand.name || "Sin marca",
        size: v.size || "—",
        color: v.color || "—",
        stock: qty,
        quantity_on_hand: qty,
        reorderLevel: min,
        reorder_level: min,
        status: qty === 0 ? "Agotado" : "Bajo stock",
      });
    }
  });

  // Ordenar primero agotados (0) y luego por menor cantidad
  return criticalItems.sort((a, b) => a.stock - b.stock);
};

/**
 * REPORTE 4: Pedidos Guest vs Registrados
 * Compara órdenes de clientes con cuenta formal vs compras directas de invitados.
 */
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
      [
        Sequelize.fn("COALESCE", Sequelize.fn("SUM", Sequelize.col("orders.total")), 0),
        "totalAmount",
      ],
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

// ---------------------------------------------------------------------------
// RESUMEN GENERAL INICIO (/reports/home-overview)
// ---------------------------------------------------------------------------

/**
 * Indicadores consolidados del inicio (KPIs y Estado de Existencias)
 * Sincronizado para reflejar la totalidad de variantes del catálogo.
 */
exports.getHomeStats = async () => {
  // 1. Conteo de existencias partiendo de ProductVariant con LEFT JOIN a Stock
  // Garantiza que variantes sin fila física en stocks cuenten como Agotadas (0)
  const variants = await ProductVariant.findAll({
    where: { is_active: true },
    include: [
      {
        model: Product,
        where: { is_active: true },
        attributes: ["id"],
        required: true,
      },
      {
        model: Stock,
        required: false,
      },
    ],
  });

  let normalCount = 0;
  let lowCount = 0;
  let outCount = 0;

  variants.forEach((vInstance) => {
    const v = vInstance.toJSON ? vInstance.toJSON() : vInstance;
    const stock = v.stock || v.Stock;
    const qty = stock ? parseInt(stock.quantity_on_hand, 10) : 0;
    const min = stock ? parseInt(stock.reorder_level, 10) : 5;

    if (qty === 0) {
      outCount++;
    } else if (qty <= min) {
      lowCount++;
    } else {
      normalCount++;
    }
  });

  // 2. Consultas concurrentes para métricas y órdenes recientes
  const [activeEmployees, pendingOrders, activeCoupons, recentOrders] = await Promise.all([
    User.count({
      include: [
        {
          model: Role,
          where: { name: { [Op.in]: ["admin", "employee"] } },
        },
      ],
      where: { is_active: true },
    }).catch(() => 0),

    Order.count({
      where: {
        status: { [Op.in]: ["pending_payment", "paid"] },
      },
    }).catch(() => 0),

    Coupon
      ? Coupon.count({ where: { is_active: true } }).catch(() => 0)
      : Promise.resolve(0),

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
    }).catch(() => []),
  ]);

  return {
    inventory: {
      total: variants.length,
      normal: normalCount,
      low: lowCount,
      out: outCount,
    },
    activeEmployees: parseInt(activeEmployees || 0, 10),
    pendingOrders: parseInt(pendingOrders || 0, 10),
    activeCoupons: parseInt(activeCoupons || 0, 10),
    recentOrders: recentOrders.map((o) => {
      const ord = o.toJSON ? o.toJSON() : o;
      const c = ord.customer || ord.Customer || {};
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
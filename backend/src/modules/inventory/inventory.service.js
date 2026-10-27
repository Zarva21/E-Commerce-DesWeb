const db = require("../index.js");

const Stock = db.stock; 
const InventoryMovement = db.inventoryMovement;
const ProductVariant = db.productVariant;
const Product = db.product;
const Brand = db.brand;
const Category = db.category;
const ProductImage = db.productImage;

// Tipos de movimiento estandarizados 
// siempre importa esta constante para evitar typos que rompan reportes/filtros después.
const MOVEMENT_TYPES = {
  PURCHASE_IN: "PURCHASE_IN",
  ADJUSTMENT_IN: "ADJUSTMENT_IN",
  ADJUSTMENT_OUT: "ADJUSTMENT_OUT",
  SALE_OUT: "SALE_OUT",
  SALE_RETURN_IN: "SALE_RETURN_IN",
  DAMAGE_OUT: "DAMAGE_OUT",
  SUPPLIER_RETURN_OUT: "SUPPLIER_RETURN_OUT",
};
exports.MOVEMENT_TYPES = MOVEMENT_TYPES;

const ADMIN_ADJUSTABLE_TYPES = [
  MOVEMENT_TYPES.PURCHASE_IN,
  MOVEMENT_TYPES.ADJUSTMENT_IN,
  MOVEMENT_TYPES.ADJUSTMENT_OUT,
  MOVEMENT_TYPES.DAMAGE_OUT,
  MOVEMENT_TYPES.SUPPLIER_RETURN_OUT
];

/**
 * Función central de doble escritura (stocks + inventory_movements).
 * Exige una transacción activa y aplica row-level lock.
 */
const recordMovement = async (
  { product_variant_id, quantityDelta, movement_type, employee_id = null, reference = null, notes = null },
  transaction
) => {
  if (!transaction) {
    throw new Error("recordMovement() requiere una transacción explícita.");
  }

  const pVarId = Number(product_variant_id);
  const delta = parseInt(quantityDelta, 10);

  // 1. Bloqueo pesimista de la fila en stocks
  let stock = await Stock.findOne({
    where: { product_variant_id: pVarId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  // 2. Si no existe en la tabla stocks (producto nuevo), se crea inicializado en 0
  if (!stock) {
    stock = await Stock.create(
      {
        product_variant_id: pVarId,
        quantity_on_hand: 0,
        reorder_level: 5,
      },
      { transaction }
    );
  }

  const currentQty = parseInt(stock.quantity_on_hand || 0, 10);
  const newQuantity = currentQty + delta;

  // 3. Validación de saldo negativo
  if (newQuantity < 0) {
    const error = new Error(`Stock insuficiente para la variante #${pVarId}. Existencias actuales: ${currentQty}`);
    error.status = 409;
    throw error;
  }

  // 4. Registro en el historial de movimientos
  await InventoryMovement.create(
    {
      product_variant_id: pVarId,
      employee_id: employee_id ? Number(employee_id) : null,
      movement_type,
      quantity: delta,
      reference: reference || "AJUSTE",
      notes: notes || null,
    },
    { transaction }
  );

  // 5. Persistir nuevo valor en stocks
  stock.quantity_on_hand = newQuantity;
  await stock.save({ transaction });

  return stock;
};
exports.recordMovement = recordMovement;

exports.deductStockForCheckout = async (items, transaction, employee_id = null) => {
  const updated = [];
  for (const item of items) {
    const stock = await recordMovement(
      {
        product_variant_id: item.product_variant_id,
        quantityDelta: -Math.abs(item.quantity),
        movement_type: MOVEMENT_TYPES.SALE_OUT,
        employee_id,
        reference: "checkout",
      },
      transaction
    );
    updated.push(stock);
  }
  return updated;
};

exports.restockForCancellation = async (items, transaction, employee_id = null, reference = "order-cancelled") => {
  for (const item of items) {
    await recordMovement(
      {
        product_variant_id: item.product_variant_id,
        quantityDelta: Math.abs(item.quantity),
        movement_type: MOVEMENT_TYPES.SALE_RETURN_IN,
        employee_id,
        reference,
      },
      transaction
    );
  }
};

exports.receiveFromSupplier = async ({ product_variant_id, quantity, employee_id, reference, notes }) => {
  return db.sequelize.transaction((t) =>
    recordMovement(
      {
        product_variant_id,
        quantityDelta: Math.abs(Number(quantity)),
        movement_type: MOVEMENT_TYPES.PURCHASE_IN,
        employee_id,
        reference: reference || "Recepción Proveedor",
        notes,
      },
      t
    )
  );
};

exports.adjustStock = async ({ product_variant_id, quantity, movement_type, employee_id, notes, reference }) => {
  if (!ADMIN_ADJUSTABLE_TYPES.includes(movement_type)) {
    const error = new Error(
      `Tipo de movimiento no permitido: "${movement_type}". Permitidos: ${ADMIN_ADJUSTABLE_TYPES.join(", ")}.`
    );
    error.status = 400;
    throw error;
  }

  const rawQty = Number(quantity);
  if (!rawQty || rawQty <= 0) {
    const error = new Error("La cantidad debe ser mayor a cero.");
    error.status = 400;
    throw error;
  }

  const isIncoming = [MOVEMENT_TYPES.PURCHASE_IN, MOVEMENT_TYPES.ADJUSTMENT_IN].includes(movement_type);
  const delta = isIncoming ? Math.abs(rawQty) : -Math.abs(rawQty);

  return db.sequelize.transaction((t) =>
    recordMovement(
      {
        product_variant_id,
        quantityDelta: delta,
        movement_type,
        employee_id,
        reference: reference || "Ajuste manual administrativo",
        notes,
      },
      t
    )
  );
};

exports.getStockByVariant = async (product_variant_id) => {
  const stock = await Stock.findOne({ where: { product_variant_id } });
  if (!stock) {
    const error = new Error("No existe registro de stock para esa variante.");
    error.status = 404;
    throw error;
  }
  return stock;
};

exports.getAllStock = async () => {
  const variants = await ProductVariant.findAll({
    include: [
      {
        model: Stock,
        required: false, // LEFT JOIN
      },
      {
        model: Product,
        attributes: ["id", "name", "cost_price", "sale_price", "is_active"],
        include: [
          { model: Brand, attributes: ["id", "name"] },
          { model: Category, attributes: ["id", "name"] },
          {
            model: ProductImage,
            attributes: ["id", "image_url", "is_primary", "display_order"],
          },
        ],
      },
    ],
    order: [
      [Product, "name", "ASC"],
      ["size", "ASC"],
    ],
  });

  return variants.map((vInstance) => {
    const v = vInstance.toJSON ? vInstance.toJSON() : vInstance;
    const stockRecord = v.stock || v.Stock || null;
    const prod = v.product || v.Product;
    const brand = prod?.brand || prod?.Brand;
    const cat = prod?.category || prod?.Category;
    const images = prod?.product_images || prod?.ProductImages || [];

    const primaryImg =
      images.find((img) => img.is_primary)?.image_url ||
      images[0]?.image_url ||
      "/img/placeholder.png";

    const qty = stockRecord ? parseInt(stockRecord.quantity_on_hand, 10) : 0;
    const reorder = stockRecord ? parseInt(stockRecord.reorder_level, 10) : 5;

    let stockStatus = "in_stock";
    if (qty === 0) {
      stockStatus = "out_of_stock";
    } else if (qty <= reorder) {
      stockStatus = "low_stock";
    }

    return {
      product_variant_id: Number(v.id),
      product_id: prod?.id,
      sku: v.sku,
      name: prod?.name
        ? `${prod.name} (${v.size || "U"}${v.color ? " · " + v.color : ""})`
        : `Variante #${v.id}`,
      product_name: prod?.name || "Sin nombre",
      size: v.size || "Única",
      color: v.color || null,
      barcode: v.barcode || null,
      brand: brand?.name || "Sin marca",
      category: cat?.name || "General",
      gender: "General",
      price: Number(prod?.sale_price || 0),
      cost_price: Number(prod?.cost_price || 0),
      image: primaryImg,
      quantity_on_hand: qty,
      reorder_level: reorder,
      status: stockStatus,
      has_stock_record: Boolean(stockRecord)
    };
  });
};

exports.getLowStock = () =>
  Stock.findAll({
    where: db.Sequelize.where(
      db.Sequelize.col("quantity_on_hand"),
      db.Sequelize.Op.lte,
      db.Sequelize.col("reorder_level")
    )
  });

exports.getMovementHistory = (filters = {}) => {
  const where = {};
  if (filters.product_variant_id) where.product_variant_id = filters.product_variant_id;
  if (filters.employee_id) where.employee_id = filters.employee_id;
  if (filters.movement_type) where.movement_type = filters.movement_type;
  return InventoryMovement.findAll({ where, order: [["created_at", "DESC"]] });
};
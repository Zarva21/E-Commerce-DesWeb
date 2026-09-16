const db = require("../index.js");

const Stock = db.stock;
const InventoryMovement = db.inventoryMovement;

// Tipos de movimiento estandarizados 
// siempre importa esta constante para evitar typos que rompan reportes/filtros después.
const MOVEMENT_TYPES = {
  PURCHASE_IN: "PURCHASE_IN",               // Entrada_Compra (recepción de proveedor)
  SALE_OUT: "SALE_OUT",                     // Salida_Venta (checkout confirmado)
  SALE_RETURN_IN: "SALE_RETURN_IN",         // Reingreso por cancelación/devolución de una venta
  DAMAGE_OUT: "DAMAGE_OUT",                 // Salida_Defecto (mermas)
  SUPPLIER_RETURN_OUT: "SUPPLIER_RETURN_OUT" // Salida_Devolucion_Proveedor
};
exports.MOVEMENT_TYPES = MOVEMENT_TYPES;

/**
 * recordMovement — LA función de doble escritura. Todo lo demás en este archivo
 * es un caso de uso específico que termina llamando a esta.
 *
 * SIEMPRE hace, dentro de la MISMA transacción:
 *   1. Bloquea la fila de `stock` (row-level lock) para que dos ventas
 *      simultáneas no lean el mismo número y sobrevendan.
 *   2. Valida que el resultado no quede negativo.
 *   3. Inserta el historial en `inventory_movements`.
 *   4. Actualiza el total en `stock`.
 *
 * @param {number} quantityDelta  positivo = entra stock, negativo = sale stock
 * @param {import("sequelize").Transaction} transaction  OBLIGATORIO — nunca se llama sin transacción
 */
const recordMovement = async (
  { product_variant_id, quantityDelta, movement_type, employee_id = null, reference = null, notes = null },
  transaction
) => {
  if (!transaction) {
    throw new Error("recordMovement() requiere una transacción explícita — nunca se llama a pelo.");
  }

  // Row-Level Lock: mientras esta transacción no termine (commit/rollback),
  // ninguna otra transacción puede leer/escribir esta misma fila de stock.
  // Esto es lo que evita que dos compras simultáneas vendan la última unidad dos veces.
  
  // Buscamos el stock y lo bloqueamos
  let stock = await Stock.findOne({
    where: { product_variant_id },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  // --- EL FIX EMPIEZA AQUÍ ---
  // Si la fila no existe (producto nuevo), la creamos con 0 unidades en esta misma transacción
  if (!stock) {
    stock = await Stock.create(
      { 
        product_variant_id, 
        quantity_on_hand: 0, 
        reorder_level: 5 // Nivel de alerta por defecto
      },
      { transaction }
    );
  }

  const newQuantity = stock.quantity_on_hand + quantityDelta;
  if (newQuantity < 0) {
    const error = new Error(`Stock insuficiente para la variante ${product_variant_id}.`);
    error.status = 409; // Conflict
    throw error;
  }

  await InventoryMovement.create(
    { product_variant_id, employee_id, movement_type, quantity: quantityDelta, reference, notes },
    { transaction }
  );

  stock.quantity_on_hand = newQuantity;
  await stock.save({ transaction });

  return stock;
};
exports.recordMovement = recordMovement;

/**
 * deductStockForCheckout — la función CRÍTICA que Sales llama durante el checkout.
 * items: [{ product_variant_id, quantity }]
 * Se ejecuta DENTRO de la transacción ACID de la venta (Sales pasa su propio `t`).
 */
exports.deductStockForCheckout = async (items, transaction, employee_id = null) => {
  const updated = [];
  for (const item of items) {
    const stock = await recordMovement(
      {
        product_variant_id: item.product_variant_id,
        quantityDelta: -Math.abs(item.quantity),
        movement_type: MOVEMENT_TYPES.SALE_OUT,
        employee_id,
        reference: "checkout"
      },
      transaction
    );
    updated.push(stock);
  }
  return updated;
};

/**
 * restockForCancellation — reversa de una venta (pedido pagado que se cancela).
 * También necesita transacción explícita (normalmente la abre order.service.js).
 */
exports.restockForCancellation = async (items, transaction, employee_id = null, reference = "order-cancelled") => {
  for (const item of items) {
    await recordMovement(
      {
        product_variant_id: item.product_variant_id,
        quantityDelta: Math.abs(item.quantity),
        movement_type: MOVEMENT_TYPES.SALE_RETURN_IN,
        employee_id,
        reference
      },
      transaction
    );
  }
};

/**
 * receiveFromSupplier — endpoint administrativo, abre su PROPIA transacción
 * (no depende de ningún flujo de Sales).
 */
exports.receiveFromSupplier = async ({ product_variant_id, quantity, employee_id, reference, notes }) => {
  return db.sequelize.transaction((t) =>
    recordMovement(
      { product_variant_id, quantityDelta: Math.abs(quantity), movement_type: MOVEMENT_TYPES.PURCHASE_IN, employee_id, reference, notes },
      t
    )
  );
};

/**
 * registerDamage — baja por producto dañado. Nunca un UPDATE directo a `stock`.
 */
exports.registerDamage = async ({ product_variant_id, quantity, employee_id, notes }) => {
  return db.sequelize.transaction((t) =>
    recordMovement(
      { product_variant_id, quantityDelta: -Math.abs(quantity), movement_type: MOVEMENT_TYPES.DAMAGE_OUT, employee_id, notes },
      t
    )
  );
};

exports.registerSupplierReturn = async ({ product_variant_id, quantity, employee_id, notes }) => {
  return db.sequelize.transaction((t) =>
    recordMovement(
      { product_variant_id, quantityDelta: -Math.abs(quantity), movement_type: MOVEMENT_TYPES.SUPPLIER_RETURN_OUT, employee_id, notes },
      t
    )
  );
};

/**
 * adjustStock — endpoint genérico POST /adjust.
 * Solo acepta los tipos de movimiento que un admin puede disparar MANUALMENTE.
 * SALE_OUT y SALE_RETURN_IN quedan fuera a propósito: esos los disparan
 * checkout.service.js y order.service.js internamente, nunca un humano a mano.
 */
const ADMIN_ADJUSTABLE_TYPES = [MOVEMENT_TYPES.DAMAGE_OUT, MOVEMENT_TYPES.SUPPLIER_RETURN_OUT];

exports.adjustStock = async ({ product_variant_id, quantity, movement_type, employee_id, notes }) => {
  if (!ADMIN_ADJUSTABLE_TYPES.includes(movement_type)) {
    const error = new Error(
      `Tipo de movimiento no permitido para ajuste manual: "${movement_type}". Usa uno de: ${ADMIN_ADJUSTABLE_TYPES.join(", ")}.`
    );
    error.status = 400;
    throw error;
  }

  return db.sequelize.transaction((t) =>
    recordMovement(
      { product_variant_id, quantityDelta: -Math.abs(quantity), movement_type, employee_id, notes },
      t
    )
  );
};

// --- Lecturas (no tocan stock, solo consultan) ---

exports.getStockByVariant = async (product_variant_id) => {
  const stock = await Stock.findOne({ where: { product_variant_id } });
  if (!stock) {
    const error = new Error("No existe stock para esa variante.");
    error.status = 404;
    throw error;
  }
  return stock;
};

exports.getAllStock = () => Stock.findAll();

// Alertas de reabastecimiento: quantity_on_hand <= reorder_level
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

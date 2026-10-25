const inventoryService = require("./inventory.service.js");

exports.getAllStock = async (req, res) => {
  try {
    res.status(200).send(await inventoryService.getAllStock());
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    res.status(200).send(await inventoryService.getLowStock());
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getStockByVariant = async (req, res) => {
  try {
    res.status(200).send(await inventoryService.getStockByVariant(req.params.variantId));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getMovementHistory = async (req, res) => {
  try {
    const { product_variant_id, employee_id, movement_type } = req.query;
    res.status(200).send(await inventoryService.getMovementHistory({ product_variant_id, employee_id, movement_type }));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// --- Escrituras (todas pasan por recordMovement internamente) ---
// employee_id sale de req.userId, que llena el middleware verifyToken (JWT).
// TODO: proteger estas 2 rutas con verifyToken + checkRole(["admin","employee"]).

exports.receive = async (req, res) => {
  try {
    const { product_variant_id, quantity, reference, notes } = req.body;
    const employee_id = req.userId;

    const result = await inventoryService.receiveFromSupplier({
      product_variant_id,
      quantity,
      employee_id,
      reference,
      notes,
    });

    return res.status(200).send({ message: "Mercadería recibida exitosamente.", data: result });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

exports.adjust = async (req, res) => {
  try {
    const { product_variant_id, quantity, movement_type, notes, reference } = req.body;
    const employee_id = req.userId;

    const result = await inventoryService.adjustStock({
      product_variant_id,
      quantity,
      movement_type,
      employee_id,
      notes,
      reference,
    });

    return res.status(200).send({ message: "Ajuste de inventario aplicado.", data: result });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

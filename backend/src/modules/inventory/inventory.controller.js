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
    if (!product_variant_id || !quantity) {
      return res.status(400).send({ message: "product_variant_id y quantity son obligatorios." });
    }
    const stock = await inventoryService.receiveFromSupplier({
      product_variant_id, quantity, employee_id: req.userId || null, reference, notes
    });
    res.status(201).send(stock);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.adjust = async (req, res) => {
  try {
    const { product_variant_id, quantity, movement_type, notes } = req.body;
    if (!product_variant_id || !quantity || !movement_type) {
      return res.status(400).send({ message: "product_variant_id, quantity y movement_type son obligatorios." });
    }
    const stock = await inventoryService.adjustStock({
      product_variant_id, quantity, movement_type, employee_id: req.userId || null, notes
    });
    res.status(201).send(stock);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

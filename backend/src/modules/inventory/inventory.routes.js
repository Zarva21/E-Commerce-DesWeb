const express = require("express");
const router = express.Router();
const inventory = require("./inventory.controller.js");

// Nota: "/stock/low" va ANTES de "/stock/:variantId" — si no, Express interpreta "low" como un id.
router.get("/stock", inventory.getAllStock);
router.get("/stock/low", inventory.getLowStock);
router.get("/stock/:variantId", inventory.getStockByVariant);

router.get("/movements", inventory.getMovementHistory);
router.post("/receive", inventory.receive); // recepción de proveedor (PURCHASE_IN)
router.post("/adjust", inventory.adjust);   // baja manual: body.movement_type = DAMAGE_OUT | SUPPLIER_RETURN_OUT

module.exports = router;

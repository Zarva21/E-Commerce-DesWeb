const express = require("express");
const router = express.Router();
const inventory = require("./inventory.controller.js");
const { verifyToken, checkRole } = require("../../middlewares/auth.middleware.js");

router.use(verifyToken, checkRole(["admin", "employee"]));

// --- Lecturas / Consultas de Existencias ---
// Nota: "/stock/low" va ANTES de "/stock/:variantId" para evitar que Express tome "low" como ID.
router.get("/stock", inventory.getAllStock);
router.get("/stock/low", inventory.getLowStock);
router.get("/stock/:variantId", inventory.getStockByVariant);

// --- Auditoría y Movimientos de Stock ---
router.get("/movements", inventory.getMovementHistory);

// Entrada de mercadería por compra / lote proveedor (PURCHASE_IN)
router.post("/receive", inventory.receive);

// Ajustes manuales (PURCHASE_IN, ADJUSTMENT_IN, DAMAGE_OUT, SUPPLIER_RETURN_OUT)
router.post("/adjust", inventory.adjust);

module.exports = router;
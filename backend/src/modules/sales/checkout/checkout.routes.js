const express = require("express");
const router = express.Router();
const checkout = require("./checkout.controller.js");
const validateBody = require("../../../middlewares/validate.middleware.js");
const optionalAuth = require("../../../middlewares/optionalAuth.middleware.js");
const { checkoutIntentSchema, checkoutConfirmSchema } = require("./sales.schema.js");

// optionalAuth va PRIMERO en ambas: si hay JWT lo usamos, si no, es invitado.
router.post("/intent", optionalAuth, validateBody(checkoutIntentSchema), checkout.createIntent);
router.post("/confirm", optionalAuth, validateBody(checkoutConfirmSchema), checkout.confirm);

module.exports = router;

// marketing.routes.js — Enrutador maestro del módulo "marketing".
// app.js lo monta en /api/v1/marketing.

const express = require("express");
const router = express.Router();

router.use("/coupons", require("./coupons/coupons.routes.js"));

module.exports = router;

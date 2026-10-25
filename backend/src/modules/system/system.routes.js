const express = require("express");
const router = express.Router();

// Submódulo de Reportes
router.use("/reports", require("./reports/reports.routes.js"));

module.exports = router;
// catalog.routes.js — Enrutador maestro del módulo "catalog".
// app.js lo monta en /api/v1/catalog, así que todo lo de abajo cuelga de ahí.

const express = require("express");
const router = express.Router();

router.use("/brands", require("./brands/brand.routes.js"));
router.use("/categories", require("./categories/category.routes.js"));
router.use("/suppliers", require("./suppliers/supplier.routes.js"));
router.use("/products", require("./products/product.routes.js"));
router.use("/reviews", require("./reviews/review.routes.js"));

module.exports = router;

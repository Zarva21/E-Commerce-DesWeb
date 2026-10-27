const express = require("express");
const router = express.Router();
const reports = require("./reports.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

// Todos los reportes requieren autenticación administrativa
router.use(verifyToken, checkRole(["admin", "employee"]));

// Dashboard consolidado (trae los 4 reportes en una sola llamada)
router.get("/dashboard", reports.getDashboard);
// GET /api/v1/system/reports/home-overview
router.get("/home-overview", reports.getHomeOverview);

// Endpoints individuales
router.get("/monthly-sales", reports.getMonthlySales);
router.get("/top-products", reports.getTopProducts);
router.get("/low-stock", reports.getLowStock);
router.get("/guest-vs-registered", reports.getGuestVsRegistered);

module.exports = router;
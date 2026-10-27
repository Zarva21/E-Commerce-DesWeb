// coupons.routes.js — Se monta en /api/v1/marketing/coupons

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const authConfig = require("../../../config/auth.config.js");

const coupon = require("./coupon.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

/**
 * Autenticación OPCIONAL para /validate.
 * El checkout de invitado ("shadow customer") también debe poder aplicar un
 * cupón de campaña, así que no exigimos token; pero si viene uno, lo leemos
 * para poder aceptar cupones nominales de Store Credit.
 */
const optionalAuth = (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];
  if (token && token.startsWith("Bearer ")) token = token.slice(7);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, authConfig.secret);
    req.userId = decoded.id;
  } catch (err) {
    // token inválido -> se trata como invitado
  }
  return next();
};

// --- Carrito ---
// OJO: /validate va antes de /:id para que Express no lo lea como un id.
router.post("/validate", optionalAuth, coupon.validate);

// --- Devoluciones: emitir saldo a favor ---
router.post("/store-credit", verifyToken, checkRole(["admin", "employee"]), coupon.issueStoreCredit);

// --- CRUD de administración ---
router.get("/", verifyToken, checkRole(["admin", "employee"]), coupon.getAll);
router.get("/:id", verifyToken, checkRole(["admin", "employee"]), coupon.getById);
router.post("/", verifyToken, checkRole(["admin"]), coupon.create);
router.put("/:id", verifyToken, checkRole(["admin"]), coupon.update);
router.delete("/:id", verifyToken, checkRole(["admin"]), coupon.remove);

module.exports = router;

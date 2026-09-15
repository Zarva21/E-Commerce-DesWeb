// product.routes.js — Se monta en /api/v1/catalog/products
//
// Las variantes, imágenes y reseñas NO tienen rutas propias: son entidades
// débiles y se administran colgadas de su producto padre.

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const authConfig = require("../../../config/auth.config.js");

const product = require("./product.controller.js");
const review = require("../reviews/review.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

/**
 * Autenticación OPCIONAL.
 * Las rutas de listado son públicas, pero si viene un token válido de un
 * admin/employee queremos mostrarle también los productos inactivos y el
 * precio de costo. Si no hay token, simplemente sigue como invitado.
 */
const attachStaffFlag = async (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];
  if (token && token.startsWith("Bearer ")) token = token.slice(7);

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, authConfig.secret);
    const db = require("../../index.js");
    const user = await db.user.findByPk(decoded.id, { include: db.role });
    if (user && user.role && ["admin", "employee"].includes(user.role.name)) {
      req.isStaff = true;
    }
    req.userId = decoded.id;
  } catch (err) {
    // Token inválido o vencido: lo tratamos como invitado, no cortamos la petición.
  }
  return next();
};

// --- Públicas (vitrina, búsqueda y filtros) ---
router.get("/", attachStaffFlag, product.getAll);
router.get("/:id", attachStaffFlag, product.getById);
router.get("/:id/variants", product.getVariants);
router.get("/:id/images", product.getImages);
router.get("/:id/reviews", review.getByProduct);

// --- Reseñas: solo un cliente autenticado puede opinar ---
router.post("/:id/reviews", verifyToken, checkRole(["customer"]), review.create);

// --- CRUD del producto (admin / employee) ---
router.post("/", verifyToken, checkRole(["admin", "employee"]), product.create);
router.put("/:id", verifyToken, checkRole(["admin", "employee"]), product.update);
router.delete("/:id", verifyToken, checkRole(["admin"]), product.remove);

// --- Variantes (entidad débil) ---
router.post("/:id/variants", verifyToken, checkRole(["admin", "employee"]), product.addVariant);
router.put("/:id/variants/:variantId", verifyToken, checkRole(["admin", "employee"]), product.updateVariant);
router.delete("/:id/variants/:variantId", verifyToken, checkRole(["admin"]), product.removeVariant);

// --- Imágenes (entidad débil). Hoy solo se guarda el string image_url. ---
router.post("/:id/images", verifyToken, checkRole(["admin", "employee"]), product.addImage);
router.delete("/:id/images/:imageId", verifyToken, checkRole(["admin", "employee"]), product.removeImage);

module.exports = router;

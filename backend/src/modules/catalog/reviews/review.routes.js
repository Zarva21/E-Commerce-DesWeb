// review.routes.js — Se monta en /api/v1/catalog/reviews
//
// La CREACIÓN de reseñas vive en product.routes.js
// (POST /catalog/products/:id/reviews), porque product_reviews es una entidad
// débil del producto. Aquí solo quedan la lectura, la edición del autor y la
// moderación del administrador.

const express = require("express");
const router = express.Router();
const review = require("./review.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

// Público: reseñas de un producto
router.get("/product/:productId", review.getByProduct);

// El propio cliente edita su reseña
router.put("/:id", verifyToken, checkRole(["customer"]), review.update);

// Moderación
router.delete("/:id", verifyToken, checkRole(["admin"]), review.remove);

module.exports = router;

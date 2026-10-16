const express = require("express");
const router = express.Router();
const upload = require("../../middlewares/upload.middleware.js");
const mediaController = require("./media.controller.js");
const { verifyToken, checkRole } = require("../../middlewares/auth.middleware.js");

// Subir una imagen temporal o general
router.post("/upload", [verifyToken, checkRole(["admin", "employee"]), upload.single("file")], mediaController.uploadSingle);

// Subir múltiples fotos directo a un producto (hasta 5 fotos por petición)
router.post("/products/:productId/images", [verifyToken, checkRole(["admin", "employee"]), upload.array("images", 5)], mediaController.uploadForProduct );

// Borrar foto de un producto
router.delete("/images/:id", [verifyToken, checkRole(["admin"])], mediaController.deleteImage);

module.exports = router;
// src/middlewares/upload.middleware.js
const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error("Formato no válido. Solo se permiten imágenes JPEG, PNG, WEBP o AVIF.");
    error.status = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Máximo 5MB por imagen
  },
});

module.exports = upload;
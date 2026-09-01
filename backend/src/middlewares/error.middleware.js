// error.middleware.js — captura global de errores.
// Cualquier error lanzado (throw) o pasado con next(err) en un middleware/
// controller (incluyendo los que usan catchAsync) termina aquí.

module.exports = (err, req, res, next) => {
  console.error("🔥 Error Global:", err.stack);

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Error interno del servidor",
    // En producción, nunca devuelvas el stack trace completo por seguridad
    error: process.env.NODE_ENV === "development" ? err.stack : {}
  });
};

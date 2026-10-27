// business.js — reglas de negocio centralizadas.
// Cualquier número "mágico" de negocio (límites, umbrales, plazos) vive aquí,
// nunca hardcodeado dentro de un .service.js.

module.exports = {
  payment: {
    // Fail Fast: si el método es CASH y el total supera esto, se rechaza
    // ANTES de tocar la base de datos o llamar a Stripe.
    maxCashLimit: Number(process.env.CASH_MAX_AMOUNT) || 5000
  }
};

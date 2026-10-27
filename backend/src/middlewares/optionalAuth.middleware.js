// optionalAuth.middleware.js — igual que verifyToken, pero NUNCA bloquea.
// Si hay un JWT válido, llena req.userId/req.roleId. Si no hay token, o es
// inválido, simplemente sigue como invitado — necesario para checkout
// de invitados (Shadow Customer) y para catálogo con "modo staff" opcional.

const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config.js");

module.exports = (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];
  if (token && token.startsWith("Bearer ")) token = token.slice(7);

  if (!token) return next(); // invitado, sin token — sigue de largo

  jwt.verify(token, authConfig.secret, (err, decoded) => {
    if (!err) {
      req.userId = decoded.id;
      req.roleId = decoded.role_id;
    }
    // token vencido/inválido: se trata como invitado, no se corta la petición
    next();
  });
};

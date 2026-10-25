const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config.js");
const db = require("../modules/index.js");

const User = db.user;
const Role = db.role;

const verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];

  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, authConfig.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Failed to authenticate token!" });
    }
    req.userId = decoded.id;
    req.roleId = decoded.role_id;
    next();
  });
};

/**
 * Uso: checkRole(["admin"]) o checkRole(["admin", "employee"])
 * Debe usarse SIEMPRE después de verifyToken (necesita req.userId).
 */
const checkRole = (allowedRoleNames) => {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.userId, { include: Role });
      if (!user || !user.role) {
        return res.status(403).send({ message: "No se pudo verificar el rol del usuario." });
      }
      if (!allowedRoleNames.includes(user.role.name)) {
        return res.status(403).send({ message: "No tienes permisos para esta acción." });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};
/**
 * isOwnerOrAdmin: Permite la acción si el usuario autenticado es ADMIN,
 * o si el registro en 'customers' le pertenece (customer.user_id === req.userId).
 */
const isOwnerOrAdmin = async (req, res, next) => {
  try {
    // Si ya viene como admin o employee con permisos globales:
    if (req.userRole === "admin") {
      return next();
    }

    const customerId = req.params.id;
    if (!customerId) {
      return res.status(400).send({ message: "ID de cliente no proporcionado." });
    }

    const customer = await db.customer.findByPk(customerId, {
      attributes: ["id", "user_id"]
    });

    if (!customer) {
      return res.status(404).send({ message: "Cliente no encontrado." });
    }

    // Comprobamos si el customer pertenece a la cuenta del token
    if (customer.user_id !== req.userId) {
      return res.status(403).send({
        message: "Acceso denegado: No tienes permiso para modificar o ver esta cuenta."
      });
    }

    // Adjuntamos el customer a la request por si el controlador lo necesita
    req.customer = customer;
    next();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports = {verifyToken ,checkRole ,isOwnerOrAdmin };


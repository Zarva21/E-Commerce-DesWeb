// src/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config.js");
const db = require("../modules/index.js");

const User = db.user;
const Role = db.role;
const Customer = db.customer;

/**
 * 1. verifyToken: Decodifica JWT e inyecta userId y userRole
 */
const verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  jwt.verify(token, authConfig.secret, async (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Failed to authenticate token!" });
    }

    req.userId = decoded.id;
    req.roleId = decoded.role_id;

    // Si el payload del token ya traía el nombre del rol (ej: decoded.role = "admin")
    if (decoded.role) {
      req.userRole = String(decoded.role).toLowerCase();
      return next();
    }

    // Si solo venía el id, buscamos el rol una sola vez aquí
    try {
      const user = await User.findByPk(req.userId, {
        attributes: ["id", "is_active", "role_id"],
        include: [{ model: Role, attributes: ["name"] }],
      });

      if (!user) {
        return res.status(404).send({ message: "Usuario no encontrado." });
      }

      if (!user.is_active) {
        return res.status(403).send({ message: "Cuenta desactivada." });
      }

      req.userRole = (user.role?.name || user.Role?.name || "customer").toLowerCase();
      next();
    } catch (dbErr) {
      return res.status(500).send({ message: dbErr.message });
    }
  });
};

/**
 * 2. checkRole: Valida si req.userRole coincide con alguno de los roles permitidos
 * Uso: checkRole(["admin"]) o checkRole(["admin", "employee"])
 */
const checkRole = (allowedRoleNames = []) => {
  const allowed = (Array.isArray(allowedRoleNames) ? allowedRoleNames : [allowedRoleNames])
    .map(r => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).send({ message: "No se pudo verificar el rol del usuario." });
    }

    if (!allowed.includes(req.userRole)) {
      return res.status(403).send({ message: "No tienes permisos para esta acción." });
    }

    next();
  };
};

/**
 * 3. isOwnerOrAdmin: Permite si es Admin o si el recurso pertenece al cliente autenticado
 */
const isOwnerOrAdmin = async (req, res, next) => {
  try {
    // Si es Administrador, tiene acceso irrestricto
    if (req.userRole === "admin") {
      return next();
    }

    const customerId = req.params.id;
    if (!customerId) {
      return res.status(400).send({ message: "ID de cliente no proporcionado." });
    }

    const customer = await Customer.findByPk(customerId, {
      attributes: ["id", "user_id"],
    });

    if (!customer) {
      return res.status(404).send({ message: "Cliente no encontrado." });
    }

    // Comprobamos si el customer pertenece a la cuenta autenticada (req.userId)
    if (Number(customer.user_id) !== Number(req.userId)) {
      return res.status(403).send({
        message: "Acceso denegado: No tienes permiso para ver o modificar este perfil.",
      });
    }

    req.customer = customer;
    next();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports = {
  verifyToken,
  checkRole,
  isOwnerOrAdmin,
};
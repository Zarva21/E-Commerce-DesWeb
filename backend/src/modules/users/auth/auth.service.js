const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../../index.js");
const config = require("../../../config/auth.config");
const emailService = require("../../../services/email.service.js");
const { setCache, getCache, delCache } = require("../../../config/redis.config.js");

const User = db.user;
const Role = db.role;
const Customer = db.customer;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// TTL para Refresh Tokens: 7 días (en segundos)
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

/**
 * Helper para generar el par de tokens:
 * - Access Token: JWT de corta duración (15 min o config.expiresIn)
 * - Refresh Token: Token criptográfico opaco guardado en Redis
 */
const generateSessionTokens = async (user, customerId) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      role_id: user.role_id,
      customer_id: customerId,
    },
    config.secret,
    { expiresIn: config.expiresIn || "15m" }
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");

  // Guardamos en Redis: refresh:<token> -> userId
  await setCache(`refresh:${refreshToken}`, String(user.id), REFRESH_TOKEN_TTL);

  return { accessToken, refreshToken };
};

// --- MÉTODOS DE AUTENTICACIÓN ---

exports.signup = async ({ email, password, roleName = "customer" }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw httpError("Ese correo ya está registrado.", 409);

  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) throw httpError(`El rol "${roleName}" no existe.`, 400);

  const password_hash = bcrypt.hashSync(password, 8);
  const user = await User.create({ email, password_hash, role_id: role.id, is_guest: false });

  return { id: user.id, email: user.email, role_id: user.role_id };
};

exports.signin = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw httpError("Correo o contraseña incorrectos.", 401);

  if (!user.password_hash) {
    throw httpError("Correo o contraseña incorrectos.", 401);
  }

  const passwordIsValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordIsValid) throw httpError("Correo o contraseña incorrectos.", 401);

  // 1. Generar código OTP numérico de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Guardar código en caché por 5 minutos (300 segundos)
  await setCache(`2fa:${user.id}`, code, 300);

  // 3. Enviar el correo con Resend
  if (emailService && emailService.send2FACode) {
    emailService
      .send2FACode({ email: user.email, code })
      .catch((err) => console.error("[Resend Error] Fallo al enviar código de login:", err.message));
  }

  // 4. Retornar que se requiere verificación de código
  return {
    requires2FA: true,
    userId: user.id,
    email: user.email,
    message: "Hemos enviado un código de verificación a tu correo.",
  };
};

exports.convertGuestToAccount = async ({ email, password, phone }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw httpError("No se encontró ninguna compra de invitado con ese correo.", 404);

  if (!user.is_guest) {
    throw httpError("Esta cuenta ya está registrada y activa. Inicia sesión normalmente.", 409);
  }

  // 1. Activar la cuenta de usuario con contraseña
  user.password_hash = bcrypt.hashSync(password, 8);
  user.is_guest = false;
  await user.save();

  // 2. Actualizar teléfono en customer si viene especificado
  const customer = await Customer.findOne({ where: { user_id: user.id } });
  if (customer && phone && String(phone).trim() !== "") {
    customer.phone = String(phone).trim();
    await customer.save();
  }

  // 3. Emitir par de tokens (Access + Refresh)
  const customerId = customer ? customer.id : null;
  const { accessToken, refreshToken } = await generateSessionTokens(user, customerId);

  return {
    id: user.id,
    customer_id: customerId,
    email: user.email,
    customer: customer
      ? {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
        }
      : null,
    accessToken,
    refreshToken,
    expiresIn: config.expiresIn,
    message: "Cuenta creada correctamente. Tu historial de compras como invitado ya está vinculado.",
  };
};

// --- MÉTODOS DE CORREO Y RECUPERACIÓN ---

exports.forgotPassword = async ({ email }) => {
  const user = await User.findOne({ where: { email } });

  if (user && user.password_hash) {
    const token = crypto.randomBytes(32).toString("hex");
    await setCache(`pwd_reset:${token}`, String(user.id), 900);

    if (emailService && emailService.sendPasswordReset) {
      emailService
        .sendPasswordReset({ email: user.email, token })
        .catch((err) => console.error("[Resend Error] Fallo al enviar enlace:", err.message));
    }
  }

  return { message: "Si la cuenta existe, recibirás un enlace de recuperación." };
};

exports.resetPassword = async ({ token, newPassword }) => {
  if (!token || !newPassword) throw httpError("Token y nueva contraseña requeridos.", 400);
  if (newPassword.length < 6) throw httpError("La contraseña debe tener al menos 6 caracteres.", 400);

  const userId = await getCache(`pwd_reset:${token}`);
  if (!userId) throw httpError("El enlace de recuperación es inválido o ha expirado.", 400);

  const user = await User.findByPk(userId);
  if (!user) throw httpError("Usuario no encontrado.", 404);

  user.password_hash = bcrypt.hashSync(newPassword, 8);
  await user.save();

  await delCache(`pwd_reset:${token}`);

  return { message: "Contraseña restablecida con éxito. Ya puedes iniciar sesión." };
};

exports.send2FACode = async ({ email }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw httpError("Usuario no encontrado.", 404);

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await setCache(`2fa:${user.id}`, code, 300);

  if (emailService && emailService.send2FACode) {
    emailService
      .send2FACode({ email: user.email, code })
      .catch((err) => console.error("[Resend Error] Fallo al enviar OTP:", err.message));
  }

  return { message: "Código enviado al correo.", userId: user.id };
};

exports.verify2FACode = async ({ userId, code }) => {
  if (!userId || !code) throw httpError("ID de usuario y código requeridos.", 400);

  const storedCode = await getCache(`2fa:${userId}`);
  if (!storedCode || storedCode !== String(code).trim()) {
    throw httpError("Código de verificación incorrecto o expirado.", 400);
  }

  await delCache(`2fa:${userId}`);

  const user = await User.findByPk(userId);
  if (!user) throw httpError("Usuario no encontrado.", 404);

  const customer = await Customer.findOne({ where: { user_id: user.id } });
  const customerId = customer ? customer.id : null;

  // Emitir par de tokens con Refresh Token persistido en Redis
  const { accessToken, refreshToken } = await generateSessionTokens(user, customerId);

  return {
    id: user.id,
    customer_id: customerId,
    email: user.email,
    customer: customer
      ? {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
        }
      : null,
    accessToken,
    refreshToken,
    expiresIn: config.expiresIn,
  };
};

exports.googleAuth = async ({ credential }) => {
  if (!credential) throw httpError("Falta el token de Google.", 400);

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw httpError("Token de Google inválido o expirado.", 401);
  }

  const payload = ticket.getPayload();
  const email = payload.email;
  const firstName = payload.given_name || "Cliente";
  const lastName = payload.family_name || "Google";

  let user = await User.findOne({ where: { email } });

  if (!user) {
    const customerRole = await Role.findOne({ where: { name: "customer" } });
    user = await User.create({
      email,
      password_hash: null,
      role_id: customerRole ? customerRole.id : 1,
      is_guest: false,
    });
  } else if (user.is_guest) {
    user.is_guest = false;
    await user.save();
  }

  let customer = await Customer.findOne({ where: { user_id: user.id } });
  if (!customer) {
    customer = await Customer.create({
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      phone: null,
    });
  }

  const { accessToken, refreshToken } = await generateSessionTokens(user, customer.id);

  return {
    id: user.id,
    customer_id: customer.id,
    email: user.email,
    customer: {
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
    },
    accessToken,
    refreshToken,
    expiresIn: config.expiresIn,
  };
};

// --- MÉTODOS DEL REFRESH TOKEN ---

/**
 * Valida el refresh token recibido de Redis, lo rota y entrega un nuevo access token
 */
exports.refreshSession = async (providedRefreshToken) => {
  if (!providedRefreshToken) {
    throw httpError("Refresh token requerido.", 400);
  }

  // 1. Buscar en Redis
  const userId = await getCache(`refresh:${providedRefreshToken}`);
  if (!userId) {
    throw httpError("El Refresh Token es inválido o ha expirado.", 403);
  }

  // 2. Buscar usuario
  const user = await User.findByPk(userId);
  if (!user || !user.is_active) {
    throw httpError("Usuario no encontrado o inactivo.", 403);
  }

  const customer = await Customer.findOne({ where: { user_id: user.id } });
  const customerId = customer ? customer.id : null;

  // 3. Rotar token (borrar el token anterior en Redis y generar uno nuevo)
  await delCache(`refresh:${providedRefreshToken}`);
  const { accessToken, refreshToken } = await generateSessionTokens(user, customerId);

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Cierre de sesión: invalida el refresh token en Redis
 */
exports.revokeSession = async (providedRefreshToken) => {
  if (providedRefreshToken) {
    await delCache(`refresh:${providedRefreshToken}`);
  }
  return { message: "Sesión cerrada exitosamente." };
};
const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Fallback en memoria por si Redis no está activo
const memoryStore = new Map();
let isRedisConnected = false;

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true, // No revienta la app de golpe si Redis no está corriendo
  retryStrategy(times) {
    if (times > 5) {
      // Detiene reintentos infinitos si estás en local sin Redis
      return null;
    }
    return Math.min(times * 150, 2000);
  },
});

// Intentar conectar en segundo plano
redisClient.connect()
  .then(() => {
    isRedisConnected = true;
    console.log("[Redis] Conectado exitosamente al almacén de sesiones y caché.");
  })
  .catch((err) => {
    isRedisConnected = false;
    console.warn("[Redis] No se pudo conectar a Redis. Usando memoria interna de respaldo:", err.message);
  });

redisClient.on("connect", () => {
  isRedisConnected = true;
});

redisClient.on("error", (err) => {
  isRedisConnected = false;
});

redisClient.on("close", () => {
  isRedisConnected = false;
});

// Helper: Guardar en caché con expiración en segundos (TTL)
const setCache = async (key, value, ttlSeconds = 300) => {
  const stringVal = typeof value === "object" ? JSON.stringify(value) : String(value);

  if (isRedisConnected) {
    try {
      await redisClient.set(key, stringVal, "EX", ttlSeconds);
      return;
    } catch {
      // Si falla Redis, pasa al fallback
    }
  }

  memoryStore.set(key, {
    value: stringVal,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

// Helper: Obtener de caché
const getCache = async (key) => {
  if (isRedisConnected) {
    try {
      const val = await redisClient.get(key);
      if (val !== null) return val;
    } catch {
      // Si falla Redis, pasa al fallback
    }
  }

  const entry = memoryStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }

  return entry.value;
};

// Helper: Eliminar llave de caché
const delCache = async (key) => {
  if (isRedisConnected) {
    try {
      await redisClient.del(key);
    } catch {
      // Ignorar
    }
  }
  memoryStore.delete(key);
};

module.exports = {
  redisClient,
  setCache,
  getCache,
  delCache,
};
const express = require("express");
const cors = require("cors");

// 1. Importar los enrutadores maestros de cada módulo
const userRoutes = require("./modules/users/users.routes");
const catalogRoutes = require("./modules/catalog/catalog.routes");
const salesRoutes = require("./modules/sales/sales.routes");
const inventoryRoutes = require("./modules/inventory/inventory.routes");
const marketingRoutes = require("./modules/marketing/marketing.routes");
// const systemRoutes = require("./modules/system/system.routes");

const errorHandler = require("./middlewares/error.middleware.js");

const app = express();

// 2. Middlewares Globales
app.use(cors({
  origin: [
    "http://localhost:5173", // Vite en desarrollo
    "http://localhost:3000", // Frontend alternativo
    "http://localhost",      // Producción / Nginx en Docker
    "http://127.0.0.1:5173"
  ],
  credentials: true, // Crucial para permitir envío de cookies (Refresh Token) y headers Authorization
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Montaje de Rutas (Inyectando el prefijo de versión)
const API_PREFIX = "/api/v1";
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/catalog`, catalogRoutes);
app.use(`${API_PREFIX}/sales`, salesRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/marketing`, marketingRoutes);
//app.use(`${API_PREFIX}/system`, systemRoutes);

// 4. Catch-all para rutas que no existen (404)
// Nota: se usa app.use() sin path, en vez de app.all('*', ...),
// porque Express 5 (path-to-regexp v6) ya no acepta '*' suelto como patrón.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `La ruta ${req.originalUrl} no existe en este servidor.`
  });
});

// 5. Middleware Global de Manejo de Errores (el paracaídas) — extraído a middlewares/error.middleware.js
app.use(errorHandler);

module.exports = app;

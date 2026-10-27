const dotenv = require("dotenv");
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

// Al requerir redis.config se inicializa la conexión automáticamente
require("./src/config/redis.config.js");

const app = require("./src/app.js");
const db = require("./src/modules/index.js");

// Endpoint de prueba
app.get("/", (req, res) => {
  res.json({
    name: "OnRival Store API",
    status: "running",
    ambiente: process.env.NODE_ENV || "development",
  });
});

const PORT = process.env.PORT || 8080;

// Sincronización de Base de Datos sin { alter: true }
db.sequelize
  .sync()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT} [ambiente: ${process.env.NODE_ENV || "development"}].`);
    });
  })
  .catch((err) => {
    console.error("No se pudo sincronizar o conectar a la base de datos:", err);
  });


  console.log("Comprobando entorno en ejecución:");
console.log("- PORT:", process.env.PORT);
console.log("- DB_HOST:", process.env.DB_HOST);
console.log("- REDIS_URL:", process.env.REDIS_URL ? "Definido" : "Falta");
console.log("- JWT_SECRET:", process.env.JWT_SECRET ? "Definido" : "Falta");
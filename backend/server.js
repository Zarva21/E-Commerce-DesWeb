const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
 
const app = express();
 

var corsOptions = {
  origin: "http://localhost:8080"
};
 
app.use(cors(corsOptions));
 
// Parsear requests de tipo application/json
app.use(bodyParser.json());
 
// Parsear requests de tipo application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
 
// Rutas del módulo de usuarios (una sola vez)
app.use("/api/users", require("./modules/users/users.routes.js"));
 
// Ruta simple de prueba
app.get("/", (req, res) => {
  res.json({ message: "UMG Web Application", ambiente: process.env.NODE_ENV || "development" });
});
 
const PORT = process.env.PORT || 8080;
 
const db = require("./modules/index.js");
 
// Esperamos a que sync() termine antes de levantar el servidor,
// para no aceptar peticiones mientras las tablas todavía se están creando/ajustando.
db.sequelize
  .sync() // usa { alter: true } solo en desarrollo si necesitas que ajuste columnas existentes
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} [ambiente: ${process.env.NODE_ENV || "development"}].`);
    });
  })
  .catch((err) => {
    console.error("No se pudo sincronizar la base de datos:", err.message);
  });
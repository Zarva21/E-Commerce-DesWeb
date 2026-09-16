const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
 
const dotenv = require("dotenv");
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

/**
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
app.use("/api/users", require("./src/modules/users/users.routes.js"));

*/

const app = require("./src/app.js");


// Ruta simple de prueba
app.get("/", (req, res) => {
  res.json({ message: "UMG Web Application", ambiente: process.env.NODE_ENV || "development" });
});
 
const PORT = process.env.PORT || 8080;
 

const db = require("./src/modules/index.js");
 
// Esperamos a que sync() termine antes de levantar el servidor,
// para no aceptar peticiones mientras las tablas todavía se están creando/ajustando.
db.sequelize
  .sync({ alter: true }) // usa { alter: true } solo en desarrollo si necesitas que ajuste columnas existentes
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} [ambiente: ${process.env.NODE_ENV || "development"}].`);
    });
  })
  .catch((err) => {
    console.error("No se pudo sincronizar la base de datos:", err);
    
  });
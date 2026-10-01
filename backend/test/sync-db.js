// test/sync-db.js
const db = require("../src/modules");

console.log("Sincronizando base de datos para pruebas...");

db.sequelize.sync({ force: true }) // force: true borra y recrea todo desde cero
  .then(() => {
    console.log("Tablas creadas exitosamente.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error sincronizando DB:", err);
    process.exit(1);
  });
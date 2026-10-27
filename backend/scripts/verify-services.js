/**
 * Diagnóstico no destructivo de dependencias externas.
 * No crea clientes, pagos, órdenes ni registros en PostgreSQL.
 */
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

const results = [];
const report = (service, ok, detail) => {
  results.push({ service, ok, detail });
  console.log(`${ok ? "OK" : "ERROR"}  ${service}: ${detail}`);
};

async function verifyDatabase() {
  try {
    const db = require("../src/modules");
    await db.sequelize.authenticate();
    await db.sequelize.close();
    report("PostgreSQL", true, "conexión autenticada");
  } catch (error) {
    report("PostgreSQL", false, error.message);
  }
}

async function verifyStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    report("Stripe", false, "falta STRIPE_SECRET_KEY (usa una llave sk_test_...)");
    return;
  }
  if (!key.startsWith("sk_test_")) {
    report("Stripe", false, "la llave no es de pruebas; por seguridad no se consulta Stripe en vivo");
    return;
  }

  try {
    const stripe = require("stripe")(key);
    await stripe.balance.retrieve();
    report("Stripe", true, "llave de pruebas válida y API accesible");
  } catch (error) {
    report("Stripe", false, error.message);
  }
}

(async () => {
  await verifyDatabase();
  await verifyStripe();

  if (results.some(({ ok }) => !ok)) process.exitCode = 1;
})();

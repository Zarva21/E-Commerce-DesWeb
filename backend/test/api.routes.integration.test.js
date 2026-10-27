// Auditoría no destructiva: comprueba que las rutas de consulta respondan y no fallen con 500.
const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const dotenv = require("dotenv");

const audit = process.env.RUN_ROUTE_AUDIT === "1" ? test : test.skip;
let db;
let server;
let baseUrl;

const reads = [
  "/api/v1/users/roles", "/api/v1/users/roles/999999999",
  "/api/v1/users/accounts/999999999",
  "/api/v1/users/employees", "/api/v1/users/employees/999999999",
  "/api/v1/users/customers", "/api/v1/users/customers/999999999",
  "/api/v1/catalog/categories", "/api/v1/catalog/categories/tree", "/api/v1/catalog/categories/999999999",
  "/api/v1/catalog/brands", "/api/v1/catalog/brands/999999999",
  "/api/v1/catalog/products", "/api/v1/catalog/products/999999999",
  "/api/v1/catalog/products/999999999/variants", "/api/v1/catalog/products/999999999/images",
  "/api/v1/catalog/products/999999999/reviews", "/api/v1/catalog/reviews/product/999999999",
  "/api/v1/sales/carts/999999999",
  "/api/v1/sales/orders", "/api/v1/sales/orders/999999999",
  "/api/v1/sales/finance/invoices", "/api/v1/sales/finance/invoices/999999999",
  "/api/v1/sales/finance/invoices/order/999999999", "/api/v1/sales/finance/payments",
  "/api/v1/sales/finance/payments/999999999",
  "/api/v1/inventory/stock", "/api/v1/inventory/stock/low", "/api/v1/inventory/stock/999999999",
  "/api/v1/inventory/movements"
];

before(async () => {
  dotenv.config({ path: ".env.development" });
  db = require("../src/modules");
  await db.sequelize.authenticate();
  const app = require("../src/app");
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (db) await db.sequelize.close();
});

for (const path of reads) {
  audit(`GET ${path} responde sin error interno`, async () => {
    const response = await fetch(`${baseUrl}${path}`);
    assert.notEqual(response.status, 500, `La ruta respondió 500: ${path}`);
    assert.ok([200, 403, 404].includes(response.status), `Estado inesperado ${response.status}: ${path}`);
  });
}

audit("las escrituras de checkout rechazan cuerpos incompletos sin tocar datos", async () => {
  for (const path of ["/api/v1/sales/checkout/intent", "/api/v1/sales/checkout/confirm"]) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    assert.equal(response.status, 400, path);
  }
});

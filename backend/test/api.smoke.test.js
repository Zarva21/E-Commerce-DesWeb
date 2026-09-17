// Pruebas de humo HTTP. No abren una conexión ni modifican PostgreSQL.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
// Stripe se inicializa al cargar las rutas de ventas, aunque estas pruebas no cobran.
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_123";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { response, body: await response.json() };
}

test("devuelve 404 y explica una ruta inexistente", async () => {
  const { response, body } = await request("/api/v1/no-existe");

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.match(body.message, /no existe/);
});

for (const endpoint of ["/signup", "/signin", "/convert-guest"]) {
  test(`rechaza ${endpoint} sin credenciales antes de consultar la base de datos`, async () => {
    const { response, body } = await request(`/api/v1/users/auth${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    assert.equal(response.status, 400);
    assert.equal(body.message, "Email y password son obligatorios.");
  });
}

for (const endpoint of [
  "/api/v1/catalog/categories",
  "/api/v1/catalog/products",
  "/api/v1/catalog/brands"
]) {
  test(`protege POST ${endpoint} cuando falta el token`, async () => {
    const { response, body } = await request(endpoint, { method: "POST" });

    assert.equal(response.status, 403);
    assert.equal(body.message, "No token provided!");
  });
}

test("rechaza un JWT malformado", async () => {
  const { response, body } = await request("/api/v1/catalog/categories", {
    method: "POST",
    headers: { authorization: "Bearer no-es-un-jwt" }
  });

  assert.equal(response.status, 401);
  assert.equal(body.message, "Failed to authenticate token!");
});

// Mientras se integra S3, las imágenes son URLs externas persistidas en product_images.
const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../src/modules");
const productService = require("../src/modules/catalog/products/product.service");

const originalFindByPk = db.product.findByPk;
const originalImageUpdate = db.productImage.update;
const originalImageCreate = db.productImage.create;
const originalTransaction = db.sequelize.transaction;

afterEach(() => {
  db.product.findByPk = originalFindByPk;
  db.productImage.update = originalImageUpdate;
  db.productImage.create = originalImageCreate;
  db.sequelize.transaction = originalTransaction;
});

test("guarda una URL quemada y conserva una sola imagen principal", async () => {
  const calls = [];
  db.product.findByPk = async (id) => id === 42 ? { id } : null;
  db.sequelize.transaction = async (callback) => callback({ id: "test-transaction" });
  db.productImage.update = async (...args) => calls.push({ type: "update", args });
  db.productImage.create = async (data, options) => {
    calls.push({ type: "create", data, options });
    return { id: 9, ...data };
  };

  const imageUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff";
  const image = await productService.addImage(42, {
    image_url: imageUrl,
    alt_text: "Zapatilla de prueba",
    display_order: 1,
    is_primary: true
  });

  assert.equal(image.image_url, imageUrl);
  assert.deepEqual(calls[0].args[0], { is_primary: false });
  assert.deepEqual(calls[0].args[1].where, { product_id: 42 });
  assert.equal(calls[1].data.product_id, 42);
  assert.equal(calls[1].data.image_url, imageUrl);
  assert.equal(calls[1].data.is_primary, true);
});

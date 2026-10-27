// catalog.service.js — CONTRATO PÚBLICO del módulo Catalog.
//
// Este archivo es la "puerta" que otros módulos (sobre todo Sales/Checkout)
// usan para consultarme. Los parámetros de entrada y la forma del JSON de
// salida NO se pueden cambiar: hay código de otros compañeros que depende
// de que esto devuelva exactamente esta estructura.

const db = require("./../index.js");

const ProductVariant = db.productVariant;
const Product = db.product;

/**
 * CONTRATO A
 *
 * getVariantForSale(productVariantId)
 *
 * Devuelve:
 *   { id, sku, price, is_active, product: { id, name } }  -> si existe y está activa
 *   null                                                   -> si no existe o está inactiva
 *
 * Reglas:
 *   - JOIN de product_variants + products.
 *   - "price" sale de products.sale_price (el precio NO cambia por talla).
 *   - is_active debe ser true en AMBAS tablas: una variante activa de un
 *     producto desactivado no se puede vender.
 *   - No valida stock: de eso se encarga el módulo Inventory.
 */
exports.getVariantForSale = async (productVariantId) => {
  if (!productVariantId) return null;

  const variant = await ProductVariant.findOne({
    where: { id: productVariantId, is_active: true },
    attributes: ["id", "sku", "is_active"],
    include: [
      {
        model: Product,
        required: true,                 // INNER JOIN: sin producto vivo, no hay venta
        where: { is_active: true },
        attributes: ["id", "name", "sale_price"]
      }
    ]
  });

  if (!variant || !variant.product) return null;

  return {
    id: variant.id,
    sku: variant.sku,
    price: Number(variant.product.sale_price),
    is_active: variant.is_active,
    product: {
      id: variant.product.id,
      name: variant.product.name
    }
  };
};

// product.service.js — El corazón del módulo Catalog.
//
// Aquí vive:
//   - El buscador con filtros (categoría jerárquica, marca, precio, disponibilidad).
//   - El "Eager Loading": traer producto + variantes + imágenes + marca + categoría
//     en UN solo JSON, para que el frontend no tenga que hacer 5 peticiones.
//   - La gestión de las entidades DÉBILES (product_variants, product_images),
//     que no tienen controlador propio y viven colgadas del producto.

const db = require("../../index.js");
const { Op } = require("sequelize");
const categoryService = require("../categories/category.service.js");

const Product = db.product;
const ProductVariant = db.productVariant;
const ProductImage = db.productImage;
const ProductReview = db.productReview;
const Brand = db.brand;
const Category = db.category;
const Supplier = db.supplier;
const Stock = db.stock; // Módulo Inventory: SOLO LECTURA desde aquí.

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Sequelize nombra los includes según el nombre del modelo
 * ("product_variants", "product_images"...). Ese JSON es feo para el frontend,
 * así que aquí lo normalizamos al contrato acordado:
 *   { ..., brand, category, variants: [...], images: [...] }
 */
const toProductDTO = (product) => {
  if (!product) return null;
  const p = product.toJSON ? product.toJSON() : product;

  return {
    id: p.id,
    public_id: p.public_id,
    name: p.name,
    description: p.description,
    cost_price: p.cost_price !== undefined ? Number(p.cost_price) : undefined,
    sale_price: Number(p.sale_price),
    is_active: p.is_active,
    brand_id: p.brand_id,
    category_id: p.category_id,
    supplier_id: p.supplier_id,
    created_at: p.created_at,
    updated_at: p.updated_at,
    brand: p.brand || null,
    category: p.category || null,
    supplier: p.supplier || null,
    variants: (p.product_variants || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      weight: v.weight !== null && v.weight !== undefined ? Number(v.weight) : null,
      barcode: v.barcode,
      is_active: v.is_active,
      // stock viene del módulo Inventory; puede no existir todavía
      quantity_on_hand: v.stock ? v.stock.quantity_on_hand : 0,
      reorder_level: v.stock ? v.stock.reorder_level : null
    })),
    images: (p.product_images || []).map((img) => ({
      id: img.id,
      image_url: img.image_url,
      alt_text: img.alt_text,
      display_order: img.display_order,
      is_primary: img.is_primary
    }))
  };
};

/** Quita cost_price: el precio de costo es información interna, no va a la vitrina. */
const toPublicProductDTO = (product) => {
  const dto = toProductDTO(product);
  if (!dto) return null;
  delete dto.cost_price;
  delete dto.supplier_id;
  delete dto.supplier;
  return dto;
};

/**
 * Listado con filtros y paginación.
 *
 * @param {object} filters
 *   q            - texto libre (busca en nombre y descripción)
 *   category_id  - incluye automáticamente las subcategorías (Hombre -> Zapatillas)
 *   brand_id
 *   min_price / max_price  - sobre sale_price
 *   page / limit
 *   sort         - "price_asc" | "price_desc" | "newest" | "name"
 * @param {object} options
 *   isAdmin      - true = ve inactivos y sin stock, y ve el cost_price
 */
exports.getAll = async (filters = {}, { isAdmin = false } = {}) => {
  const {
    q,
    category_id,
    brand_id,
    min_price,
    max_price,
    page = 1,
    limit = 12,
    sort = "newest"
  } = filters;

  const where = {};

  // Regla de negocio: el cliente SOLO ve productos activos.
  if (!isAdmin) where.is_active = true;

  if (q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } }
    ];
  }

  if (brand_id) where.brand_id = brand_id;

  if (category_id) {
    // Filtro jerárquico: al pedir "Hombre" también se traen sus hijas.
    const ids = await categoryService.getDescendantIds(category_id);
    where.category_id = { [Op.in]: ids };
  }

  if (min_price || max_price) {
    where.sale_price = {};
    if (min_price) where.sale_price[Op.gte] = min_price;
    if (max_price) where.sale_price[Op.lte] = max_price;
  }

  // El include de variantes trae el stock del módulo Inventory (solo lectura).
  // Para el público, required:true + quantity_on_hand > 0 hace que un producto
  // sin existencias simplemente no aparezca en la vitrina.
  const variantInclude = {
    model: ProductVariant,
    required: !isAdmin,
    where: isAdmin ? undefined : { is_active: true },
    include: [
      {
        model: Stock,
        required: !isAdmin,
        where: isAdmin ? undefined : { quantity_on_hand: { [Op.gt]: 0 } }
      }
    ]
  };

  const orderMap = {
    price_asc: [["sale_price", "ASC"]],
    price_desc: [["sale_price", "DESC"]],
    name: [["name", "ASC"]],
    newest: [["created_at", "DESC"]]
  };

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);
  const order = orderMap[sort] || orderMap.newest;

  // La consulta va en DOS PASOS a propósito.
  //
  // Si hiciéramos un findAndCountAll con los JOIN anidados (producto ->
  // variantes -> stock) más LIMIT, Postgres devolvería una fila por cada
  // combinación y la paginación saldría mal (un producto con 5 tallas se
  // "comería" 5 espacios de la página).
  //
  // Paso 1: averiguar QUÉ productos entran en esta página (solo los ids).
  // Paso 2: traer esos productos completos con todo su árbol.

  const rows = await Product.findAll({
    attributes: ["id"],
    where,
    include: [{ ...variantInclude, attributes: [] }],
    group: ["products.id"], // agrupar por PK permite ordenar por cualquier columna
    order,
    limit: pageSize,
    offset: (pageNumber - 1) * pageSize,
    subQuery: false,
    raw: true
  });

  const ids = rows.map((r) => r.id);

  const total = await Product.count({
    where,
    include: [{ ...variantInclude, attributes: [] }],
    distinct: true,
    col: "id" // OJO: aquí NO se pone "products.id", Sequelize ya le pone el prefijo
  });

  if (ids.length === 0) {
    return { total, page: pageNumber, limit: pageSize, pages: Math.ceil(total / pageSize), data: [] };
  }

  const products = await Product.findAll({
    where: { id: { [Op.in]: ids } },
    include: [
      {
        model: ProductVariant,
        required: false,
        where: isAdmin ? undefined : { is_active: true },
        include: [{ model: Stock, required: false }]
      },
      { model: ProductImage, required: false },
      { model: Brand, required: false },
      { model: Category, required: false }
    ],
    order
  });

  const mapper = isAdmin ? toProductDTO : toPublicProductDTO;

  return {
    total,
    page: pageNumber,
    limit: pageSize,
    pages: Math.ceil(total / pageSize),
    data: products.map(mapper)
  };
};

/**
 * Detalle de producto con EAGER LOADING completo.
 * Un solo JSON con variantes (+ stock), imágenes, marca y categoría.
 */
exports.getById = async (id, { isAdmin = false } = {}) => {
  const where = { id };
  if (!isAdmin) where.is_active = true;

  const product = await Product.findOne({
    where,
    include: [
      {
        model: ProductVariant,
        required: false,
        where: isAdmin ? undefined : { is_active: true },
        include: [{ model: Stock, required: false }]
      },
      { model: ProductImage, required: false },
      { model: Brand, required: false },
      { model: Category, required: false },
      ...(isAdmin ? [{ model: Supplier, required: false }] : [])
    ],
    order: [[ProductImage, "display_order", "ASC"]]
  });

  if (!product) throw httpError("Producto no encontrado.", 404);

  const dto = isAdmin ? toProductDTO(product) : toPublicProductDTO(product);

  // Promedio de calificación (lo consume el frontend para pintar estrellas)
  const reviews = await ProductReview.findAll({
    where: { product_id: id },
    attributes: [
      [db.sequelize.fn("AVG", db.sequelize.col("rating")), "average"],
      [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]
    ],
    raw: true
  });

  dto.rating_average = reviews[0] && reviews[0].average ? Number(Number(reviews[0].average).toFixed(2)) : null;
  dto.rating_count = reviews[0] ? Number(reviews[0].count) : 0;

  return dto;
};

// ---------------------------------------------------------------------------
// CRUD del producto (entidad fuerte)
// ---------------------------------------------------------------------------

/**
 * Crea el producto y, opcionalmente, sus variantes e imágenes en la MISMA
 * transacción. Si algo falla a medio camino, no queda un producto huérfano.
 */
exports.create = async (data) => {
  const {
    name, description, cost_price, sale_price,
    brand_id, category_id, supplier_id, is_active,
    variants = [], images = []
  } = data;

  if (!name) throw httpError("El nombre del producto es obligatorio.", 400);
  if (cost_price === undefined || sale_price === undefined) {
    throw httpError("cost_price y sale_price son obligatorios.", 400);
  }
  if (Number(sale_price) < 0 || Number(cost_price) < 0) {
    throw httpError("Los precios no pueden ser negativos.", 400);
  }

  if (brand_id && !(await Brand.findByPk(brand_id))) {
    throw httpError("La marca indicada no existe.", 400);
  }
  if (category_id && !(await Category.findByPk(category_id))) {
    throw httpError("La categoría indicada no existe.", 400);
  }
  if (supplier_id && !(await Supplier.findByPk(supplier_id))) {
    throw httpError("El proveedor indicado no existe.", 400);
  }

  return db.sequelize.transaction(async (t) => {
    const product = await Product.create(
      { name, description, cost_price, sale_price, brand_id, category_id, supplier_id, is_active },
      { transaction: t }
    );

    for (const variant of variants) {
      if (!variant.sku) throw httpError("Cada variante necesita un SKU.", 400);
      await ProductVariant.create(
        { ...variant, product_id: product.id },
        { transaction: t }
      );
    }

    for (const image of images) {
      if (!image.image_url) throw httpError("Cada imagen necesita un image_url.", 400);
      await ProductImage.create(
        { ...image, product_id: product.id },
        { transaction: t }
      );
    }

    return product;
  });
};

exports.update = async (id, data) => {
  const product = await Product.findByPk(id);
  if (!product) throw httpError("Producto no encontrado.", 404);

  if (data.brand_id && !(await Brand.findByPk(data.brand_id))) {
    throw httpError("La marca indicada no existe.", 400);
  }
  if (data.category_id && !(await Category.findByPk(data.category_id))) {
    throw httpError("La categoría indicada no existe.", 400);
  }
  if (data.supplier_id && !(await Supplier.findByPk(data.supplier_id))) {
    throw httpError("El proveedor indicado no existe.", 400);
  }

  // Nunca dejamos que el body reescriba relaciones débiles por accidente.
  const { variants, images, ...safeData } = data;

  return product.update(safeData);
};

exports.remove = async (id) => {
  const product = await Product.findByPk(id);
  if (!product) throw httpError("Producto no encontrado.", 404);

  // Soft delete en cascada lógica: el producto y sus hijos débiles salen de
  // circulación, pero el historial de ventas sigue pudiendo apuntar a ellos.
  await db.sequelize.transaction(async (t) => {
    await ProductVariant.destroy({ where: { product_id: id }, transaction: t });
    await ProductImage.destroy({ where: { product_id: id }, transaction: t });
    await product.destroy({ transaction: t });
  });
};

// ---------------------------------------------------------------------------
// Entidad DÉBIL: product_variants (las tallas/colores con su propio SKU)
// ---------------------------------------------------------------------------

const assertProductExists = async (productId) => {
  const product = await Product.findByPk(productId);
  if (!product) throw httpError("Producto no encontrado.", 404);
  return product;
};

exports.getVariants = async (productId) => {
  await assertProductExists(productId);
  return ProductVariant.findAll({
    where: { product_id: productId },
    include: [{ model: Stock, required: false }]
  });
};

exports.addVariant = async (productId, data) => {
  await assertProductExists(productId);

  if (!data.sku) throw httpError("El SKU de la variante es obligatorio.", 400);

  const existing = await ProductVariant.findOne({ where: { sku: data.sku } });
  if (existing) throw httpError(`El SKU "${data.sku}" ya está en uso.`, 409);

  return ProductVariant.create({ ...data, product_id: productId });
};

exports.updateVariant = async (productId, variantId, data) => {
  const variant = await ProductVariant.findOne({
    where: { id: variantId, product_id: productId }
  });
  if (!variant) throw httpError("Variante no encontrada para este producto.", 404);

  if (data.sku && data.sku !== variant.sku) {
    const existing = await ProductVariant.findOne({ where: { sku: data.sku } });
    if (existing) throw httpError(`El SKU "${data.sku}" ya está en uso.`, 409);
  }

  const { product_id, ...safeData } = data; // no se permite mover una variante de producto
  return variant.update(safeData);
};

exports.removeVariant = async (productId, variantId) => {
  const variant = await ProductVariant.findOne({
    where: { id: variantId, product_id: productId }
  });
  if (!variant) throw httpError("Variante no encontrada para este producto.", 404);

  await variant.destroy(); // soft delete
};

// ---------------------------------------------------------------------------
// Entidad DÉBIL: product_images
// NOTA: por instrucción del coordinador, POR AHORA no se sube ningún archivo.
// Solo se guarda el string image_url que mande el frontend. La infraestructura
// real (S3 / volumen Docker / multer) se programará después.
// ---------------------------------------------------------------------------

exports.getImages = async (productId) => {
  await assertProductExists(productId);
  return ProductImage.findAll({
    where: { product_id: productId },
    order: [["display_order", "ASC"]]
  });
};

exports.addImage = async (productId, { image_url, alt_text, display_order, is_primary }) => {
  await assertProductExists(productId);

  if (!image_url || typeof image_url !== "string") {
    throw httpError("image_url es obligatorio y debe ser un texto.", 400);
  }

  return db.sequelize.transaction(async (t) => {
    // Solo puede haber una imagen principal por producto.
    if (is_primary) {
      await ProductImage.update(
        { is_primary: false },
        { where: { product_id: productId }, transaction: t }
      );
    }

    return ProductImage.create(
      { product_id: productId, image_url, alt_text, display_order, is_primary },
      { transaction: t }
    );
  });
};

exports.removeImage = async (productId, imageId) => {
  const image = await ProductImage.findOne({
    where: { id: imageId, product_id: productId }
  });
  if (!image) throw httpError("Imagen no encontrada para este producto.", 404);

  await image.destroy(); // soft delete
};

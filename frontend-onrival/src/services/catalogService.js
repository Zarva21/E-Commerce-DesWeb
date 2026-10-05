import api from "../config/api";

// Adaptador: Convierte la respuesta anidada de Sequelize al formato que espera tu UI
export function adaptProduct(item) {
  // Imagen principal o fallback
  const primaryImg =
    item.images?.find((img) => img.is_primary)?.image_url ||
    item.images?.[0]?.image_url ||
    item.image_url ||
    item.product_images?.find((img) => img.is_primary)?.image_url ||
    item.product_images?.[0]?.image_url ||
    "/img/zapato1.jpg";

  // Suma total de inventario en todas las tallas/variantes
  const totalStock =
    item.variants?.reduce((acc, v) => acc + (v.stock?.quantity_on_hand || v.stock?.quantity || 0), 0) ??
    item.product_variants?.reduce((acc, v) => acc + (v.stock?.quantity_on_hand || v.stock?.quantity || 0), 0) ??
    0;

    // En catalogService.js dentro de adaptProduct:
  const rawVariants = item.product_variants || item.variants || [];

  const normalizedVariants = rawVariants.map((v) => {
    const stockQty = Number(
      v.stock?.quantity_on_hand ??
      v.stock?.quantity ??
      v.quantity_on_hand ??
      0
    );

    return {
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: {
        quantity: stockQty,
        quantity_on_hand: stockQty,
      },
    };
  });


  // Deducir género según la categoría si no viene explícito
  let gender = "Unisex";
  const catName = (item.category?.name || "").toLowerCase();
  const prodName = (item.name || "").toLowerCase();
  if (catName.includes("hombre") || prodName.includes("hombre")) gender = "Hombre";
  if (catName.includes("mujer") || prodName.includes("mujer")) gender = "Mujer";

  return {
    id: item.id,
    public_id: item.public_id,
    name: item.name,
    description: item.description || "",
    price: Number(item.sale_price),
    brand: item.brand?.name || "Sin marca",
    category: item.category?.name || "General",
    categoryId: item.category_id,
    gender,
    sport: item.category?.name || "Deporte",
    image: primaryImg,
    images: (item.images || item.product_images)?.map((img) => img.image_url) || [primaryImg],
    stock: totalStock,
    variants: normalizedVariants,
  };
}

export const catalogService = {
  // Obtener todos los productos activos
  async getProducts() {
    const res = await api.get("/catalog/products");
    // res.data.data contiene el arreglo de productos según tu backend
    const items = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    return items.map(adaptProduct);
  },

  // Alias para componentes que llamen getAll()
  async getAll() {
    return this.getProducts();
  },

  // Obtener el detalle completo de un producto por ID
  async getProductById(id) {
    const res = await api.get(`/catalog/products/${id}`);
    // Si viene en { data: { ... } } o directo
    const item = res.data?.data || res.data;
    return adaptProduct(item);
  },

  // Alias getById
  async getById(id) {
    return this.getProductById(id);
  },

  // Categorías
  async getCategories() {
    const res = await api.get("/catalog/categories");
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },
};
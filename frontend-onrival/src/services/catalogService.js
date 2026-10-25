import api from "../config/api";

// Adaptador: Convierte la respuesta anidada de Sequelize al formato de la tienda
export function adaptProduct(item) {
  const primaryImg =
    item.images?.find((img) => img.is_primary)?.image_url ||
    item.images?.[0]?.image_url ||
    item.image_url ||
    item.product_images?.find((img) => img.is_primary)?.image_url ||
    item.product_images?.[0]?.image_url ||
    "/img/zapato1.jpg";

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

  const totalStock = normalizedVariants.reduce((acc, v) => acc + v.stock.quantity_on_hand, 0);

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

// Adaptador para el Panel Administrativo
export function adaptAdminProduct(item) {
  const rawImages = item.product_images || item.images || [];
  const rawVariants = item.product_variants || item.variants || [];

  return {
    id: item.id,
    public_id: item.public_id || `PROD-${item.id}`,
    name: item.name,
    description: item.description || "",
    cost_price: Number(item.cost_price || 0),
    sale_price: Number(item.sale_price || 0),
    brand_id: item.brand_id,
    category_id: item.category_id,
    supplier_id: item.supplier_id,
    is_active: item.is_active ?? true,
    brand: item.brand || null,
    category: item.category || null,
    supplier: item.supplier || null,
    images: rawImages.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      is_primary: img.is_primary ?? false,
    })),
    variants: rawVariants.map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color || "",
      size: v.size || "",
      weight: v.weight || "",
      barcode: v.barcode || "",
      is_active: v.is_active ?? true,
      stock: v.stock || null,
    })),
  };
}

export const catalogService = {
  // --- CONSULTAS PÚBLICAS (TIENDA) ---
  async getProducts() {
    const res = await api.get("/catalog/products");

    // Desempaquetamos según la estructura que mande el backend:
    // Caso 1: res.data.data.data (controller con { data: result } y result.data)
    // Caso 2: res.data.data (result.data directo)
    // Caso 3: res.data directo como arreglo
    let items = [];

    if (Array.isArray(res.data?.data?.data)) {
      items = res.data.data.data;
    } else if (Array.isArray(res.data?.data)) {
      items = res.data.data;
    } else if (Array.isArray(res.data)) {
      items = res.data;
    }

    return items.map(adaptProduct);
  },

  async getAll() {
    return this.getProducts();
  },

  async getAll() {
    return this.getProducts();
  },

  async getProductById(id) {
    const res = await api.get(`/catalog/products/${id}`);
    const item = res.data?.data || res.data;
    return adaptProduct(item);
  },

  async getById(id) {
    return this.getProductById(id);
  },

  // --- CONSULTAS Y ACCIONES DE PRODUCTOS (ADMIN) ---
  async getAdminProducts() {
    const res = await api.get("/catalog/products?all=true");
    const items = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    return items.map(adaptAdminProduct);
  },

  async createProduct(productData) {
    const res = await api.post("/catalog/products", productData);
    return res.data?.data || res.data;
  },

  async updateProduct(id, productData) {
    const res = await api.put(`/catalog/products/${id}`, productData);
    return res.data?.data || res.data;
  },

  async deleteProduct(id) {
    const res = await api.delete(`/catalog/products/${id}`);
    return res.data?.data || res.data;
  },

  async toggleProductStatus(id) {
    const res = await api.patch(`/catalog/products/${id}/status`);
    return res.data?.data || res.data;
  },

  async addVariant(productId, variantData) {
    const res = await api.post(`/catalog/products/${productId}/variants`, variantData);
    return res.data?.data || res.data;
  },

  async deleteVariant(productId, variantId) {
    const res = await api.delete(`/catalog/products/${productId}/variants/${variantId}`);
    return res.data?.data || res.data;
  },

  // --- MARCAS ---
  async getBrands() {
    const res = await api.get("/catalog/brands");
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },

  async createBrand(brandData) {
    const res = await api.post("/catalog/brands", brandData);
    return res.data?.data || res.data;
  },

  async updateBrand(id, brandData) {
    const res = await api.put(`/catalog/brands/${id}`, brandData);
    return res.data?.data || res.data;
  },

  async deleteBrand(id) {
    const res = await api.delete(`/catalog/brands/${id}`);
    return res.data?.data || res.data;
  },

  // --- CATEGORÍAS ---
  async getCategories() {
    const res = await api.get("/catalog/categories");
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },

  async createCategory(categoryData) {
    const res = await api.post("/catalog/categories", categoryData);
    return res.data?.data || res.data;
  },

  async updateCategory(id, categoryData) {
    const res = await api.put(`/catalog/categories/${id}`, categoryData);
    return res.data?.data || res.data;
  },

  async deleteCategory(id) {
    const res = await api.delete(`/catalog/categories/${id}`);
    return res.data?.data || res.data;
  },

  // --- PROVEEDORES ---
  async getSuppliers() {
    const res = await api.get("/catalog/suppliers");
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },

  async createSupplier(supplierData) {
    const res = await api.post("/catalog/suppliers", supplierData);
    return res.data?.data || res.data;
  },

  async updateSupplier(id, supplierData) {
    const res = await api.put(`/catalog/suppliers/${id}`, supplierData);
    return res.data?.data || res.data;
  },

  async deleteSupplier(id) {
    const res = await api.delete(`/catalog/suppliers/${id}`);
    return res.data?.data || res.data;
  },
};

export default catalogService;
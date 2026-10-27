// src/admin/Catalog/mockCatalog.js

// ---------- MARCAS ----------
export const MOCK_BRANDS = [
  { id: 1, name: "Nike", description: "Indumentaria y calzado deportivo de alto rendimiento", logo_url: "" },
  { id: 2, name: "Adidas", description: "Ropa y accesorios para atletas profesionales", logo_url: "" },
  { id: 3, name: "Puma", description: "Calzado deportivo y moda urbana", logo_url: "" },
  { id: 4, name: "Under Armour", description: "Equipamiento atlético de compresión y entrenamiento", logo_url: "" },
];

// ---------- CATEGORÍAS (Árbol jerárquico) ----------
export const MOCK_CATEGORIES = [
  { id: 1, name: "Calzado", parent_category_id: null },
  { id: 2, name: "Fútbol", parent_category_id: 1 },
  { id: 3, name: "Running", parent_category_id: 1 },
  { id: 4, name: "Ropa", parent_category_id: null },
  { id: 5, name: "Camisetas", parent_category_id: 4 },
  { id: 6, name: "Pantalones y Shorts", parent_category_id: 4 },
  { id: 7, name: "Accesorios", parent_category_id: null },
  { id: 8, name: "Balones", parent_category_id: 7 },
  { id: 9, name: "Espinilleras", parent_category_id: 7 },
];

// ---------- PROVEEDORES ----------
export const MOCK_SUPPLIERS = [
  {
    id: 1,
    name: "Distribuidora Deportiva Central",
    contact_email: "contacto@distribuidoracentral.gt",
    phone: "+502 2345-6789",
  },
  {
    id: 2,
    name: "Importadora Global Sports S.A.",
    contact_email: "ventas@globalsports.gt",
    phone: "+502 2456-7890",
  },
  {
    id: 3,
    name: "Logística y Calzado de Centroamérica",
    contact_email: "info@logcalzado.com",
    phone: "+502 2210-9988",
  },
];

// ---------- PRODUCTOS ----------
export const MOCK_PRODUCTS = [
  {
    id: 1,
    public_id: "prod-9f1c7d2a-4b3e",
    name: "Adidas Predator Elite FG",
    description: "Botas de fútbol para terreno firme con inserciones de goma Strikeskin para mayor precisión.",
    cost_price: 950.0,
    sale_price: 1450.0,
    brand_id: 2,
    category_id: 2,
    supplier_id: 1,
    is_active: true,
    brand: MOCK_BRANDS[1],
    category: MOCK_CATEGORIES[1],
    supplier: MOCK_SUPPLIERS[0],
    images: [{ id: 1, image_url: "/img/placeholder.png" }],
    variants: [
      { id: 101, sku: "ADI-PRED-40", size: "40", color: "Negro/Rojo", is_active: true, barcode: "7441001001" },
      { id: 102, sku: "ADI-PRED-42", size: "42", color: "Negro/Rojo", is_active: true, barcode: "7441001002" },
      { id: 103, sku: "ADI-PRED-44", size: "44", color: "Negro/Rojo", is_active: true, barcode: "7441001003" },
    ],
  },
  {
    id: 2,
    public_id: "prod-5a8b2c1e-9d7f",
    name: "Nike Air Zoom Pegasus 40",
    description: "Calzado de running con amortiguación reactiva React y unidades Zoom Air dobles.",
    cost_price: 720.0,
    sale_price: 1150.0,
    brand_id: 1,
    category_id: 3,
    supplier_id: 2,
    is_active: true,
    brand: MOCK_BRANDS[0],
    category: MOCK_CATEGORIES[2],
    supplier: MOCK_SUPPLIERS[1],
    images: [{ id: 2, image_url: "/img/placeholder.png" }],
    variants: [
      { id: 201, sku: "NIKE-PEG-39", size: "39", color: "Azul/Blanco", is_active: true, barcode: "7441002001" },
      { id: 202, sku: "NIKE-PEG-41", size: "41", color: "Azul/Blanco", is_active: true, barcode: "7441002002" },
    ],
  },
  {
    id: 3,
    public_id: "prod-7c3e1b8d-2a4f",
    name: "Camiseta Oficial Real Madrid 2026/27",
    description: "Camiseta de tejido transpirable HEAT.RDY con escudo termosellado y detalles dorados.",
    cost_price: 520.0,
    sale_price: 850.0,
    brand_id: 2,
    category_id: 5,
    supplier_id: 1,
    is_active: true,
    brand: MOCK_BRANDS[1],
    category: MOCK_CATEGORIES[4],
    supplier: MOCK_SUPPLIERS[0],
    images: [{ id: 3, image_url: "/img/placeholder.png" }],
    variants: [
      { id: 301, sku: "RM-HOME-S", size: "S", color: "Blanco", is_active: true, barcode: "7441003001" },
      { id: 302, sku: "RM-HOME-M", size: "M", color: "M", is_active: true, barcode: "7441003002" },
      { id: 303, sku: "RM-HOME-L", size: "L", color: "L", is_active: true, barcode: "7441003003" },
    ],
  },
  {
    id: 4,
    public_id: "prod-2d4e6f8a-1c3b",
    name: "Balón Oficial Puma Orbita FIFA Pro",
    description: "Balón termosellado de alta aerodinámica con certificación FIFA Quality Pro.",
    cost_price: 280.0,
    sale_price: 450.0,
    brand_id: 3,
    category_id: 8,
    supplier_id: 3,
    is_active: true,
    brand: MOCK_BRANDS[2],
    category: MOCK_CATEGORIES[7],
    supplier: MOCK_SUPPLIERS[2],
    images: [{ id: 4, image_url: "/img/placeholder.png" }],
    variants: [
      { id: 401, sku: "PUMA-ORB-N5", size: "N° 5", color: "Blanco/Multicolor", is_active: true, barcode: "7441004001" },
    ],
  },
];
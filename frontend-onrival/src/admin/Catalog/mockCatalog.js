export const MOCK_BRANDS = [
  { id: 1, name: "Adidas", description: "Marca de ropa deportiva", logo_url: "" },
  { id: 2, name: "Nike", description: "Just Do It", logo_url: "" },
];

export const MOCK_CATEGORIES = [
  { id: 1, name: "Hombre", parent_category_id: null },
  { id: 2, name: "Mujer", parent_category_id: null },
  { id: 3, name: "Calzado", parent_category_id: 1 },
  { id: 4, name: "Ropa", parent_category_id: 1 },
];

export const MOCK_SUPPLIERS = [
  { id: 1, name: "Distribuidora Deportiva S.A.", contact_email: "contacto@distdeportiva.com", phone: "+502 2222-3333" },
  { id: 2, name: "Importadora Global GT", contact_email: "ventas@importgt.com", phone: "+502 4444-5555" },
];

export const MOCK_PRODUCTS = [
  {
    id: 1,
    public_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    name: "Tacos F50 Pro Firm",
    description: "Tacos de fútbol para terreno firme de alto rendimiento.",
    cost_price: 1100.0,
    sale_price: 1850.0,
    is_active: true,
    brand_id: 1,
    category_id: 3,
    supplier_id: 1,
    brand: { id: 1, name: "Adidas" },
    category: { id: 3, name: "Calzado" },
    supplier: { id: 1, name: "Distribuidora Deportiva S.A." },
    variants: [
      { id: 101, sku: "ADI-F50-41", color: "Azul/Blanco", size: "41", is_active: true },
      { id: 102, sku: "ADI-F50-42", color: "Azul/Blanco", size: "42", is_active: true }
    ],
    images: [
      { id: 1001, image_url: "/img/zapato1.jpg", alt_text: "Frestal Vista", is_primary: true }
    ]
  },
  {
    id: 2,
    public_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    name: "Playera Dri-FIT",
    description: "Playera transpirable para entrenamiento.",
    cost_price: 80.0,
    sale_price: 180.0,
    is_active: false,
    brand_id: 2,
    category_id: 4,
    supplier_id: 2,
    brand: { id: 2, name: "Nike" },
    category: { id: 4, name: "Ropa" },
    supplier: { id: 2, name: "Importadora Global GT" },
    variants: [
      { id: 103, sku: "NIK-DFIT-M", color: "Negro", size: "M", is_active: true }
    ],
    images: []
  }
];
// Opciones maestras de filtro, compartidas por Hombre, Mujer y Accesorios.
export const CATEGORY_OPTIONS = ["Camiseta", "Jersey", "Pantalón", "Zapatos", "Tacos", "Accesorio"];
export const BRAND_OPTIONS = ["Adidas", "Nike", "Under Armour", "New Balance"];
export const SPORT_OPTIONS = ["Fútbol", "Running", "Training"];
export const PRICE_RANGE = { min: 0, max: 2000 };

export const DEFAULT_FILTERS = {
  categoria: null,
  marca: null,
  oferta: false,
  priceMin: PRICE_RANGE.min,
  priceMax: PRICE_RANGE.max,
};
// Cada sección tiene una lista de "grupos" de filtro.
// Un grupo = { label: "Nombre del botón", options: [...] }
// Si una sección solo necesita un filtro, se le pone un solo grupo (como Hombre/Mujer).
export const FILTERS_BY_SECTION = {
  hombre: [
    { label: "Filtrar", options: ["Calzado", "Ropa", "Deporte", "Accesorios", "Oferta"] },
  ],
  mujer: [
    { label: "Filtrar", options: ["Calzado", "Ropa", "Deporte", "Accesorios", "Oferta"] },
  ],
  deportes: [
    { label: "Marcas", options: ["Adidas", "Nike", "Under Armour", "Otros"] },
    { label: "Filtrar", options: ["Calzado", "Ropa", "Accesorios", "Oferta"] },
    { label: "Género", options: ["Hombre", "Mujer"] },
  ],
  marcas: [
    { label: "Marcas", options: ["Adidas", "Nike", "Under Armour", "Otros"] },
    { label: "Filtrar", options: ["Calzado", "Ropa", "Accesorios", "Oferta"] },
    { label: "Género", options: ["Hombre", "Mujer"] },
  ],
  catalogo: [
    { label: "Filtrar", options: ["Calzado", "Ropa", "Accesorios", "Oferta"] },
  ],
};
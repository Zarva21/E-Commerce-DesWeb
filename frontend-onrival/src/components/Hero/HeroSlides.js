// Anuncios del carrusel principal. Ahora los administra el panel de admin
// (estos son solo los datos iniciales).
// TODO: cuando haya backend, esto viene de la API.
// link: { type: "none" } | { type: "product", productId } | { type: "offers" } | { type: "category", categoryId }
export const HERO_SLIDES = [
  {
    id: "slide-1",
    active: true,
    image: "/img/final-trionda.jpg",
    eyebrow: "NUEVO BALÓN",
    title: "ADIDAS TRIONDA FINAL PRO",
    ctaLabel: "Ir a comprar",
    link: { type: "product", productId: "balon-final" },
  },
  {
    id: "slide-2",
    active: true,
    image: "/img/real-madrid-26-27-png.png",
    eyebrow: "Nueva equipación",
    title: "NUEVA PIEL DEL REAL MADRID TEMPORADA 2026/2027",
    ctaLabel: "Ir a comprar",
    link: { type: "product", productId: "jersey-2" },
  },
];
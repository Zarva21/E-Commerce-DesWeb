// Datos de ejemplo, solo para ver cómo se ve el catálogo con productos.
// TODO: reemplazar esto por el fetch real a la API cuando esté lista,
// y borrar este archivo.
//
// category: usado también para las tallas (ver sizeOptions.js) y el filtro "Categoría".
// sport: usado por el filtro "Deporte".
// onSale: usado por el filtro "Oferta".
export const MOCK_PRODUCTS = {
  hombre: [
    {
      id: "zapato-1",
      image: "/img/zapato1.jpg",
      brand: "Adidas",
      name: "Tacos F50 Pro Firm",
      gender: "Hombre",
      category: "tacos",
      sport: "Fútbol",
      onSale: false,
      price: 1850,
    },
    {
      id: "zapato-2",
      image: "/img/zapato2.jpg",
      brand: "Nike",
      name: "Nike Pegasus 42",
      gender: "Hombre",
      category: "zapatos",
      sport: "Running",
      onSale: false,
      price: 1850,
    },
    {
      id: "jersey-1",
      image: "/img/barcelona-home-26-27.jpg",
      brand: "Nike",
      name: "FC Barcelona Jersey Local 2026/2027",
      gender: "Hombre",
      category: "jersey",
      sport: "Fútbol",
      onSale: true,
      price: 950,
    },
  ],
  mujer: [
    {
      id: "jogger-1",
      image: "/img/jogger-ua.png",
      brand: "Under Armour",
      name: "Pantalón Largo Motion Jogger de Mujer",
      gender: "Mujer",
      category: "pantalón",
      sport: "Training",
      onSale: true,
      price: 280,
    },
  ],
  accesorios: [
    {
      id: "balon-final",
      image: "/img/balon-final.jpg",
      brand: "Adidas",
      name: "Adidas Trionda Final Pro",
      gender: "Unisex",
      category: "accesorio",
      sport: "Fútbol",
      onSale: false,
      price: 1940,
    },
  ],
  catalogo: [],
};

export function findProductById(id) {
  return Object.values(MOCK_PRODUCTS)
    .flat()
    .find((product) => product.id === id);
}
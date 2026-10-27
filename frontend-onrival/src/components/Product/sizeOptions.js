const SHOE_CATEGORIES = ["calzado", "zapatos", "tenis", "tacos", "botines"];
const CLOTHING_CATEGORIES = ["ropa", "playera", "camiseta", "jersey", "polera", "pantalón", "pantalon"];

function normalize(value) { return (value ?? "").toString().trim().toLowerCase(); }
function range(start, end, step) {
  const sizes = [];
  for (let s = start; s <= end + 0.001; s += step) sizes.push(Number(s.toFixed(1)));
  return sizes;
}

export function getSizeOptions(product) {
  const category = normalize(product.category);
  const gender = normalize(product.gender);
  if (SHOE_CATEGORIES.includes(category)) return gender === "mujer" ? range(5.5, 8.5, 0.5) : range(6, 12, 0.5);
  if (CLOTHING_CATEGORIES.includes(category)) return ["XS", "S", "M", "L", "XL"];
  return [];
}
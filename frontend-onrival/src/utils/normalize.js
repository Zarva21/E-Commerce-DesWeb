// Normaliza texto para comparar sin importar mayúsculas/espacios extra.
export function normalize(value) {
  return (value ?? "").toString().trim().toLowerCase();
}
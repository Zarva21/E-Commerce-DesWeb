// Config central de la API. Cuando el backend esté listo,
// esto es lo único que hay que tocar (o mover a un .env).
export const API_URL = "http://localhost:4000/api"; // TODO: ajustar a tu API real

export const ENDPOINTS = {
  login: "/auth/login",
  register: "/auth/register",
};

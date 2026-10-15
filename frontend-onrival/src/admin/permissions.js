// Qué puede ver y hacer cada rol dentro del panel.
// Si llega un rol desconocido se usa el de menos permisos (empleado).
export const PERMISSIONS = {
  admin: {
    label: "Admin",
    views: ["dashboard", "catalogo", "inventario", "usuarios", "pedidos", "ofertas", "destacados"],
    canCreateProduct: true,
    canToggleProduct: true,
    canAddInventoryProduct: true,
    canSeeEmployees: true,
    canSeeSalesStats: true,
  },
  empleado: {
    label: "Empleado",
    views: ["dashboard", "catalogo", "inventario", "usuarios", "pedidos"],
    canCreateProduct: false,
    canToggleProduct: false,
    canAddInventoryProduct: false,
    canSeeEmployees: false,
    canSeeSalesStats: false,
  },
};

export const getPermissions = (role) => PERMISSIONS[role] ?? PERMISSIONS.empleado;
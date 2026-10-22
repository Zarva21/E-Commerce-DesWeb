// Qué puede ver y hacer cada rol dentro del panel.
// Si llega un rol desconocido se usa el de menos permisos (empleado).
// "reportes" y las ventas del panel general (canSeeSalesStats) son solo para admin.
export const PERMISSIONS = {
  admin: {
    label: "Admin",
    views: ["dashboard", "catalogo", "inventario", "usuarios", "pedidos", "reportes", "ofertas", "destacados"],
    canCreateProduct: true,
    canToggleProduct: true,
    canDeleteProduct: true,
    canManageCatalogEntities: true, // crear/editar/eliminar marcas, categorías y proveedores
    canAddInventoryProduct: true,
    canSeeEmployees: true,
    canDeleteUsers: true,
    canSeeSalesStats: true,
  },
  empleado: {
    label: "Empleado",
    views: ["dashboard", "catalogo", "inventario", "usuarios", "pedidos"],
    canCreateProduct: false,
    canToggleProduct: false,
    canDeleteProduct: false,
    canManageCatalogEntities: false,
    canAddInventoryProduct: false,
    canSeeEmployees: false,
    canDeleteUsers: false,
    canSeeSalesStats: false,
  },
};

export const getPermissions = (role) => PERMISSIONS[role] ?? PERMISSIONS.empleado;
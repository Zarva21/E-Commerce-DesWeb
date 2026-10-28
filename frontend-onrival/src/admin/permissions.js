// src/admin/permissions.js

export const PERMISSIONS = {
  admin: {
    label: "Admin",
    views: ["dashboard", "catalogo", "inventario", "usuarios", "pedidos", "reportes", "ofertas", "destacados"],
    canCreateProduct: true,
    canToggleProduct: true,
    canDeleteProduct: true,
    canManageCatalogEntities: true,
    canAddInventoryProduct: true,
    canSeeEmployees: true,
    canDeleteUsers: true,
    canSeeSalesStats: true,
    canChangeUserRole: true,
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
    canChangeUserRole: false, 
  },
};

export const getPermissions = (role) => PERMISSIONS[role] ?? PERMISSIONS.empleado;
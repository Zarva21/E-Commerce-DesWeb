const withName = (p) => ({ ...p, name: `${p.first_name} ${p.last_name}`.trim() });

export const MOCK_EMPLOYEES = [
  { id: 1, employee_code: "EMP-001", first_name: "Diego", last_name: "Morales", email: "diego@onrival.com", position: "Administrador", status: "Activo" },
  { id: 2, employee_code: "EMP-002", first_name: "Ana", last_name: "López", email: "ana@onrival.com", position: "Encargada de inventario", status: "Activo" },
  { id: 3, employee_code: "EMP-003", first_name: "Carlos", last_name: "Pérez", email: "carlos@onrival.com", position: "Atención al cliente", status: "Inactivo" },
].map(withName);

export const MOCK_CLIENTS = [
  { id: 101, first_name: "María", last_name: "Fernández", email: "maria.f@gmail.com", phone: "5555-4321", birth_date: "1995-03-14", gender: "Femenino", marketing_enabled: true, totalOrders: 5, status: "Activo" },
  { id: 102, first_name: "Luis", last_name: "Ramírez", email: "luis.ramirez@hotmail.com", phone: "4444-8899", birth_date: "", gender: "", marketing_enabled: false, totalOrders: 2, status: "Activo" },
  { id: 103, first_name: "Sofía", last_name: "Castillo", email: "sofia.c@gmail.com", phone: "3333-1122", birth_date: "2001-11-02", gender: "Femenino", marketing_enabled: true, totalOrders: 0, status: "Inactivo" },
].map(withName);
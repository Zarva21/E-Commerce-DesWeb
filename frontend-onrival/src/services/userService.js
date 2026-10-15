import api from "../config/api";

export const userService = {
  // GET /api/v1/users/employees
  async getEmployees() {
    const res = await api.get("/users/employees");
    const data = res.data?.data || res.data || [];
    return data.map((emp) => ({
      id: emp.id,
      user_id: emp.user_id,
      employee_code: emp.employee_code,
      name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Empleado",
      email: emp.user?.email || "—",
      role: emp.position || emp.user?.role?.name || "Empleado",
      status: emp.user?.is_active ? "Activo" : "Inactivo",
      is_active: Boolean(emp.user?.is_active),
    }));
  },

  // GET /api/v1/users/customers
  async getClients() {
    const res = await api.get("/users/customers");
    const data = res.data?.data || res.data || [];
    return data.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Cliente",
      email: c.user?.email || "—",
      phone: c.phone || "—",
      totalOrders: Number(c.orders_count || c.totalOrders || 0),
      status: (c.user?.is_active ?? true) ? "Activo" : "Inactivo",
      is_active: Boolean(c.user?.is_active ?? true),
    }));
  },

  // POST /api/v1/users/employees
  async createEmployee(payload) {
    const res = await api.post("/users/employees", payload);
    return res.data?.data || res.data;
  },

  // PATCH /api/v1/users/accounts/:id/deactivate
  async toggleAccountStatus(userId) {
    const res = await api.patch(`/users/accounts/${userId}/deactivate`);
    return res.data?.data || res.data;
  },
};
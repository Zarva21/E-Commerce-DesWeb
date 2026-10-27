import api from "../config/api";

export const userService = {
  // GET /api/v1/users/employees
  async getEmployees() {
    const res = await api.get("/users/employees");
    return res.data?.data || res.data || [];
  },

  // GET /api/v1/users/customers
  async getClients() {
    const res = await api.get("/users/customers");
    return res.data?.data || res.data || [];
  },

  // GET /api/v1/users/roles
  async getRoles() {
    const res = await api.get("/users/roles");
    return res.data?.data || res.data || [];
  },

  // POST /api/v1/users/employees
  async createEmployee(payload) {
    const res = await api.post("/users/employees", payload);
    return res.data?.data || res.data;
  },

  // PUT /api/v1/users/employees/:id
  async updateEmployee(id, payload) {
    const res = await api.put(`/users/employees/${id}`, payload);
    return res.data?.data || res.data;
  },

  // DELETE /api/v1/users/employees/:id
  async deleteEmployee(id) {
    const res = await api.delete(`/users/employees/${id}`);
    return res.data?.data || res.data;
  },

  // PUT /api/v1/users/customers/:id
  async updateClient(id, payload) {
    const res = await api.put(`/users/customers/${id}`, payload);
    return res.data?.data || res.data;
  },

  // DELETE /api/v1/users/customers/:id
  async deleteClient(id) {
    const res = await api.delete(`/users/customers/${id}`);
    return res.data?.data || res.data;
  },

  // PATCH /api/v1/users/accounts/:userId/role
  async updateUserRole(userId, roleId) {
    const res = await api.patch(`/users/accounts/${userId}/role`, { role_id: Number(roleId) });
    return res.data?.data || res.data;
  },

  // PATCH /api/v1/users/accounts/:userId/deactivate
  async toggleAccountStatus(userId) {
    const res = await api.patch(`/users/accounts/${userId}/deactivate`);
    return res.data?.data || res.data;
  },
};

export default userService;
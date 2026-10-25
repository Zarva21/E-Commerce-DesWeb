import api from "../config/api";

export const reportsService = {
  async getDashboardReports() {
    const res = await api.get("/system/reports/dashboard");
    return res.data?.data || res.data || {};
  },

  async getHomeOverview() {
    const res = await api.get("/system/reports/home-overview");
    return res.data?.data || res.data || {};
  },
};

export default reportsService;
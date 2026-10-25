const reportsService = require("./reports.service.js");

exports.getDashboard = async (req, res) => {
  try {
    const [monthlySales, topProducts, lowStock, guestVsRegistered] = await Promise.all([
      reportsService.getMonthlySales(),
      reportsService.getTopProducts(5),
      reportsService.getLowStock(10),
      reportsService.getGuestVsRegistered(),
    ]);

    return res.status(200).send({
      data: {
        monthlySales,
        topProducts,
        lowStock,
        guestVsRegistered,
      },
    });
  } catch (err) {
    console.error("Error en getDashboard:", err);
    return res.status(500).send({ message: err.message || "Error al obtener reportes del sistema." });
  }
};

exports.getMonthlySales = async (req, res) => {
  try {
    const data = await reportsService.getMonthlySales();
    return res.status(200).send({ data });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const data = await reportsService.getTopProducts(limit);
    return res.status(200).send({ data });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 10;
    const data = await reportsService.getLowStock(threshold);
    return res.status(200).send({ data });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getGuestVsRegistered = async (req, res) => {
  try {
    const data = await reportsService.getGuestVsRegistered();
    return res.status(200).send({ data });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getHomeOverview = async (req, res) => {
  try {
    const [homeStats, monthlySales, topProducts, lowStockAlerts] = await Promise.all([
      reportsService.getHomeStats(),
      reportsService.getMonthlySales(),
      reportsService.getTopProducts(5),
      reportsService.getLowStock(10)
    ]);

    return res.status(200).send({
      data: {
        ...homeStats,
        monthlySales,
        topProducts,
        lowStockAlerts
      }
    });
  } catch (err) {
    console.error("Error en getHomeOverview:", err);
    return res.status(500).send({ message: err.message || "Error al obtener datos de inicio." });
  }
};
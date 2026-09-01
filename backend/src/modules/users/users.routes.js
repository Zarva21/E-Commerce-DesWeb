// users.routes.js — enrutador maestro del módulo "users".


const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth/auth.routes.js"));
router.use("/roles", require("./roles/role.routes.js"));
router.use("/accounts", require("./accounts/user.routes.js"));
router.use("/employees", require("./employees/employee.routes.js"));
router.use("/customers", require("./customers/customer.routes.js"));

module.exports = router;

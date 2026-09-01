const express = require("express");
const router = express.Router();
const role = require("./role.controller.js");

router.get("/", role.getAll);
router.get("/:id", role.getById);
router.post("/", role.create);
router.put("/:id", role.update);
router.delete("/:id", role.remove);

module.exports = router;

const express = require("express");
const router = express.Router();
const attributeController = require("../../controllers/attributeController");
const {
  authenticateRequest,
} = require("../../middleware/auth-middleware/middleware");

router.use(authenticateRequest);

router.get(
  "/by-categories",
  attributeController.getAttributeDefinitionsByCategories
);
router.get("/", attributeController.getAllAttributeDefinitions);
router.post("/", attributeController.createAttributeDefinition);

module.exports = router;

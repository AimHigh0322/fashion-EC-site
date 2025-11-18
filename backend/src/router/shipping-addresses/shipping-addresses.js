const express = require("express");
const router = express.Router();
const shippingAddressController = require("../../controllers/shippingAddressController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

router.use(authenticateRequest);

router.get("/", shippingAddressController.getShippingAddresses);
router.get("/:id", shippingAddressController.getShippingAddressById);
router.post("/", shippingAddressController.createShippingAddress);
router.put("/:id", shippingAddressController.updateShippingAddress);
router.delete("/:id", shippingAddressController.deleteShippingAddress);
router.post("/:id/set-default", shippingAddressController.setDefaultAddress);
router.post("/calculate-shipping", shippingAddressController.calculateShipping);

module.exports = router;


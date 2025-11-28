const express = require("express");
const router = express.Router();
const bannerController = require("../../controllers/bannerController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

// All routes require authentication except getting active banners
router.get("/active", bannerController.getActiveBanners);

// All other routes require authentication
router.use(authenticateRequest);

// Banner CRUD routes
router.get("/", bannerController.getBanners);
router.get("/:id", bannerController.getBannerById);
router.post("/", bannerController.createBanner);
router.post("/multiple", bannerController.createBanners);
router.put("/:id", bannerController.updateBanner);
router.delete("/:id", bannerController.deleteBanner);

module.exports = router;


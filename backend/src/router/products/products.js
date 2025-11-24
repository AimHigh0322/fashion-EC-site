const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const productController = require("../../controllers/productController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

// Configure multer for file uploads
const uploadDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.mimetype === "application/vnd.ms-excel") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Public routes - viewing products (no authentication required)
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);

// Protected routes - modifying products (authentication required)
router.post("/", authenticateRequest, productController.createProduct);
router.put("/:id", authenticateRequest, productController.updateProduct);
router.delete("/:id", authenticateRequest, productController.deleteProduct);

// Bulk operations (require authentication)
router.post("/bulk-upload", authenticateRequest, upload.single("file"), productController.bulkUploadProducts);
router.post("/bulk-update-status", authenticateRequest, upload.single("file"), productController.bulkUpdateStatus);
router.get("/export/csv", authenticateRequest, productController.exportProducts);

module.exports = router;


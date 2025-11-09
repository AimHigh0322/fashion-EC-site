const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

// Configure multer for image uploads
const uploadDir = path.join(__dirname, "../../public/uploads/products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "img-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
}).single("image");

async function uploadImage(req, res) {
  upload(req, res, (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    // Use async IIFE to handle async operations properly
    (async () => {
      try {
        // Small delay to ensure file is fully written
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify file exists and directory exists
        if (!fs.existsSync(req.file.path)) {
          console.error("Uploaded file not found at path:", req.file.path);
          console.error("Upload directory:", uploadDir);
          return res.status(500).json({
            success: false,
            message: "File was not saved correctly. Please try again.",
          });
        }

        // Ensure directory exists
        const fileDir = path.dirname(req.file.path);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        // Get image metadata
        let metadata;
        try {
          metadata = await sharp(req.file.path).metadata();
        } catch (sharpError) {
          console.error("Sharp error reading file:", sharpError);
          // If sharp fails, try to get basic file info
          metadata = {
            width: null,
            height: null,
            format: path.extname(req.file.path).slice(1),
          };
        }

        // Save to database
        const imageId = uuidv4();
        const imageUrl = `/uploads/products/${req.file.filename}`;

        await pool.query(
          `INSERT INTO images (id, filename, original_filename, file_path, file_size, mime_type, width, height, uploaded_via, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            imageId,
            req.file.filename,
            req.file.originalname,
            imageUrl,
            req.file.size,
            req.file.mimetype,
            metadata?.width || null,
            metadata?.height || null,
            "web",
            req.user?.id || null,
          ]
        );

        res.json({
          success: true,
          data: {
            id: imageId,
            url: imageUrl,
            filename: req.file.filename,
            width: metadata?.width || null,
            height: metadata?.height || null,
          },
        });
      } catch (error) {
        console.error("Image upload error:", error);
        // Clean up file on error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (unlinkError) {
            console.error("Error deleting file:", unlinkError);
          }
        }
        res.status(500).json({
          success: false,
          message: error.message || "Failed to upload image",
        });
      }
    })();
  });
}

async function getImages(req, res) {
  try {
    const [images] = await pool.query(
      "SELECT * FROM images ORDER BY createdAt DESC LIMIT ?",
      [req.query.limit || 50]
    );
    res.json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  uploadImage,
  getImages,
};

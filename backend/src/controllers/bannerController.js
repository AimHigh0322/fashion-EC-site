const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const bannerModel = require("../model/bannerModel");
const { logAudit } = require("../middleware/auditLogger");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db/db");

// Configure multer for banner image uploads
const uploadDir = path.join(__dirname, "../../public/uploads/banners");
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
    cb(null, "banner-" + uniqueSuffix + ext);
  },
});

// Single image upload
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

// Multiple images upload
const uploadMultiple = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
}).array("images", 20); // Allow up to 20 images

// Optimize and resize image
async function optimizeImage(filePath, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 85,
    format = "webp",
  } = options;

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Calculate new dimensions maintaining aspect ratio
    let width = metadata.width;
    let height = metadata.height;

    if (width > maxWidth || height > maxHeight) {
      if (width / maxWidth > height / maxHeight) {
        width = maxWidth;
        height = Math.round((metadata.height * maxWidth) / metadata.width);
      } else {
        height = maxHeight;
        width = Math.round((metadata.width * maxHeight) / metadata.height);
      }
    }

    // Generate optimized image
    const optimizedPath = filePath.replace(
      path.extname(filePath),
      `-optimized.${format}`
    );

    await image
      .resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFormat(format, { quality })
      .toFile(optimizedPath);

    // Replace original with optimized if format is webp, otherwise keep both
    if (format === "webp") {
      fs.unlinkSync(filePath);
      return optimizedPath;
    }

    return filePath; // Keep original if not webp
  } catch (error) {
    console.error("Image optimization error:", error);
    return filePath; // Return original if optimization fails
  }
}

// Get all banners
async function getBanners(req, res) {
  try {
    const filters = {
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const banners = await bannerModel.getBanners(filters);
    res.json({ success: true, data: banners });
  } catch (error) {
    console.error("Get banners error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get banners",
      error: error.message,
    });
  }
}

// Get banner by ID
async function getBannerById(req, res) {
  try {
    const { id } = req.params;
    const banner = await bannerModel.getBannerById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.json({ success: true, data: banner });
  } catch (error) {
    console.error("Get banner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get banner",
      error: error.message,
    });
  }
}

// Create single banner with image upload
async function createBanner(req, res) {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      let imageUrl = req.body.image_url;

      // If image file is uploaded, process it
      if (req.file) {
        // Optimize the image
        const optimizedPath = await optimizeImage(req.file.path, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85,
          format: "webp",
        });

        // Get the filename from optimized path
        const filename = path.basename(optimizedPath);
        imageUrl = `/uploads/banners/${filename}`;

        // Save image metadata to database
        const imageId = uuidv4();
        const metadata = await sharp(optimizedPath).metadata();
        await pool.query(
          `INSERT INTO images (id, filename, original_filename, file_path, file_size, mime_type, width, height, uploaded_via, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            imageId,
            filename,
            req.file.originalname,
            imageUrl,
            fs.statSync(optimizedPath).size,
            "image/webp",
            metadata.width,
            metadata.height,
            "banner_upload",
            req.user?.id || null,
          ]
        );
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Image URL or image file is required",
        });
      }

      const bannerData = {
        title: req.body.title || req.body.name || "",
        title_color: req.body.title_color || "#000000",
        title_font_size: req.body.title_font_size || "text-4xl",
        title_position: req.body.title_position || "left",
        title_vertical_position: req.body.title_vertical_position || "middle",
        description: req.body.description || null,
        description_color: req.body.description_color || "#000000",
        description_font_size: req.body.description_font_size || "text-lg",
        description_position: req.body.description_position || "left",
        description_vertical_position: req.body.description_vertical_position || "middle",
        image_url: imageUrl,
        page_url: req.body.page_url || req.body.link_url || null,
        status: req.body.status || (req.body.is_active === "true" || req.body.is_active === true ? "active" : "inactive") || "active",
      };

      const banner = await bannerModel.createBanner(bannerData);

      // Log audit
      await logAudit(req, "create", "banner", banner.id, null, bannerData);

      res.status(201).json({
        success: true,
        message: "Banner created successfully",
        data: banner,
      });
    } catch (error) {
      console.error("Create banner error:", error);
      // Clean up uploaded file on error
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError);
        }
      }
      res.status(500).json({
        success: false,
        message: "Failed to create banner",
        error: error.message,
      });
    }
  });
}

// Create multiple banners with multiple image uploads
async function createBanners(req, res) {
  uploadMultiple(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const files = req.files || [];
      const bannersData = req.body.banners || [];

      if (files.length === 0 && bannersData.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one banner image is required",
        });
      }

      // Parse banners data if it's a string
      let parsedBanners = [];
      if (typeof bannersData === "string") {
        try {
          parsedBanners = JSON.parse(bannersData);
        } catch (e) {
          parsedBanners = [];
        }
      } else {
        parsedBanners = bannersData;
      }

      const createdBanners = [];
      const errors = [];

      // Process each file with its corresponding banner data
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const bannerInfo = parsedBanners[i] || {};

        try {
          // Optimize the image
          const optimizedPath = await optimizeImage(file.path, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 85,
            format: "webp",
          });

          // Get the filename from optimized path
          const filename = path.basename(optimizedPath);
          const imageUrl = `/uploads/banners/${filename}`;

          // Save image metadata to database
          const imageId = uuidv4();
          const metadata = await sharp(optimizedPath).metadata();
          await pool.query(
            `INSERT INTO images (id, filename, original_filename, file_path, file_size, mime_type, width, height, uploaded_via, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              imageId,
              filename,
              file.originalname,
              imageUrl,
              fs.statSync(optimizedPath).size,
              "image/webp",
              metadata.width,
              metadata.height,
              "banner_upload",
              req.user?.id || null,
            ]
          );

          const bannerData = {
            title: bannerInfo.title || "",
            title_color: bannerInfo.title_color || "#000000",
            title_font_size: bannerInfo.title_font_size || "text-4xl",
            title_position: bannerInfo.title_position || "left",
            title_vertical_position: bannerInfo.title_vertical_position || "middle",
            description: bannerInfo.description || null,
            description_color: bannerInfo.description_color || "#000000",
            description_font_size: bannerInfo.description_font_size || "text-lg",
            description_position: bannerInfo.description_position || "left",
            description_vertical_position: bannerInfo.description_vertical_position || "middle",
            image_url: imageUrl,
            page_url: bannerInfo.page_url || null,
            status: bannerInfo.status || "active",
          };

          const banner = await bannerModel.createBanner(bannerData);
          createdBanners.push(banner);

          // Log audit
          await logAudit(req, "create", "banner", banner.id, null, bannerData);
        } catch (error) {
          console.error(`Error creating banner ${i + 1}:`, error);
          // Clean up uploaded file on error
          if (file && file.path && fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkError) {
              console.error("Error deleting file:", unlinkError);
            }
          }
          errors.push({
            index: i,
            error: error.message,
          });
        }
      }

      if (errors.length > 0 && createdBanners.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Failed to create banners",
          errors: errors,
        });
      }

      res.status(201).json({
        success: true,
        message: `Successfully created ${createdBanners.length} banner(s)`,
        data: createdBanners,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Create banners error:", error);
      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach((file) => {
          if (file && file.path && fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkError) {
              console.error("Error deleting file:", unlinkError);
            }
          }
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to create banners",
        error: error.message,
      });
    }
  });
}

// Update banner
async function updateBanner(req, res) {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const { id } = req.params;
      const existingBanner = await bannerModel.getBannerById(id);

      if (!existingBanner) {
        return res.status(404).json({
          success: false,
          message: "Banner not found",
        });
      }

      let imageUrl = req.body.image_url || existingBanner.image_url;

      // If new image file is uploaded, process it
      if (req.file) {
        // Optimize the image
        const optimizedPath = await optimizeImage(req.file.path, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85,
          format: "webp",
        });

        const filename = path.basename(optimizedPath);
        imageUrl = `/uploads/banners/${filename}`;

        // Save image metadata
        const imageId = uuidv4();
        const metadata = await sharp(optimizedPath).metadata();
        await pool.query(
          `INSERT INTO images (id, filename, original_filename, file_path, file_size, mime_type, width, height, uploaded_via, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            imageId,
            filename,
            req.file.originalname,
            imageUrl,
            fs.statSync(optimizedPath).size,
            "image/webp",
            metadata.width,
            metadata.height,
            "banner_upload",
            req.user?.id || null,
          ]
        );

        // Delete old image file if it exists
        if (existingBanner.image_url) {
          const oldImagePath = path.join(
            __dirname,
            "../../public",
            existingBanner.image_url
          );
          if (fs.existsSync(oldImagePath)) {
            try {
              fs.unlinkSync(oldImagePath);
            } catch (unlinkError) {
              console.error("Error deleting old image:", unlinkError);
            }
          }
        }
      }

      const bannerData = {
        title: req.body.title || req.body.name,
        title_color: req.body.title_color,
        title_font_size: req.body.title_font_size,
        title_position: req.body.title_position,
        title_vertical_position: req.body.title_vertical_position,
        description: req.body.description,
        description_color: req.body.description_color,
        description_font_size: req.body.description_font_size,
        description_position: req.body.description_position,
        description_vertical_position: req.body.description_vertical_position,
        image_url: imageUrl,
        page_url: req.body.page_url || req.body.link_url,
        status: req.body.status || (req.body.is_active !== undefined ? (req.body.is_active === "true" || req.body.is_active === true ? "active" : "inactive") : undefined),
      };

      // Remove undefined values
      Object.keys(bannerData).forEach(
        (key) =>
          bannerData[key] === undefined && delete bannerData[key]
      );

      const banner = await bannerModel.updateBanner(id, bannerData);

      // Log audit
      await logAudit(req, "update", "banner", id, existingBanner, bannerData);

      res.json({
        success: true,
        message: "Banner updated successfully",
        data: banner,
      });
    } catch (error) {
      console.error("Update banner error:", error);
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError);
        }
      }
      res.status(500).json({
        success: false,
        message: "Failed to update banner",
        error: error.message,
      });
    }
  });
}

// Delete banner
async function deleteBanner(req, res) {
  try {
    const { id } = req.params;
    const banner = await bannerModel.getBannerById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Delete image file
    if (banner.image_url) {
      const imagePath = path.join(__dirname, "../../public", banner.image_url);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (unlinkError) {
          console.error("Error deleting image file:", unlinkError);
        }
      }
    }

    await bannerModel.deleteBanner(id);

    // Log audit
    await logAudit(req, "delete", "banner", id, banner, null);

    res.json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Delete banner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete banner",
      error: error.message,
    });
  }
}

// Get active banners (for frontend display)
async function getActiveBanners(req, res) {
  try {
    const banners = await bannerModel.getActiveBanners();
    res.json({ success: true, data: banners });
  } catch (error) {
    console.error("Get active banners error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get active banners",
      error: error.message,
    });
  }
}

module.exports = {
  getBanners,
  getBannerById,
  createBanner,
  createBanners,
  updateBanner,
  deleteBanner,
  getActiveBanners,
};

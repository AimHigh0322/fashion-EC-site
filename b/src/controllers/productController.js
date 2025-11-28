const productModel = require("../model/productModel");
const { logAudit } = require("../middleware/auditLogger");
const csv = require("csv-parser");
const fs = require("fs");
const { Readable } = require("stream");

// Create product
async function createProduct(req, res) {
  try {
    const productData = req.body;
    const result = await productModel.createProduct(productData, req.user?.id);

    // Log audit
    await logAudit(req, "create", "product", result.id, null, productData);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
}

// Update product
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const productData = req.body;

    // Get old values for audit
    const oldProduct = await productModel.getProductById(id);
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const result = await productModel.updateProduct(
      id,
      productData,
      req.user?.id
    );

    // Log audit
    await logAudit(req, "update", "product", id, oldProduct, productData);

    res.json({
      success: true,
      message: "Product updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
}

// Get product by ID
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await productModel.getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get product",
      error: error.message,
    });
  }
}

// Get products list
async function getProducts(req, res) {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status,
      brand_id: req.query.brand_id,
      category_id: req.query.category_id,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0,
    };

    const result = await productModel.getProducts(filters);

    res.json({
      success: true,
      data: result.products,
      count: result.products.length,
      total: result.total,
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get products",
      error: error.message,
    });
  }
}

// Delete product
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    // Get old values for audit
    const oldProduct = await productModel.getProductById(id);
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await productModel.deleteProduct(id);

    // Log audit
    await logAudit(req, "delete", "product", id, oldProduct, null);

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
}

// Bulk upload products from CSV
async function bulkUploadProducts(req, res) {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    filePath = req.file.path;
    const productsData = [];
    const parseErrors = [];

    // Parse CSV - support all fields from export
    const stream = fs.createReadStream(filePath);
    await new Promise((resolve, reject) => {
      let rowNumber = 0;
      stream
        .pipe(csv())
        .on("data", (row) => {
          rowNumber++;
          try {
            // Helper to parse value safely
            const parseValue = (value, type = "string") => {
              if (!value || value === "") return null;
              if (type === "number") {
                const num = parseFloat(value);
                return isNaN(num) ? null : num;
              }
              if (type === "int") {
                const num = parseInt(value);
                return isNaN(num) ? null : num;
              }
              if (type === "boolean") {
                return value === "true" || value === "1" || value === "TRUE";
              }
              return value.trim();
            };

            const productData = {
              // Required fields
              sku: (row.SKU || row.sku || "").trim(),
              name: (row.Name || row.name || "").trim(),

              // Basic fields
              description: parseValue(row.Description || row.description),
              price: parseValue(row.Price || row.price, "number") || 0,
              compare_price: parseValue(
                row["Compare Price"] || row.compare_price,
                "number"
              ),
              cost_price: parseValue(
                row["Cost Price"] || row.cost_price,
                "number"
              ),
              stock_quantity:
                parseValue(
                  row["Stock Quantity"] ||
                    row.Stock ||
                    row.stock ||
                    row.stock_quantity,
                  "int"
                ) || 0,
              status: (row.Status || row.status || "draft").toLowerCase(),

              // Brand
              brand_id: parseValue(row["Brand ID"] || row.brand_id),

              // URLs
              main_image_url: parseValue(
                row["Main Image URL"] || row.main_image_url
              ),
              product_url: parseValue(row["Product URL"] || row.product_url),

              // Physical attributes
              weight: parseValue(row.Weight || row.weight, "number"),
              dimensions: parseValue(row.Dimensions || row.dimensions),

              // SEO
              seo_title: parseValue(row["SEO Title"] || row.seo_title),
              seo_description: parseValue(
                row["SEO Description"] || row.seo_description
              ),

              // Featured
              is_featured:
                parseValue(row["Is Featured"] || row.is_featured, "boolean") ||
                false,

              // Categories - support multiple formats
              category_ids: [],
            };

            // Parse category IDs - support multiple formats
            const categoryIdsStr =
              row["Category IDs"] ||
              row["Category ID"] ||
              row.category_ids ||
              row.category_id ||
              "";
            if (categoryIdsStr) {
              productData.category_ids = categoryIdsStr
                .split(",")
                .map((id) => id.trim())
                .filter((id) => id !== "");
            }

            // Validate required fields
            if (!productData.sku) {
              parseErrors.push({
                row: rowNumber,
                error: "SKU is required",
                data: row,
              });
              return;
            }

            if (!productData.name) {
              parseErrors.push({
                row: rowNumber,
                error: "Name is required",
                data: row,
              });
              return;
            }

            productsData.push(productData);
          } catch (error) {
            parseErrors.push({
              row: rowNumber,
              error: error.message,
              data: row,
            });
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (productsData.length === 0) {
      // Clean up uploaded file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({
        success: false,
        message: "No valid products found in CSV",
        errors: parseErrors,
      });
    }

    // Process products
    const bulkResults = await productModel.bulkUpdateProducts(productsData);

    // Count successes and failures
    const successCount = bulkResults.filter(
      (r) => r.status === "success"
    ).length;
    const errorCount = bulkResults.filter((r) => r.status === "error").length;

    // Log audit
    await logAudit(req, "bulk_upload", "product", null, null, {
      count: productsData.length,
      success: successCount,
      errors: errorCount,
    });

    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: `Bulk upload completed: ${successCount} successful, ${errorCount} failed`,
      data: {
        total: productsData.length,
        successful: successCount,
        failed: errorCount,
        parseErrors: parseErrors.length > 0 ? parseErrors : undefined,
        results: bulkResults,
      },
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error("Error cleaning up file:", unlinkError);
      }
    }
    res.status(500).json({
      success: false,
      message: "Failed to process bulk upload",
      error: error.message,
    });
  }
}

// Bulk update status from CSV
async function bulkUpdateStatus(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    const productsData = [];

    // Parse CSV
    const stream = fs.createReadStream(req.file.path);
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (row) => {
          productsData.push({
            sku: row.SKU || row.sku,
            status: row.Status || row.status,
          });
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Process status updates
    const bulkResults = await productModel.bulkUpdateProducts(productsData);

    // Log audit
    await logAudit(req, "bulk_update_status", "product", null, null, {
      count: productsData.length,
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "Bulk status update completed",
      data: {
        total: productsData.length,
        results: bulkResults,
      },
    });
  } catch (error) {
    console.error("Bulk update status error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: "Failed to process bulk status update",
      error: error.message,
    });
  }
}

// Export products to CSV
async function exportProducts(req, res) {
  try {
    // Export all products - no pagination limits (limit/offset not included)
    const filters = {
      search: req.query.search,
      status: req.query.status,
      brand_id: req.query.brand_id,
      category_id: req.query.category_id,
      // Note: limit and offset are intentionally omitted to export ALL products
    };

    const result = await productModel.getProducts(filters);
    const products = result.products || [];

    // Helper function to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      // Replace double quotes with two double quotes and wrap in quotes if contains comma, newline, or quote
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Generate CSV with all product fields
    const csvHeader =
      [
        "ID",
        "SKU",
        "Name",
        "Description",
        "Price",
        "Compare Price",
        "Cost Price",
        "Stock Quantity",
        "Status",
        "Brand ID",
        "Brand Name",
        "Main Image URL",
        "Product URL",
        "Weight",
        "Dimensions",
        "SEO Title",
        "SEO Description",
        "Is Featured",
        "Category Count",
        "Category Names",
        "Created At",
        "Updated At",
      ].join(",") + "\n";

    const csvRows = products.map((p) => {
      return [
        escapeCSV(p.id),
        escapeCSV(p.sku),
        escapeCSV(p.name),
        escapeCSV(p.description),
        escapeCSV(p.price),
        escapeCSV(p.compare_price),
        escapeCSV(p.cost_price),
        escapeCSV(p.stock_quantity),
        escapeCSV(p.status),
        escapeCSV(p.brand_id),
        escapeCSV(p.brand_name),
        escapeCSV(p.main_image_url),
        escapeCSV(p.product_url),
        escapeCSV(p.weight),
        escapeCSV(p.dimensions),
        escapeCSV(p.seo_title),
        escapeCSV(p.seo_description),
        escapeCSV(p.is_featured),
        escapeCSV(p.category_count),
        escapeCSV(p.category_names),
        escapeCSV(p.createdAt),
        escapeCSV(p.updatedAt),
      ].join(",");
    });

    const csvContent = csvHeader + csvRows.join("\n");

    // Add UTF-8 BOM for Excel compatibility
    const BOM = "\ufeff";
    const csvWithBOM = BOM + csvContent;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=products_${Date.now()}.csv`
    );
    res.send(csvWithBOM);
  } catch (error) {
    console.error("Export products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export products",
      error: error.message,
    });
  }
}

module.exports = {
  createProduct,
  updateProduct,
  getProductById,
  getProducts,
  deleteProduct,
  bulkUploadProducts,
  bulkUpdateStatus,
  exportProducts,
};

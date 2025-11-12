const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

// Generate unique SKU in format XXX-YYY-000
// XXX: Category slug (English, 3 uppercase letters)
// YYY: Random 3 uppercase letters
// 000: Sequential number (3 digits, zero-padded)
async function generateSKU(categoryIds) {
  const connection = await pool.getConnection();
  try {
    let prefix = "PRD"; // Default prefix

    // Get primary category (first category) - use English slug
    if (categoryIds && categoryIds.length > 0) {
      const [categories] = await connection.query(
        "SELECT slug FROM categories WHERE id = ?",
        [categoryIds[0]]
      );
      if (categories.length > 0 && categories[0].slug) {
        // Use category slug (should be in English)
        const slug = categories[0].slug.toUpperCase();
        // Extract first 3 letters, remove non-alphabetic characters
        prefix = slug
          .replace(/[^A-Z]/g, "")
          .substring(0, 3)
          .padEnd(3, "X");
      }
    }

    // Generate random parts for middle and last section
    let sku = "";
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 1000;

    while (!isUnique && attempts < maxAttempts) {
      // Generate random 3-letter middle part (YYY)
      const randomPart = Math.random()
        .toString(36)
        .substring(2, 5)
        .toUpperCase()
        .padEnd(3, "0");

      // Generate random 3-digit number (000-999)
      const randomNumber = Math.floor(Math.random() * 1000);
      const numberStr = randomNumber.toString().padStart(3, "0");

      // Format: XXX-YYY-000
      sku = `${prefix}-${randomPart}-${numberStr}`;

      // Check if SKU already exists
      const [existing] = await connection.query(
        "SELECT id FROM products WHERE sku = ?",
        [sku]
      );

      if (existing.length === 0) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error("Failed to generate unique SKU after maximum attempts");
    }

    return sku;
  } finally {
    connection.release();
  }
}

// Create product
async function createProduct(productData, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const productId = uuidv4();

    // Validate that category is required
    if (!productData.category_ids || productData.category_ids.length === 0) {
      throw new Error("Category is required");
    }

    // Handle images - support both image_urls array and images array
    let imagesToProcess = [];
    if (productData.image_urls && Array.isArray(productData.image_urls)) {
      console.log(
        `[createProduct] Received image_urls array with ${productData.image_urls.length} items:`,
        productData.image_urls
      );
      // Remove duplicates
      const uniqueUrls = [...new Set(productData.image_urls)];
      console.log(
        `[createProduct] After removing duplicates: ${uniqueUrls.length} unique URLs`
      );
      imagesToProcess = uniqueUrls.map((url) => ({
        url: url,
        name: null,
        alt_text: null,
      }));
    } else if (productData.images && Array.isArray(productData.images)) {
      console.log(
        `[createProduct] Received images array with ${productData.images.length} items`
      );
      imagesToProcess = productData.images;
    }

    // Get first image name for SKU generation
    let firstImageName = null;
    if (imagesToProcess.length > 0) {
      const firstImage = imagesToProcess.find(
        (img) => img && img.url && img.url.trim() !== ""
      );
      if (firstImage && firstImage.name) {
        firstImageName = firstImage.name;
      } else if (firstImage && firstImage.url) {
        // Extract filename from URL
        const urlParts = firstImage.url.split("/");
        firstImageName = urlParts[urlParts.length - 1];
      }
    }

    const sku =
      productData.sku || (await generateSKU(productData.category_ids));

    // Generate product_url based on SKU
    const productUrl = `http://fashion-ec/${sku}`;

    // Determine main_image_url: use provided one, or first image URL, or null
    let mainImageUrl = productData.main_image_url || null;
    if (!mainImageUrl && imagesToProcess.length > 0) {
      // Find first valid image URL
      const firstImage = imagesToProcess.find(
        (img) => img && img.url && img.url.trim() !== ""
      );
      if (firstImage) {
        mainImageUrl = firstImage.url.trim();
      }
    }

    // Insert product
    // Convert empty string to null for brand_id to satisfy foreign key constraint
    const brandId =
      productData.brand_id && productData.brand_id !== ""
        ? productData.brand_id
        : null;

    await connection.query(
      `INSERT INTO products (
        id, sku, name, description, price, compare_price, cost_price,
        stock_quantity, status, brand_id, main_image_url, product_url, weight, dimensions,
        seo_title, seo_description, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        sku,
        productData.name,
        productData.description || null,
        productData.price,
        productData.compare_price || null,
        productData.cost_price || null,
        productData.stock_quantity || 0,
        productData.status || "draft",
        brandId,
        mainImageUrl,
        productUrl,
        productData.weight || null,
        productData.dimensions || null,
        productData.seo_title || null,
        productData.seo_description || null,
        productData.is_featured || false,
      ]
    );

    // Insert categories
    if (productData.category_ids && productData.category_ids.length > 0) {
      for (let i = 0; i < productData.category_ids.length; i++) {
        const categoryId = productData.category_ids[i];
        const isPrimary = i === 0;
        await connection.query(
          `INSERT INTO product_categories (id, product_id, category_id, is_primary)
           VALUES (?, ?, ?, ?)`,
          [uuidv4(), productId, categoryId, isPrimary]
        );
      }
    }

    // Insert attributes
    if (productData.attributes && Array.isArray(productData.attributes)) {
      for (const attr of productData.attributes) {
        await connection.query(
          `INSERT INTO product_attributes (id, product_id, attribute_definition_id, value)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE value = ?`,
          [
            uuidv4(),
            productId,
            attr.attribute_definition_id,
            attr.value,
            attr.value,
          ]
        );
      }
    }

    // Insert campaigns
    if (productData.campaign_ids && Array.isArray(productData.campaign_ids)) {
      for (const campaignId of productData.campaign_ids) {
        await connection.query(
          `INSERT INTO product_campaigns (id, product_id, campaign_id)
           VALUES (?, ?, ?)`,
          [uuidv4(), productId, campaignId]
        );
      }
    }

    // Insert images (only if they have a valid URL)
    if (imagesToProcess.length > 0) {
      console.log(
        `[createProduct] Processing ${imagesToProcess.length} images for product ${productId}`
      );
      // Remove duplicate URLs before inserting
      const seenUrls = new Set();
      const uniqueImages = imagesToProcess.filter((image) => {
        if (image && image.url && image.url.trim() !== "") {
          const url = image.url.trim();
          if (seenUrls.has(url)) {
            console.log(`[createProduct] Skipping duplicate image URL: ${url}`);
            return false;
          }
          seenUrls.add(url);
          return true;
        }
        return false;
      });
      console.log(
        `[createProduct] After removing duplicates: ${uniqueImages.length} unique images to insert`
      );

      let sortOrder = 0;
      for (const image of uniqueImages) {
        const imageUrl = image.url.trim();
        console.log(
          `[createProduct] Inserting image ${sortOrder + 1}/${
            uniqueImages.length
          }: ${imageUrl}`
        );
        await connection.query(
          `INSERT INTO product_images (id, product_id, image_url, image_name, alt_text, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            productId,
            imageUrl,
            image.name || image.filename || null,
            image.alt_text || null,
            sortOrder,
          ]
        );
        sortOrder++;
      }
      console.log(
        `[createProduct] Successfully inserted ${sortOrder} images into product_images table`
      );
    }

    await connection.commit();
    return { id: productId, sku };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Update product
async function updateProduct(productId, productData, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get current SKU to check if it changed
    const [currentProduct] = await connection.query(
      "SELECT sku FROM products WHERE id = ?",
      [productId]
    );
    const currentSku = currentProduct[0]?.sku;

    // Update product
    const updateFields = [];
    const updateValues = [];

    // Handle SKU update - if SKU changes, regenerate product_url
    if (productData.sku !== undefined && productData.sku !== currentSku) {
      // Check if new SKU is unique
      const [existing] = await connection.query(
        "SELECT id FROM products WHERE sku = ? AND id != ?",
        [productData.sku, productId]
      );
      if (existing.length > 0) {
        throw new Error("SKU already exists");
      }
      updateFields.push("sku = ?");
      updateValues.push(productData.sku);
      // Update product_url when SKU changes
      updateFields.push("product_url = ?");
      updateValues.push(`http://fashion-ec/${productData.sku}`);
    } else if (productData.sku === undefined) {
      // If SKU is not being updated, ensure product_url exists
      const [product] = await connection.query(
        "SELECT product_url FROM products WHERE id = ?",
        [productId]
      );
      if (!product[0]?.product_url && currentSku) {
        updateFields.push("product_url = ?");
        updateValues.push(`http://fashion-ec/${currentSku}`);
      }
    }

    if (productData.name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(productData.name);
    }
    if (productData.description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(productData.description);
    }
    if (productData.price !== undefined) {
      updateFields.push("price = ?");
      updateValues.push(productData.price);
    }
    if (productData.compare_price !== undefined) {
      updateFields.push("compare_price = ?");
      updateValues.push(productData.compare_price);
    }
    if (productData.cost_price !== undefined) {
      updateFields.push("cost_price = ?");
      updateValues.push(productData.cost_price);
    }
    if (productData.stock_quantity !== undefined) {
      updateFields.push("stock_quantity = ?");
      updateValues.push(productData.stock_quantity);

      // Auto-update status based on stock
      if (productData.stock_quantity === 0) {
        updateFields.push("status = 'out_of_stock'");
      } else if (productData.stock_quantity > 0) {
        const [current] = await connection.query(
          "SELECT status FROM products WHERE id = ?",
          [productId]
        );
        if (current[0] && current[0].status === "out_of_stock") {
          updateFields.push("status = 'active'");
        }
      }
    }
    if (productData.status !== undefined) {
      updateFields.push("status = ?");
      updateValues.push(productData.status);
    }
    if (productData.brand_id !== undefined) {
      updateFields.push("brand_id = ?");
      // Convert empty string to null for foreign key constraint
      updateValues.push(
        productData.brand_id === "" ? null : productData.brand_id
      );
    }
    if (productData.main_image_url !== undefined) {
      updateFields.push("main_image_url = ?");
      updateValues.push(productData.main_image_url);
    }
    if (productData.weight !== undefined) {
      updateFields.push("weight = ?");
      updateValues.push(productData.weight);
    }
    if (productData.dimensions !== undefined) {
      updateFields.push("dimensions = ?");
      updateValues.push(productData.dimensions);
    }
    if (productData.seo_title !== undefined) {
      updateFields.push("seo_title = ?");
      updateValues.push(productData.seo_title);
    }
    if (productData.seo_description !== undefined) {
      updateFields.push("seo_description = ?");
      updateValues.push(productData.seo_description);
    }
    if (productData.is_featured !== undefined) {
      updateFields.push("is_featured = ?");
      updateValues.push(productData.is_featured);
    }

    // Check if we need to set main_image_url from first image
    // This needs to be done before the UPDATE query
    if (
      productData.images !== undefined &&
      Array.isArray(productData.images) &&
      productData.main_image_url === undefined
    ) {
      // Find first valid image URL
      const firstImage = productData.images.find(
        (img) => img && img.url && img.url.trim() !== ""
      );
      if (firstImage) {
        updateFields.push("main_image_url = ?");
        updateValues.push(firstImage.url.trim());
      }
    }

    if (updateFields.length > 0) {
      updateValues.push(productId);
      await connection.query(
        `UPDATE products SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );
    }

    // Update categories if provided
    if (productData.category_ids !== undefined) {
      await connection.query(
        "DELETE FROM product_categories WHERE product_id = ?",
        [productId]
      );
      for (let i = 0; i < productData.category_ids.length; i++) {
        const categoryId = productData.category_ids[i];
        const isPrimary = i === 0;
        await connection.query(
          `INSERT INTO product_categories (id, product_id, category_id, is_primary)
           VALUES (?, ?, ?, ?)`,
          [uuidv4(), productId, categoryId, isPrimary]
        );
      }
    }

    // Update attributes if provided
    if (
      productData.attributes !== undefined &&
      Array.isArray(productData.attributes)
    ) {
      await connection.query(
        "DELETE FROM product_attributes WHERE product_id = ?",
        [productId]
      );
      for (const attr of productData.attributes) {
        await connection.query(
          `INSERT INTO product_attributes (id, product_id, attribute_definition_id, value)
           VALUES (?, ?, ?, ?)`,
          [uuidv4(), productId, attr.attribute_definition_id, attr.value]
        );
      }
    }

    // Update campaigns if provided
    if (
      productData.campaign_ids !== undefined &&
      Array.isArray(productData.campaign_ids)
    ) {
      await connection.query(
        "DELETE FROM product_campaigns WHERE product_id = ?",
        [productId]
      );
      for (const campaignId of productData.campaign_ids) {
        await connection.query(
          `INSERT INTO product_campaigns (id, product_id, campaign_id)
           VALUES (?, ?, ?)`,
          [uuidv4(), productId, campaignId]
        );
      }
    }

    // Update images if provided
    // Handle both image_urls array and images array
    let imagesToProcess = [];
    if (
      productData.image_urls !== undefined &&
      Array.isArray(productData.image_urls)
    ) {
      // Convert image_urls array to images array format
      imagesToProcess = productData.image_urls.map((url) => ({
        url: url,
        name: null,
        alt_text: null,
      }));
    } else if (
      productData.images !== undefined &&
      Array.isArray(productData.images)
    ) {
      imagesToProcess = productData.images;
    }

    if (imagesToProcess.length > 0) {
      await connection.query(
        "DELETE FROM product_images WHERE product_id = ?",
        [productId]
      );
      let sortOrder = 0;
      for (const image of imagesToProcess) {
        // Only insert images with valid URLs
        if (image && image.url && image.url.trim() !== "") {
          const imageUrl = image.url.trim();
          await connection.query(
            `INSERT INTO product_images (id, product_id, image_url, image_name, alt_text, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              productId,
              imageUrl,
              image.name || image.filename || null,
              image.alt_text || null,
              sortOrder,
            ]
          );
          sortOrder++;
        }
      }
    }

    await connection.commit();
    return { id: productId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Get product by ID
async function getProductById(productId) {
  const [products] = await pool.query(
    `SELECT p.*, b.name as brand_name
     FROM products p
     LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.id = ?`,
    [productId]
  );

  if (products.length === 0) {
    return null;
  }

  const product = products[0];

  // Get categories
  const [categories] = await pool.query(
    `SELECT c.*, pc.is_primary
     FROM product_categories pc
     JOIN categories c ON pc.category_id = c.id
     WHERE pc.product_id = ?
     ORDER BY pc.is_primary DESC, c.name`,
    [productId]
  );
  product.categories = categories;

  // Get attributes
  const [attributes] = await pool.query(
    `SELECT pa.*, ad.name as attribute_name, ad.type as attribute_type
     FROM product_attributes pa
     JOIN attribute_definitions ad ON pa.attribute_definition_id = ad.id
     WHERE pa.product_id = ?`,
    [productId]
  );
  product.attributes = attributes;

  // Get images
  const [images] = await pool.query(
    `SELECT * FROM product_images
     WHERE product_id = ?
     ORDER BY sort_order`,
    [productId]
  );
  product.images = images;

  // Get campaigns
  const [campaigns] = await pool.query(
    `SELECT c.*
     FROM product_campaigns pc
     JOIN campaigns c ON pc.campaign_id = c.id
     WHERE pc.product_id = ?`,
    [productId]
  );
  product.campaigns = campaigns;

  // Add image_urls array for convenience (extract from images)
  product.image_urls = images.map((img) => img.image_url);

  return product;
}

// Get products with filters
async function getProducts(filters = {}) {
  // Build WHERE clause for both count and data queries
  let whereClause = "WHERE 1=1";
  const params = [];

  if (filters.search) {
    whereClause += " AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (filters.status) {
    whereClause += " AND p.status = ?";
    params.push(filters.status);
  }

  if (filters.brand_id) {
    whereClause += " AND p.brand_id = ?";
    params.push(filters.brand_id);
  }

  if (filters.category_id) {
    whereClause += ` AND p.id IN (
      SELECT product_id FROM product_categories WHERE category_id = ?
    )`;
    params.push(filters.category_id);
  }

  if (filters.min_price) {
    whereClause += " AND p.price >= ?";
    params.push(filters.min_price);
  }

  if (filters.max_price) {
    whereClause += " AND p.price <= ?";
    params.push(filters.max_price);
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM products p
    ${whereClause}
  `;
  const [countResult] = await pool.query(countQuery, params);
  const total = countResult[0]?.total || 0;

  // Get products with pagination
  let dataQuery = `
    SELECT p.*, b.name as brand_name,
           (SELECT COUNT(*) FROM product_categories pc WHERE pc.product_id = p.id) as category_count,
           (SELECT GROUP_CONCAT(c.name ORDER BY pc.is_primary DESC, c.name SEPARATOR ', ')
            FROM product_categories pc
            JOIN categories c ON pc.category_id = c.id
            WHERE pc.product_id = p.id) as category_names
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    ${whereClause}
    ORDER BY p.createdAt DESC
  `;

  const dataParams = [...params];
  if (filters.limit) {
    dataQuery += " LIMIT ?";
    dataParams.push(parseInt(filters.limit));
    if (filters.offset) {
      dataQuery += " OFFSET ?";
      dataParams.push(parseInt(filters.offset));
    }
  }

  const [products] = await pool.query(dataQuery, dataParams);
  return { products, total };
}

// Delete product
async function deleteProduct(productId) {
  await pool.query("DELETE FROM products WHERE id = ?", [productId]);
  return { id: productId };
}

// Bulk update products from CSV
async function bulkUpdateProducts(productsData) {
  const connection = await pool.getConnection();
  const results = [];

  try {
    await connection.beginTransaction();

    for (const productData of productsData) {
      try {
        if (!productData.sku) {
          results.push({
            sku: "N/A",
            status: "error",
            error: "SKU is required",
          });
          continue;
        }

        // Check if product exists
        const [existing] = await connection.query(
          "SELECT id FROM products WHERE sku = ?",
          [productData.sku]
        );

        if (existing.length > 0) {
          // Update existing product with all fields
          const productId = existing[0].id;
          const updateFields = [];
          const updateValues = [];

          // Helper to add field if provided (allows empty strings to clear fields)
          const addField = (field, value) => {
            if (value !== undefined) {
              updateFields.push(`${field} = ?`);
              updateValues.push(value === null || value === "" ? null : value);
            }
          };

          addField("name", productData.name);
          addField("description", productData.description);
          addField("price", productData.price);
          addField("compare_price", productData.compare_price);
          addField("cost_price", productData.cost_price);
          addField("stock_quantity", productData.stock_quantity);
          addField("status", productData.status);
          addField("brand_id", productData.brand_id || null);
          addField("main_image_url", productData.main_image_url);
          addField("product_url", productData.product_url);
          addField("weight", productData.weight);
          addField("dimensions", productData.dimensions);
          addField("seo_title", productData.seo_title);
          addField("seo_description", productData.seo_description);
          addField("is_featured", productData.is_featured);

          // Auto-update status if stock is 0
          if (productData.stock_quantity === 0 && !productData.status) {
            updateFields.push("status = 'out_of_stock'");
          }

          if (updateFields.length > 0) {
            updateValues.push(productId);
            await connection.query(
              `UPDATE products SET ${updateFields.join(", ")} WHERE id = ?`,
              updateValues
            );
          }

          // Update categories if provided
          if (productData.category_ids && productData.category_ids.length > 0) {
            // Delete existing categories
            await connection.query(
              "DELETE FROM product_categories WHERE product_id = ?",
              [productId]
            );

            // Insert new categories
            for (let i = 0; i < productData.category_ids.length; i++) {
              const categoryId = productData.category_ids[i];
              const isPrimary = i === 0;
              await connection.query(
                `INSERT INTO product_categories (id, product_id, category_id, is_primary)
                 VALUES (?, ?, ?, ?)`,
                [uuidv4(), productId, categoryId, isPrimary]
              );
            }
          }

          results.push({
            sku: productData.sku,
            status: "success",
            action: "updated",
          });
        } else {
          // Create new product with all fields
          const productId = uuidv4();
          
          // Generate product_url if not provided
          const productUrl = productData.product_url || `http://fashion-ec/${productData.sku}`;

          await connection.query(
            `INSERT INTO products (
              id, sku, name, description, price, compare_price, cost_price,
              stock_quantity, status, brand_id, main_image_url, product_url, 
              weight, dimensions, seo_title, seo_description, is_featured
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              productId,
              productData.sku,
              productData.name || productData.sku,
              productData.description || null,
              productData.price || 0,
              productData.compare_price || null,
              productData.cost_price || null,
              productData.stock_quantity || 0,
              productData.status || "draft",
              productData.brand_id || null,
              productData.main_image_url || null,
              productUrl,
              productData.weight || null,
              productData.dimensions || null,
              productData.seo_title || null,
              productData.seo_description || null,
              productData.is_featured || false,
            ]
          );

          // Insert categories if provided
          if (productData.category_ids && productData.category_ids.length > 0) {
            for (let i = 0; i < productData.category_ids.length; i++) {
              const categoryId = productData.category_ids[i];
              const isPrimary = i === 0;
              await connection.query(
                `INSERT INTO product_categories (id, product_id, category_id, is_primary)
                 VALUES (?, ?, ?, ?)`,
                [uuidv4(), productId, categoryId, isPrimary]
              );
            }
          }

          results.push({
            sku: productData.sku,
            status: "success",
            action: "created",
          });
        }
      } catch (error) {
        results.push({
          sku: productData.sku || "N/A",
          status: "error",
          error: error.message,
        });
        // Continue processing other products even if one fails
      }
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Decrease stock quantity for products (used when order is confirmed)
// If connection is provided, use it (for batch operations), otherwise create new connection
async function decreaseStock(productId, quantity, providedConnection = null) {
  const connection = providedConnection || await pool.getConnection();
  const shouldRelease = !providedConnection;
  const shouldCommit = !providedConnection;

  try {
    if (shouldCommit) {
      await connection.beginTransaction();
    }

    // Get current stock with row lock to prevent race conditions
    const [current] = await connection.query(
      "SELECT id, name, sku, stock_quantity, status FROM products WHERE id = ? FOR UPDATE",
      [productId]
    );

    if (current.length === 0) {
      throw new Error(`Product not found: ${productId}`);
    }

    const product = current[0];
    const currentStock = product.stock_quantity;
    
    // Check if stock is sufficient (allow negative for unlimited stock items, but log warning)
    if (currentStock < quantity && currentStock >= 0) {
      console.warn(
        `Insufficient stock for product ${product.sku} (${product.name}): ` +
        `Requested: ${quantity}, Available: ${currentStock}`
      );
      // In production, you might want to throw an error here
      // For now, we allow it but log a warning
    }

    const newStock = Math.max(0, currentStock - quantity);

    // Update stock
    await connection.query(
      "UPDATE products SET stock_quantity = ? WHERE id = ?",
      [newStock, productId]
    );

    // Auto-update status if stock becomes 0
    if (newStock === 0 && product.status !== "out_of_stock") {
      await connection.query(
        "UPDATE products SET status = 'out_of_stock' WHERE id = ?",
        [productId]
      );
      console.log(`Product ${product.sku} (${product.name}) is now out of stock`);
    } else if (product.status === "out_of_stock" && newStock > 0) {
      // If stock was 0 and now has stock, set back to active
      await connection.query(
        "UPDATE products SET status = 'active' WHERE id = ?",
        [productId]
      );
      console.log(`Product ${product.sku} (${product.name}) is back in stock (${newStock} units)`);
    }

    if (shouldCommit) {
      await connection.commit();
    }
    
    return { 
      productId, 
      productName: product.name,
      productSku: product.sku,
      oldStock: currentStock, 
      newStock,
      quantityDecreased: quantity,
      wasInsufficient: currentStock < quantity
    };
  } catch (error) {
    if (shouldCommit) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (shouldRelease) {
      connection.release();
    }
  }
}

// Decrease stock for multiple products (batch operation)
async function decreaseStockBatch(items, providedConnection = null) {
  const connection = providedConnection || await pool.getConnection();
  const shouldRelease = !providedConnection;
  const shouldCommit = !providedConnection;

  try {
    if (shouldCommit) {
      await connection.beginTransaction();
    }

    const results = [];
    const warnings = [];
    
    for (const item of items) {
      try {
        const result = await decreaseStock(item.product_id, item.quantity, connection);
        results.push(result);
        
        if (result.wasInsufficient) {
          warnings.push({
            productId: item.product_id,
            productName: result.productName,
            productSku: result.productSku,
            requested: item.quantity,
            available: result.oldStock
          });
        }
      } catch (itemError) {
        console.error(`Error decreasing stock for product ${item.product_id}:`, itemError);
        // Continue with other items even if one fails
        results.push({
          productId: item.product_id,
          error: itemError.message
        });
      }
    }

    if (warnings.length > 0) {
      console.warn(`Stock decrease completed with ${warnings.length} insufficient stock warnings:`, warnings);
    }

    if (shouldCommit) {
      await connection.commit();
    }
    
    return {
      results,
      warnings,
      successCount: results.filter(r => !r.error).length,
      errorCount: results.filter(r => r.error).length
    };
  } catch (error) {
    if (shouldCommit) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (shouldRelease) {
      connection.release();
    }
  }
}

module.exports = {
  createProduct,
  updateProduct,
  getProductById,
  getProducts,
  deleteProduct,
  bulkUpdateProducts,
  generateSKU,
  decreaseStock,
  decreaseStockBatch,
};


A product detail page must be created.
First, apply the cursor-pointer style to the product. When selected, it should navigate to the product detail page.
The uploaded images are reference designs for the product detail page.
Use the project's color scheme for the colors.
Arrange the images in sequence as a landing page format. Design it to match Japanese aesthetics, befitting a Japanese e-commerce site.


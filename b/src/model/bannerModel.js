const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

// Get all banners with optional filters
async function getBanners(filters = {}) {
  let whereClause = "WHERE 1=1";
  const params = [];

  if (filters.status) {
    whereClause += " AND status = ?";
    params.push(filters.status);
  }

  let query = `
    SELECT *
    FROM banners
    ${whereClause}
    ORDER BY createdAt ASC
  `;

  if (filters.limit) {
    query += " LIMIT ?";
    params.push(parseInt(filters.limit));
    if (filters.offset) {
      query += " OFFSET ?";
      params.push(parseInt(filters.offset));
    }
  }

  const [banners] = await pool.query(query, params);
  return banners;
}

// Get banner by ID
async function getBannerById(id) {
  const [banners] = await pool.query(`SELECT * FROM banners WHERE id = ?`, [
    id,
  ]);
  return banners[0] || null;
}

// Create banner
async function createBanner(bannerData) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO banners (
      id, title, title_color, title_font_size, title_position, title_vertical_position, description, description_color, description_font_size, description_position, description_vertical_position, image_url, page_url, display_text, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      bannerData.title,
      bannerData.title_color || "#000000",
      bannerData.title_font_size || "text-4xl",
      bannerData.title_position || "left",
      bannerData.title_vertical_position || "middle",
      bannerData.description || null,
      bannerData.description_color || "#000000",
      bannerData.description_font_size || "text-lg",
      bannerData.description_position || "left",
      bannerData.description_vertical_position || "middle",
      bannerData.image_url,
      bannerData.page_url || null,
      bannerData.display_text !== undefined ? bannerData.display_text : null,
      bannerData.status || "active",
    ]
  );
  return getBannerById(id);
}

// Create multiple banners
async function createBanners(bannersData) {
  const results = [];
  for (const bannerData of bannersData) {
    const banner = await createBanner(bannerData);
    results.push(banner);
  }
  return results;
}

// Update banner
async function updateBanner(id, bannerData) {
  const updateFields = [];
  const updateValues = [];

  const fields = [
    "title",
    "title_color",
    "title_font_size",
    "title_position",
    "title_vertical_position",
    "description",
    "description_color",
    "description_font_size",
    "description_position",
    "description_vertical_position",
    "image_url",
    "page_url",
    "display_text",
    "status",
  ];

  fields.forEach((field) => {
    if (bannerData[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      updateValues.push(bannerData[field]);
    }
  });

  if (updateFields.length > 0) {
    updateValues.push(id);
    await pool.query(
      `UPDATE banners SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );
  }

  return getBannerById(id);
}

// Delete banner
async function deleteBanner(id) {
  await pool.query("DELETE FROM banners WHERE id = ?", [id]);
  return { id };
}

// Get active banners
async function getActiveBanners() {
  const [banners] = await pool.query(
    `SELECT * FROM banners
     WHERE status = 'active'
     ORDER BY createdAt ASC`
  );
  return banners;
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

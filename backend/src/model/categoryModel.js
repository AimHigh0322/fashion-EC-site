const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

// Create category
async function createCategory(categoryData) {
  const categoryId = uuidv4();
  let level = 1;

  // Calculate level if parent_id is provided
  if (categoryData.parent_id) {
    const [parent] = await pool.query(
      "SELECT level FROM categories WHERE id = ?",
      [categoryData.parent_id]
    );
    if (parent.length > 0) {
      level = parent[0].level + 1;
      if (level > 5) {
        throw new Error("Maximum category level (5) exceeded");
      }
    }
  }

  // Generate slug
  const slug = categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, "-");

  await pool.query(
    `INSERT INTO categories (id, name, slug, parent_id, level, description, image_url, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      categoryId,
      categoryData.name,
      slug,
      categoryData.parent_id || null,
      level,
      categoryData.description || null,
      categoryData.image_url || null,
      categoryData.sort_order || 0,
      categoryData.is_active !== undefined ? categoryData.is_active : true,
    ]
  );

  return { id: categoryId, slug, level };
}

// Get category tree
async function getCategoryTree(parentId = null) {
  const query = parentId
    ? "SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order, name"
    : "SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order, name";

  const [categories] = await pool.query(query, parentId ? [parentId] : []);

  // Recursively get children
  for (const category of categories) {
    category.children = await getCategoryTree(category.id);
  }

  return categories;
}

// Get all categories (flat)
async function getAllCategories() {
  const [categories] = await pool.query(
    "SELECT * FROM categories ORDER BY level, sort_order, name"
  );
  return categories;
}

// Get category by ID
async function getCategoryById(categoryId) {
  const [categories] = await pool.query(
    "SELECT * FROM categories WHERE id = ?",
    [categoryId]
  );
  return categories.length > 0 ? categories[0] : null;
}

// Update category
async function updateCategory(categoryId, categoryData) {
  const updateFields = [];
  const updateValues = [];

  if (categoryData.name !== undefined) {
    updateFields.push("name = ?");
    updateValues.push(categoryData.name);
  }
  if (categoryData.slug !== undefined) {
    updateFields.push("slug = ?");
    updateValues.push(categoryData.slug);
  }
  if (categoryData.description !== undefined) {
    updateFields.push("description = ?");
    updateValues.push(categoryData.description);
  }
  if (categoryData.image_url !== undefined) {
    updateFields.push("image_url = ?");
    updateValues.push(categoryData.image_url);
  }
  if (categoryData.sort_order !== undefined) {
    updateFields.push("sort_order = ?");
    updateValues.push(categoryData.sort_order);
  }
  if (categoryData.is_active !== undefined) {
    updateFields.push("is_active = ?");
    updateValues.push(categoryData.is_active);
  }

  if (updateFields.length > 0) {
    updateValues.push(categoryId);
    await pool.query(
      `UPDATE categories SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );
  }

  return { id: categoryId };
}

// Delete category
async function deleteCategory(categoryId) {
  // Check if category has children
  const [children] = await pool.query(
    "SELECT id FROM categories WHERE parent_id = ?",
    [categoryId]
  );

  if (children.length > 0) {
    throw new Error("Cannot delete category with child categories");
  }

  await pool.query("DELETE FROM categories WHERE id = ?", [categoryId]);
  return { id: categoryId };
}

module.exports = {
  createCategory,
  getCategoryTree,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};


const pool = require("../db/db");

// Get attribute definitions by category IDs
async function getAttributeDefinitionsByCategories(categoryIds) {
  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }

  const placeholders = categoryIds.map(() => "?").join(",");
  const [attributes] = await pool.query(
    `SELECT * FROM attribute_definitions 
     WHERE category_id IN (${placeholders})
     ORDER BY sort_order, name`,
    categoryIds
  );

  return attributes;
}

// Get all attribute definitions
async function getAllAttributeDefinitions() {
  const [attributes] = await pool.query(
    "SELECT * FROM attribute_definitions ORDER BY sort_order, name"
  );
  return attributes;
}

// Create attribute definition
async function createAttributeDefinition(attributeData) {
  const { v4: uuidv4 } = require("uuid");
  const attributeId = uuidv4();

  await pool.query(
    `INSERT INTO attribute_definitions (id, category_id, name, type, is_required, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      attributeId,
      attributeData.category_id || null,
      attributeData.name,
      attributeData.type || "text",
      attributeData.is_required || false,
      attributeData.sort_order || 0,
    ]
  );

  return { id: attributeId };
}

module.exports = {
  getAttributeDefinitionsByCategories,
  getAllAttributeDefinitions,
  createAttributeDefinition,
};

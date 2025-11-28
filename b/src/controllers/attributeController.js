const attributeModel = require("../model/attributeModel");

async function getAttributeDefinitionsByCategories(req, res) {
  try {
    const categoryIds = req.query.category_ids
      ? req.query.category_ids.split(",")
      : [];
    const attributes = await attributeModel.getAttributeDefinitionsByCategories(
      categoryIds
    );
    res.json({ success: true, data: attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAllAttributeDefinitions(req, res) {
  try {
    const attributes = await attributeModel.getAllAttributeDefinitions();
    res.json({ success: true, data: attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createAttributeDefinition(req, res) {
  try {
    const result = await attributeModel.createAttributeDefinition(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAttributeDefinitionsByCategories,
  getAllAttributeDefinitions,
  createAttributeDefinition,
};

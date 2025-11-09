const categoryModel = require("../model/categoryModel");
const { logAudit } = require("../middleware/auditLogger");

async function createCategory(req, res) {
  try {
    const result = await categoryModel.createCategory(req.body);
    await logAudit(req, "create", "category", result.id, null, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getCategoryTree(req, res) {
  try {
    const tree = await categoryModel.getCategoryTree();
    res.json({ success: true, data: tree });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAllCategories(req, res) {
  try {
    const categories = await categoryModel.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getCategoryById(req, res) {
  try {
    const category = await categoryModel.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateCategory(req, res) {
  try {
    const oldCategory = await categoryModel.getCategoryById(req.params.id);
    const result = await categoryModel.updateCategory(req.params.id, req.body);
    await logAudit(req, "update", "category", req.params.id, oldCategory, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteCategory(req, res) {
  try {
    const oldCategory = await categoryModel.getCategoryById(req.params.id);
    await categoryModel.deleteCategory(req.params.id);
    await logAudit(req, "delete", "category", req.params.id, oldCategory, null);
    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createCategory,
  getCategoryTree,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};


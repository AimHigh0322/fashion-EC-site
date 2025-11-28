const shippingAddressModel = require("../model/shippingAddressModel");

async function getShippingAddresses(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: "認証が必要です" 
      });
    }
    const userId = req.user.id;
    const addresses = await shippingAddressModel.getShippingAddresses(userId);
    res.json({ success: true, data: addresses });
  } catch (error) {
    console.error("Error getting shipping addresses:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "配送先の取得に失敗しました" 
    });
  }
}

async function getShippingAddressById(req, res) {
  try {
    const userId = req.user.id;
    const address = await shippingAddressModel.getShippingAddressById(
      req.params.id,
      userId
    );
    if (!address) {
      return res.status(404).json({ success: false, message: "配送先が見つかりません" });
    }
    res.json({ success: true, data: address });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createShippingAddress(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: "認証が必要です" 
      });
    }
    const userId = req.user.id;
    
    // Log the incoming data for debugging
    console.log("Creating shipping address for user:", userId);
    console.log("Address data:", JSON.stringify(req.body, null, 2));
    
    const result = await shippingAddressModel.createShippingAddress(userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error creating shipping address:", error);
    console.error("Error stack:", error.stack);
    
    // Return appropriate status code based on error type
    const statusCode = error.message.includes("必須") ? 400 : 500;
    
    res.status(statusCode).json({ 
      success: false, 
      message: error.message || "配送先の作成に失敗しました",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}

async function updateShippingAddress(req, res) {
  try {
    const userId = req.user.id;
    const result = await shippingAddressModel.updateShippingAddress(
      req.params.id,
      userId,
      req.body
    );
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === "Shipping address not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteShippingAddress(req, res) {
  try {
    const userId = req.user.id;
    const result = await shippingAddressModel.deleteShippingAddress(
      req.params.id,
      userId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === "Shipping address not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

async function setDefaultAddress(req, res) {
  try {
    const userId = req.user.id;
    const result = await shippingAddressModel.setDefaultAddress(
      req.params.id,
      userId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === "Shipping address not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

async function calculateShipping(req, res) {
  try {
    const { prefecture, cart_total } = req.body;
    if (!prefecture || cart_total === undefined) {
      return res.status(400).json({
        success: false,
        message: "都道府県とカート合計が必要です",
      });
    }
    const shippingCost = shippingAddressModel.calculateShippingCost(
      prefecture,
      parseFloat(cart_total)
    );
    res.json({ success: true, data: { shipping_cost: shippingCost } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getShippingAddresses,
  getShippingAddressById,
  createShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  setDefaultAddress,
  calculateShipping,
};


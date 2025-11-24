const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const orderModel = require("../model/orderModel");
const shippingAddressModel = require("../model/shippingAddressModel");
const campaignService = require("../services/campaignService");
const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

// Create Stripe Checkout Session
async function createCheckoutSession(req, res) {
  try {
    const userId = req.user.id;
    const { shipping_address_id } = req.body;

    // Validate shipping address
    const shippingAddress = await shippingAddressModel.getShippingAddressById(
      shipping_address_id,
      userId
    );
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "配送先が見つかりません",
      });
    }

    // Get cart items
    const [cartItems] = await pool.query(
      `SELECT c.*, p.name, p.sku, p.price, p.main_image_url, p.stock_quantity
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ? AND p.status = 'active'`,
      [userId]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "カートが空です",
      });
    }

    // Check stock availability
    for (const item of cartItems) {
      if (item.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${item.name}の在庫が不足しています`,
        });
      }
    }

    // Validate campaigns before checkout
    const campaignValidation = await campaignService.validateCampaignsForCheckout(cartItems, userId);
    if (!campaignValidation.valid) {
      return res.status(400).json({
        success: false,
        message: "キャンペーンの適用に問題があります",
        errors: campaignValidation.errors,
        validationResults: campaignValidation.results,
      });
    }

    // Apply campaigns to cart
    const cartWithDiscounts = await campaignService.applyCampaignsToCart(cartItems, userId);
    
    // Calculate totals with campaign discounts
    const subtotal = cartWithDiscounts.subtotal;
    const totalDiscount = cartWithDiscounts.totalDiscount;
    const freeShipping = cartWithDiscounts.freeShipping;
    
    // Calculate shipping (free if campaign applies)
    const shippingCost = freeShipping 
      ? 0 
      : shippingAddressModel.calculateShippingCost(
          shippingAddress.prefecture,
          subtotal
        );
    const tax = Math.floor((subtotal - totalDiscount) * 0.1); // 10% tax on discounted amount
    const totalAmount = subtotal - totalDiscount + tax + shippingCost;

    // Get base URL for images - ensure it's publicly accessible
    // Stripe requires publicly accessible image URLs
    const baseUrl = process.env.API_URL || process.env.BACKEND_URL || "http://localhost:8888";
    const cleanBaseUrl = baseUrl.replace(/\/api$/, "").replace(/\/$/, "");

    // Create line items for Stripe (use discounted prices)
    const line_items = cartWithDiscounts.items.map((item) => {
      let imageUrl = null;
      if (item.main_image_url) {
        if (item.main_image_url.startsWith("http://") || item.main_image_url.startsWith("https://")) {
          // Already a full URL - use as is
          imageUrl = item.main_image_url;
        } else {
          // Construct full URL from relative path
          // Images are stored as /uploads/products/filename.jpg
          // Server serves them from /uploads route
          let imagePath = item.main_image_url;
          // Ensure path starts with /uploads
          if (!imagePath.startsWith("/uploads")) {
            if (imagePath.startsWith("/")) {
              imagePath = `/uploads${imagePath}`;
            } else {
              imagePath = `/uploads/${imagePath}`;
            }
          }
          // Construct full URL
          imageUrl = `${cleanBaseUrl}${imagePath}`;
        }
      }

      return {
        price_data: {
          currency: "jpy",
          product_data: {
            name: item.name,
            description: `SKU: ${item.sku}`,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(item.discountedPrice || item.price),
        },
        quantity: item.quantity,
      };
    });

    // Add shipping as a line item
    if (shippingCost > 0) {
      line_items.push({
        price_data: {
          currency: "jpy",
          product_data: {
            name: "送料",
            description: `${shippingAddress.prefecture}への配送`,
          },
          unit_amount: Math.round(shippingCost),
        },
        quantity: 1,
      });
    }

    // Add tax as a line item
    line_items.push({
      price_data: {
        currency: "jpy",
        product_data: {
          name: "消費税 (10%)",
        },
        unit_amount: Math.round(tax),
      },
      quantity: 1,
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      locale: "ja", // Set language to Japanese - translates Stripe UI elements
      success_url: `${
        process.env.FRONTEND_URL || "http://localhost:5555"
      }/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5555"}/cart`,
      metadata: {
        user_id: userId,
        user_email: req.user.email,
        shipping_address_id: shipping_address_id,
        subtotal: subtotal.toString(),
        shipping_cost: shippingCost.toString(),
        tax_amount: tax.toString(),
        total_amount: totalAmount.toString(),
      },
      customer_email: req.user.email,
      // Additional settings for better Japanese experience
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: ["JP"], // Japan only
      },
    });

    res.json({
      success: true,
      data: {
        session_id: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    res.status(500).json({
      success: false,
      message: "決済セッションの作成に失敗しました",
      error: error.message,
    });
  }
}

// Verify payment success and create order
async function verifyPaymentAndCreateOrder(req, res) {
  try {
    const { session_id } = req.query;
    const userId = req.user.id;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "セッションIDが必要です",
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "決済が完了していません",
      });
    }

    // Check if order already exists for this session
    const [existingOrders] = await pool.query(
      "SELECT id FROM orders WHERE payment_method = ? AND notes LIKE ?",
      ["stripe", `%${session_id}%`]
    );

    if (existingOrders.length > 0) {
      return res.json({
        success: true,
        data: { order_id: existingOrders[0].id },
        message: "注文は既に作成されています",
      });
    }

    // Create order from session metadata
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get user's cart items
      const [cartItems] = await connection.query(
        `SELECT c.*, p.name, p.sku, p.price, p.main_image_url
         FROM cart c
         JOIN products p ON c.product_id = p.id
         WHERE c.user_id = ?`,
        [userId]
      );

      if (cartItems.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "カートが空です",
        });
      }

      // Get shipping address
      const shippingAddress = await shippingAddressModel.getShippingAddressById(
        session.metadata.shipping_address_id,
        userId
      );

      // Get user information directly from users table
      const [userRows] = await pool.query(
        "SELECT first_name, last_name, phone FROM users WHERE id = ?",
        [userId]
      );
      const user = userRows[0] || {};
      const customerFirstName = user.first_name || "";
      const customerLastName = user.last_name || "";
      const customerFullName =
        `${customerLastName} ${customerFirstName}`.trim() ||
        shippingAddress.name ||
        "お客様";
      const customerPhone = user.phone || shippingAddress.phone || "";

      // Create or get customer
      // First check if customer exists with this user_id
      const [existingCustomersByUserId] = await connection.query(
        "SELECT id FROM customers WHERE user_id = ?",
        [userId]
      );

      // Also check if customer exists with this email (might have user_id = NULL)
      const [existingCustomersByEmail] = await connection.query(
        "SELECT id, user_id FROM customers WHERE email = ?",
        [req.user.email]
      );

      let customerId;
      if (existingCustomersByUserId.length > 0) {
        // Customer already exists with this user_id
        customerId = existingCustomersByUserId[0].id;
        // Update customer info with profile data
        await connection.query(
          `UPDATE customers SET email = ?, first_name = ?, last_name = ?, phone = ? WHERE id = ?`,
          [
            req.user.email,
            customerFirstName,
            customerLastName,
            customerPhone,
            customerId,
          ]
        );
      } else if (existingCustomersByEmail.length > 0) {
        // Customer exists with this email but user_id might be NULL
        customerId = existingCustomersByEmail[0].id;
        // Update customer info including user_id to link it to this user
        await connection.query(
          `UPDATE customers SET user_id = ?, email = ?, first_name = ?, last_name = ?, phone = ? WHERE id = ?`,
          [
            userId,
            req.user.email,
            customerFirstName,
            customerLastName,
            customerPhone,
            customerId,
          ]
        );
      } else {
        // Create new customer with user_id
        customerId = uuidv4();
        await connection.query(
          `INSERT INTO customers (id, user_id, email, first_name, last_name, phone)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            customerId,
            userId,
            req.user.email,
            customerFirstName,
            customerLastName,
            customerPhone,
          ]
        );
      }

      // Create order
      const orderId = uuidv4();
      const orderNumber =
        "ORD-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        Math.random().toString(36).substring(2, 6).toUpperCase();

      await connection.query(
        `INSERT INTO orders (id, order_number, customer_id, user_id, status, total_amount, shipping_cost, tax_amount, payment_status, payment_method, shipping_address, billing_address, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          orderNumber,
          customerId,
          userId,
          "processing",
          parseFloat(session.metadata.total_amount),
          parseFloat(session.metadata.shipping_cost),
          parseFloat(session.metadata.tax_amount),
          "paid",
          "stripe",
          JSON.stringify(shippingAddress),
          JSON.stringify(shippingAddress),
          `Stripe Session ID: ${session_id}, Payment Intent: ${session.payment_intent}`,
        ]
      );

      // Create order items and decrease stock
      for (const item of cartItems) {
        await connection.query(
          `INSERT INTO order_items (id, order_id, product_id, sku, product_name, quantity, price, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            orderId,
            item.product_id,
            item.sku,
            item.name,
            item.quantity,
            item.price,
            item.price * item.quantity,
          ]
        );

        // Decrease stock
        await connection.query(
          "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
          [item.quantity, item.product_id]
        );
      }

      // Clear user's cart
      await connection.query("DELETE FROM cart WHERE user_id = ?", [userId]);

      await connection.commit();

      res.json({
        success: true,
        data: {
          order_id: orderId,
          order_number: orderNumber,
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "決済の確認に失敗しました",
      error: error.message,
    });
  }
}

// Stripe webhook handler
async function handleStripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log webhook event
  const logId = uuidv4();
  await pool.query(
    `INSERT INTO webhook_logs (id, event_id, event_type, stripe_session_id, status, request_body)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      logId,
      event.id,
      event.type,
      event.data.object.id,
      "received",
      JSON.stringify(event.data.object),
    ]
  );

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      console.log("Checkout session completed:", session.id);
      // You can process the order here if needed
      break;
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      console.log("Payment intent succeeded:", paymentIntent.id);
      break;
    case "payment_intent.payment_failed":
      const failedPayment = event.data.object;
      console.log("Payment failed:", failedPayment.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}

// Validate campaigns for checkout
async function validateCampaigns(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    // Get cart items
    const [cartItems] = await pool.query(
      `SELECT c.*, p.name, p.sku, p.price, p.main_image_url, p.stock_quantity
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ? AND p.status = 'active'`,
      [userId]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "カートが空です",
      });
    }

    // Validate campaigns
    const validation = await campaignService.validateCampaignsForCheckout(cartItems, userId);
    
    // Also get discount calculation
    const cartWithDiscounts = await campaignService.applyCampaignsToCart(cartItems, userId);

    res.json({
      success: validation.valid,
      valid: validation.valid,
      errors: validation.errors,
      validationResults: validation.results,
      discounts: {
        subtotal: cartWithDiscounts.subtotal,
        totalDiscount: cartWithDiscounts.totalDiscount,
        freeShipping: cartWithDiscounts.freeShipping,
        appliedCampaigns: cartWithDiscounts.appliedCampaigns,
        finalTotal: cartWithDiscounts.subtotal - cartWithDiscounts.totalDiscount,
      },
    });
  } catch (error) {
    console.error("Validate campaigns error:", error);
    res.status(500).json({
      success: false,
      message: "キャンペーンのバリデーションに失敗しました",
      error: error.message,
    });
  }
}

module.exports = {
  createCheckoutSession,
  verifyPaymentAndCreateOrder,
  handleStripeWebhook,
  validateCampaigns,
};

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const orderModel = require("../model/orderModel");
const shippingAddressModel = require("../model/shippingAddressModel");
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

    // Calculate totals
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shippingCost = shippingAddressModel.calculateShippingCost(
      shippingAddress.prefecture,
      subtotal
    );
    const tax = Math.floor(subtotal * 0.1); // 10% tax
    const totalAmount = subtotal + tax + shippingCost;

    // Get base URL for images - ensure it's publicly accessible
    // Stripe requires publicly accessible image URLs
    const baseUrl = process.env.API_URL || process.env.BACKEND_URL || "http://localhost:8888";
    const cleanBaseUrl = baseUrl.replace(/\/api$/, "").replace(/\/$/, "");

    // Create line items for Stripe
    const line_items = cartItems.map((item) => {
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
          unit_amount: Math.round(item.price),
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
      const [existingCustomers] = await connection.query(
        "SELECT id FROM customers WHERE user_id = ?",
        [userId]
      );

      let customerId;
      if (existingCustomers.length > 0) {
        customerId = existingCustomers[0].id;
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
      } else {
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
        `INSERT INTO orders (id, order_number, customer_id, status, total_amount, shipping_cost, tax_amount, payment_status, payment_method, shipping_address, billing_address, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          orderNumber,
          customerId,
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

// Process refund
async function processRefund(req, res) {
  try {
    const { order_id } = req.params;
    const { amount, reason } = req.body;

    // Get order details
    const order = await orderModel.getOrderById(order_id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "注文が見つかりません",
      });
    }

    // Check if order is paid
    if (order.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "この注文は支払い済みではありません",
      });
    }

    // Extract payment intent ID from notes
    const paymentIntentMatch = order.notes?.match(
      /Payment Intent: (pi_[a-zA-Z0-9]+)/
    );
    if (!paymentIntentMatch) {
      return res.status(400).json({
        success: false,
        message: "決済情報が見つかりません",
      });
    }

    const paymentIntentId = paymentIntentMatch[1];

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(parseFloat(amount)) : undefined, // Partial or full refund
      reason: reason || "requested_by_customer",
    });

    // Update order payment status
    await orderModel.updateOrderPaymentStatus(order_id, "refunded");

    // Restore stock
    for (const item of order.items) {
      await pool.query(
        "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }

    res.json({
      success: true,
      data: {
        refund_id: refund.id,
        amount: refund.amount,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error("Refund processing error:", error);
    res.status(500).json({
      success: false,
      message: "返金処理に失敗しました",
      error: error.message,
    });
  }
}

module.exports = {
  createCheckoutSession,
  verifyPaymentAndCreateOrder,
  handleStripeWebhook,
  processRefund,
};

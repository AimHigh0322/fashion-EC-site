const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cartModel = require("../model/cartModel");
const orderModel = require("../model/orderModel");
const authModel = require("../model/authModel");
const productModel = require("../model/productModel");
const { logAudit } = require("../middleware/auditLogger");
const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

// Create Stripe Checkout Session
async function createCheckoutSession(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    // Get cart items
    const cartItems = await cartModel.getUserCart(userId);

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "カートが空です",
      });
    }

    // Check stock availability before creating checkout session
    const stockIssues = [];
    for (const item of cartItems) {
      if (item.stock_quantity !== null && item.stock_quantity >= 0) {
        // Only check if stock is tracked (not unlimited)
        if (item.quantity > item.stock_quantity) {
          stockIssues.push({
            product_id: item.product_id,
            name: item.name,
            sku: item.sku,
            requested: item.quantity,
            available: item.stock_quantity,
          });
        }
      }
    }

    if (stockIssues.length > 0) {
      return res.status(400).json({
        success: false,
        message: "在庫が不足している商品があります",
        data: {
          stockIssues: stockIssues.map((issue) => ({
            name: issue.name,
            sku: issue.sku,
            requested: issue.requested,
            available: issue.available,
          })),
        },
      });
    }

    // Calculate totals
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = Math.floor(subtotal * 0.1); // 10% tax
    const shipping = subtotal > 5000 ? 0 : 500; // Free shipping over 5000 yen
    const total = subtotal + tax + shipping;

    // Helper function to get full image URL for Stripe
    // Stripe requires publicly accessible HTTPS/HTTP URLs
    const getImageUrl = (imageUrl) => {
      if (!imageUrl || imageUrl.trim() === "") {
        return null;
      }

      // If already a full URL (http/https), return as is
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
      }

      // Get base URL from environment or use default
      const baseUrl =
        process.env.API_BASE_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:8888";

      // Remove trailing slash from baseUrl
      const cleanBaseUrl = baseUrl.replace(/\/$/, "");

      // Normalize image path
      let imagePath = imageUrl.trim();

      // If image URL starts with /uploads, use it directly
      if (imagePath.startsWith("/uploads")) {
        return `${cleanBaseUrl}${imagePath}`;
      }

      // If it's a relative path like "uploads/products/...", prepend /
      if (imagePath.startsWith("uploads/")) {
        return `${cleanBaseUrl}/${imagePath}`;
      }

      // If it starts with /, use it directly
      if (imagePath.startsWith("/")) {
        return `${cleanBaseUrl}${imagePath}`;
      }

      // Otherwise, assume it's a product image filename and prepend /uploads/products/
      return `${cleanBaseUrl}/uploads/products/${imagePath}`;
    };

    // Prepare line items for Stripe with product details
    const lineItems = cartItems.map((item) => {
      const imageUrl = getImageUrl(item.main_image_url);

      // Log image URL for debugging (remove in production if needed)
      if (imageUrl) {
        console.log(
          `Product ${item.sku} (${item.name}) image URL: ${imageUrl}`
        );
      } else {
        console.warn(`Product ${item.sku} (${item.name}) has no image URL`);
      }

      return {
        price_data: {
          currency: "jpy",
          product_data: {
            name: item.name,
            description: `SKU: ${item.sku}`,
            // Stripe requires an array of image URLs (up to 8 images)
            // Only include if imageUrl is valid
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(item.price), // Stripe expects amount in smallest currency unit (yen)
        },
        quantity: item.quantity,
      };
    });

    // Add tax as a separate line item if needed, or include it in product prices
    // For simplicity, we'll add tax and shipping as separate line items
    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: "jpy",
          product_data: {
            name: "消費税 (10%)",
            description: "Tax",
          },
          unit_amount: tax,
        },
        quantity: 1,
      });
    }

    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "jpy",
          product_data: {
            name: "送料",
            description: "Shipping fee",
          },
          unit_amount: shipping,
        },
        quantity: 1,
      });
    }

    // Get user email for Stripe
    const userEmail = req.user?.email;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${
        process.env.FRONTEND_URL || "http://localhost:5555"
      }/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5555"}/cart`,
      customer_email: userEmail,
      metadata: {
        user_id: userId,
        cart_items: JSON.stringify(
          cartItems.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            sku: item.sku,
          }))
        ),
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        shipping: shipping.toString(),
        total: total.toString(),
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error("Create checkout session error:", error);
    res.status(500).json({
      success: false,
      message: "チェックアウトセッションの作成に失敗しました",
      error: error.message,
    });
  }
}

// Log webhook event to database
async function logWebhookEvent(eventData) {
  const connection = await pool.getConnection();
  try {
    const logId = uuidv4();
    const {
      eventId,
      eventType,
      stripeSessionId,
      paymentIntentId,
      userId,
      status = "received",
      requestBody,
      responseStatus,
      responseMessage,
      errorMessage,
      processingTimeMs,
      inventoryDecreased = false,
      orderCreated = false,
      orderId = null,
    } = eventData;

    await connection.query(
      `INSERT INTO webhook_logs (
        id, event_id, event_type, stripe_session_id, payment_intent_id, 
        user_id, order_id, status, request_body, response_status, 
        response_message, error_message, processing_time_ms, 
        inventory_decreased, order_created, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        eventId,
        eventType,
        stripeSessionId,
        paymentIntentId,
        userId,
        orderId,
        status,
        JSON.stringify(requestBody),
        responseStatus,
        responseMessage,
        errorMessage,
        processingTimeMs,
        inventoryDecreased,
        orderCreated,
        status === "completed" || status === "failed" ? new Date() : null,
      ]
    );
    return logId;
  } catch (error) {
    console.error("Error logging webhook event:", error);
    return null;
  } finally {
    connection.release();
  }
}

// Update webhook log status
async function updateWebhookLog(eventId, updateData) {
  const connection = await pool.getConnection();
  try {
    const {
      status,
      orderId,
      inventoryDecreased,
      orderCreated,
      errorMessage,
      processingTimeMs,
    } = updateData;

    const updates = [];
    const values = [];

    if (status) {
      updates.push("status = ?");
      values.push(status);
    }
    if (orderId) {
      updates.push("order_id = ?");
      values.push(orderId);
    }
    if (inventoryDecreased !== undefined) {
      updates.push("inventory_decreased = ?");
      values.push(inventoryDecreased);
    }
    if (orderCreated !== undefined) {
      updates.push("order_created = ?");
      values.push(orderCreated);
    }
    if (errorMessage) {
      updates.push("error_message = ?");
      values.push(errorMessage);
    }
    if (processingTimeMs !== undefined) {
      updates.push("processing_time_ms = ?");
      values.push(processingTimeMs);
    }
    if (status === "completed" || status === "failed") {
      updates.push("processed_at = ?");
      values.push(new Date());
    }

    if (updates.length > 0) {
      values.push(eventId);
      await connection.query(
        `UPDATE webhook_logs SET ${updates.join(", ")} WHERE event_id = ?`,
        values
      );
    }
  } catch (error) {
    console.error("Error updating webhook log:", error);
  } finally {
    connection.release();
  }
}

// Process order creation from webhook (idempotent)
async function processOrderFromWebhook(
  session,
  userId,
  cartItems,
  webhookEventId = null
) {
  const startTime = Date.now();
  // Check if order already exists for this session (idempotency check)
  const connection = await pool.getConnection();
  try {
    const [existingOrders] = await connection.query(
      "SELECT id FROM orders WHERE payment_method = 'stripe' AND JSON_EXTRACT(notes, '$.stripe_session_id') = ?",
      [session.id]
    );

    if (existingOrders.length > 0) {
      console.log(
        `Order already exists for session ${session.id}, skipping...`
      );
      connection.release();

      // Update webhook log
      if (webhookEventId) {
        await updateWebhookLog(webhookEventId, {
          status: "completed",
          orderId: existingOrders[0].id,
          orderCreated: true,
          inventoryDecreased: true, // Assume it was decreased before
          processingTimeMs: Date.now() - startTime,
        });
      }

      return { orderId: existingOrders[0].id, alreadyExists: true };
    }
    connection.release();

    // Get user information
    const user = await authModel.findUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Prepare order items
    const orderItems = cartItems.map((item) => ({
      product_id: item.product_id,
      sku: item.sku,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    // Create order with customer data
    const orderData = {
      customer: {
        email: user.email,
        first_name: user.username || null,
      },
      status: "processing", // Changed from "pending" to "processing" (支払い完了、出荷準備中)
      total_amount: parseFloat(session.metadata.total),
      shipping_cost: parseFloat(session.metadata.shipping),
      tax_amount: parseFloat(session.metadata.tax),
      payment_status: "paid",
      payment_method: "stripe",
      items: orderItems,
      notes: JSON.stringify({
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent || null,
        processed_at: new Date().toISOString(),
      }),
    };

    const order = await orderModel.createOrder(orderData);
    let inventoryDecreased = false;

    // Decrease stock for all ordered products
    // Note: orderModel.createOrder commits its own transaction and releases connection,
    // so we need to use a new connection for stock update
    // If stock update fails, we log it but don't rollback the order (order is already committed)
    // In production, consider implementing a compensation/refund mechanism
    try {
      // Use new connection since orderModel.createOrder already committed and released
      const stockResult = await productModel.decreaseStockBatch(orderItems);
      inventoryDecreased = stockResult.successCount > 0;

      console.log(
        `Stock decreased for order ${order.order_number}: ` +
          `${stockResult.successCount} products updated, ${stockResult.errorCount} errors`
      );

      // Log warnings for insufficient stock
      if (stockResult.warnings && stockResult.warnings.length > 0) {
        console.warn(
          `Order ${order.order_number} has ${stockResult.warnings.length} products with insufficient stock:`,
          stockResult.warnings.map(
            (w) =>
              `${w.productSku} (${w.productName}): requested ${w.requested}, available ${w.available}`
          )
        );
        // In production, you might want to:
        // 1. Send alert to administrators
        // 2. Create a task for manual review
        // 3. Notify the customer
      }

      // Log errors if any
      if (stockResult.errorCount > 0) {
        const errors = stockResult.results.filter((r) => r.error);
        console.error(
          `CRITICAL: Order ${order.order_number} has ${stockResult.errorCount} stock update errors:`,
          errors
        );
      }
    } catch (stockError) {
      console.error(
        `Error decreasing stock for order ${order.order_number}:`,
        stockError
      );
      // Log critical error - in production, you might want to:
      // 1. Send alert to administrators
      // 2. Create a compensation task
      // 3. Mark order for manual review
      console.error(
        `CRITICAL: Order ${order.order_number} created but stock update failed completely!`
      );
      // Don't throw - order is already committed, we just log the error
    }

    // Clear cart
    await cartModel.clearCart(userId);

    // Log audit
    try {
      await logAudit(
        { user: { id: userId } },
        "create",
        "order",
        order.id,
        null,
        { ...orderData, stripe_session_id: session.id }
      );
    } catch (auditError) {
      console.warn("Audit log error (non-critical):", auditError);
    }

    const processingTime = Date.now() - startTime;
    console.log(
      `Order created successfully: ${order.order_number} (Session: ${session.id})`
    );

    // Update webhook log
    if (webhookEventId) {
      await updateWebhookLog(webhookEventId, {
        status: "completed",
        orderId: order.id,
        orderCreated: true,
        inventoryDecreased: inventoryDecreased,
        processingTimeMs: processingTime,
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      alreadyExists: false,
      inventoryDecreased: inventoryDecreased,
    };
  } catch (error) {
    console.error(`Error in processOrderFromWebhook:`, error);

    // Update webhook log with error
    if (webhookEventId) {
      await updateWebhookLog(webhookEventId, {
        status: "failed",
        errorMessage: error.message,
        processingTimeMs: Date.now() - startTime,
      });
    }

    throw error;
  }
}

// Handle Stripe webhook
async function handleWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Log webhook receipt (for debugging)
  console.log("=== WEBHOOK RECEIVED ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Signature present: ${!!sig}`);
  console.log(`Webhook secret configured: ${!!webhookSecret}`);

  if (!webhookSecret) {
    console.error(
      "ERROR: STRIPE_WEBHOOK_SECRET is not set in environment variables!"
    );
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log(`✓ Webhook signature verified successfully`);
  } catch (err) {
    console.error("✗ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received webhook event: ${event.type} (ID: ${event.id})`);

  // Log webhook event to database
  const webhookLogId = await logWebhookEvent({
    eventId: event.id,
    eventType: event.type,
    stripeSessionId: event.data.object?.id,
    paymentIntentId: event.data.object?.payment_intent,
    userId: event.data.object?.metadata?.user_id,
    status: "processing",
    requestBody: {
      type: event.type,
      id: event.id,
      object: event.data.object,
    },
  });

  // Handle checkout.session.completed event (most common)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Only process if payment is successful
    if (session.payment_status !== "paid") {
      console.log(
        `Session ${session.id} payment status is ${session.payment_status}, skipping...`
      );
      await updateWebhookLog(webhookLogId, {
        status: "completed",
        responseMessage: `Payment status is ${session.payment_status}, skipped`,
      });
      return res.json({ received: true });
    }

    try {
      const userId = session.metadata?.user_id;
      if (!userId) {
        console.error(`No user_id in session metadata: ${session.id}`);
        await updateWebhookLog(webhookLogId, {
          status: "failed",
          errorMessage: "No user_id in session metadata",
        });
        return res.json({ received: true });
      }

      const cartItems = JSON.parse(session.metadata.cart_items || "[]");
      if (!cartItems || cartItems.length === 0) {
        console.error(`No cart items in session metadata: ${session.id}`);
        await updateWebhookLog(webhookLogId, {
          status: "failed",
          errorMessage: "No cart items in session metadata",
        });
        return res.json({ received: true });
      }

      console.log(
        `Processing order for user ${userId}, ${cartItems.length} items`
      );
      const result = await processOrderFromWebhook(
        session,
        userId,
        cartItems,
        webhookLogId
      );

      if (result.alreadyExists) {
        console.log(`Order already exists, skipping inventory update`);
      } else {
        console.log(`✓ Order created: ${result.orderNumber}`);
        console.log(`✓ Inventory decreased: ${result.inventoryDecreased}`);
      }

      await updateWebhookLog(webhookLogId, {
        responseStatus: 200,
        responseMessage: "Webhook processed successfully",
      });
    } catch (error) {
      console.error(
        `✗ Error processing checkout.session.completed for session ${session.id}:`,
        error
      );
      console.error(`Error stack:`, error.stack);

      await updateWebhookLog(webhookLogId, {
        status: "failed",
        errorMessage: error.message,
        responseStatus: 500,
        responseMessage: "Failed to process webhook",
      });

      // Return 500 to trigger Stripe retry mechanism
      return res.status(500).json({ error: "Failed to process webhook" });
    }
  }
  // Handle payment_intent.succeeded event (alternative/backup)
  else if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    try {
      // Try to get session from payment intent
      if (paymentIntent.metadata?.session_id) {
        const session = await stripe.checkout.sessions.retrieve(
          paymentIntent.metadata.session_id
        );

        if (session.payment_status === "paid") {
          const userId = session.metadata?.user_id;
          if (userId) {
            const cartItems = JSON.parse(session.metadata.cart_items || "[]");
            if (cartItems && cartItems.length > 0) {
              await processOrderFromWebhook(session, userId, cartItems);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing payment_intent.succeeded:`, error);
      // Don't return error for payment_intent events as checkout.session.completed is primary
    }
  }

  // Always return success to acknowledge receipt
  res.json({ received: true });
}

// Get webhook logs
async function getWebhookLogs(req, res) {
  try {
    const {
      limit = 50,
      offset = 0,
      event_type,
      status,
      session_id,
    } = req.query;

    let query = "SELECT * FROM webhook_logs WHERE 1=1";
    const params = [];

    if (event_type) {
      query += " AND event_type = ?";
      params.push(event_type);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (session_id) {
      query += " AND stripe_session_id = ?";
      params.push(session_id);
    }

    query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.query(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM webhook_logs WHERE 1=1";
    const countParams = [];
    if (event_type) {
      countQuery += " AND event_type = ?";
      countParams.push(event_type);
    }
    if (status) {
      countQuery += " AND status = ?";
      countParams.push(status);
    }
    if (session_id) {
      countQuery += " AND stripe_session_id = ?";
      countParams.push(session_id);
    }
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        logs: logs.map((log) => ({
          ...log,
          request_body: log.request_body ? JSON.parse(log.request_body) : null,
        })),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error getting webhook logs:", error);
    res.status(500).json({
      success: false,
      message: "Webhookログの取得に失敗しました",
      error: error.message,
    });
  }
}

// Get webhook log by ID
async function getWebhookLogById(req, res) {
  try {
    const { id } = req.params;
    const [logs] = await pool.query("SELECT * FROM webhook_logs WHERE id = ?", [
      id,
    ]);

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Webhookログが見つかりません",
      });
    }

    const log = logs[0];
    log.request_body = log.request_body ? JSON.parse(log.request_body) : null;

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error("Error getting webhook log:", error);
    res.status(500).json({
      success: false,
      message: "Webhookログの取得に失敗しました",
      error: error.message,
    });
  }
}

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getWebhookLogs,
  getWebhookLogById,
};

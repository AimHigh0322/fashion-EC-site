require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./router/auth/auth");
const { configureSocketIo } = require("./socket/socket");
const campaignModel = require("./model/campaignModel");
const pool = require("./db/db");
// Initialize database connection
require("./db/db");

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : [
          "http://localhost:5555",
          "http://localhost:3000",
          "http://127.0.0.1:5555",
        ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (process.env.CORS_ORIGIN === "*" || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Authorization"],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.get("/api/test", (request, response) => {
  try {
    return response.json({ status: "ok", time: Date.now() });
  } catch (error) {
    console.error("Test endpoint error:", error);
    return response
      .status(500)
      .json({ error: "サーバーエラーが発生しました。" });
  }
});

// Auth routes
app.use("/api/auth", authRoutes);

// Product routes
const productRoutes = require("./router/products/products");
app.use("/api/products", productRoutes);

// Category routes
const categoryRoutes = require("./router/categories/categories");
app.use("/api/categories", categoryRoutes);

// Order routes
const orderRoutes = require("./router/orders/orders");
app.use("/api/orders", orderRoutes);

// Campaign routes
const campaignRoutes = require("./router/campaigns/campaigns");
app.use("/api/campaigns", campaignRoutes);

// Admin dashboard routes
const dashboardRoutes = require("./router/admin/dashboard");
app.use("/api/admin/dashboard", dashboardRoutes);

// Sales analytics routes
const salesRoutes = require("./router/sales/sales");
app.use("/api/sales", salesRoutes);

// Image routes
const imageController = require("./controllers/imageController");
const {
  authenticateRequest,
} = require("./middleware/auth-middleware/middleware");
app.post(
  "/api/images/upload",
  authenticateRequest,
  imageController.uploadImage
);
app.get("/api/images", authenticateRequest, imageController.getImages);

// Attribute routes
const attributeRoutes = require("./router/attributes/attributes");
app.use("/api/attributes", attributeRoutes);

// Banner routes
const bannerRoutes = require("./router/banners/banners");
app.use("/api/banners", bannerRoutes);

// Favorites routes
const favoriteRoutes = require("./router/favorites/favorites");
app.use("/api/favorites", favoriteRoutes);

// Cart routes
const cartRoutes = require("./router/cart/cart");
app.use("/api/cart", cartRoutes);

// User management routes
const userRoutes = require("./router/users/users");
app.use("/api/users", userRoutes);

// Shipping address routes
const shippingAddressRoutes = require("./router/shipping-addresses/shipping-addresses");
app.use("/api/shipping-addresses", shippingAddressRoutes);

// Checkout routes
const checkoutRoutes = require("./router/checkout/checkout");
app.use("/api/checkout", checkoutRoutes);

// Stock management routes
const stockRoutes = require("./router/stock/stock");
app.use("/api/stock", stockRoutes);

// Reviews routes
const reviewRoutes = require("./router/reviews/reviews");
app.use("/api/reviews", reviewRoutes);

// Profile routes
const profileRoutes = require("./router/profile/profile");
app.use("/api/profile", profileRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "エンドポイントが見つかりません。" });
});

// Error handling middleware (must be after routes)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "サーバーエラーが発生しました。しばらくしてから再度お試しください。",
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : [
          "http://localhost:5555",
          "http://localhost:3000",
          "http://127.0.0.1:5555",
        ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

configureSocketIo(io);

// Campaign auto-activation/deactivation cron job
async function runCampaignCronJob() {
  try {
    const now = new Date();
    
    // Activate campaigns that should be active (start_date <= now < end_date and status = 'inactive')
    await pool.query(
      `UPDATE campaigns 
       SET status = 'active', is_active = TRUE 
       WHERE status = 'inactive' 
       AND start_date <= ? 
       AND end_date > ? 
       AND is_active = FALSE`,
      [now, now]
    );
    
    // Deactivate expired campaigns (end_date < now and status = 'active')
    await pool.query(
      `UPDATE campaigns 
       SET status = 'inactive', is_active = FALSE 
       WHERE status = 'active' 
       AND end_date < ?`,
      [now]
    );
    
    // Also run the existing deactivateExpiredCampaigns function
    await campaignModel.deactivateExpiredCampaigns();
    
    console.log("✅ Campaign cron job executed successfully");
  } catch (error) {
    console.error("❌ Campaign cron job error:", error.message);
  }
}

// Run campaign cron job every hour (3600000 ms)
setInterval(runCampaignCronJob, 60 * 60 * 1000);

// Run immediately on startup
runCampaignCronJob();

const port = Number(process.env.PORT || 8888);

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log("✅ Campaign cron job initialized (runs every hour)");
});

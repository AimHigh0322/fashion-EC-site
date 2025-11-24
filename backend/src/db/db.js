// Database connection file
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fashion_ec",
};

// Function to check and create database if it doesn't exist
async function ensureDatabaseExists() {
  try {
    // Connect to MySQL server without specifying database
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    // Check if database exists
    const [databases] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbConfig.database]
    );

    if (databases.length === 0) {
      // Database doesn't exist, create it
      await connection.query(
        `CREATE DATABASE \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ Database '${dbConfig.database}' created successfully`);
    } else {
      console.log(`✅ Database '${dbConfig.database}' already exists`);
    }

    await connection.end();
    return true;
  } catch (error) {
    console.error("❌ Error checking/creating database:", error.message);
    return false;
  }
}

// Create MySQL connection pool
let pool;

// Initialize database and connection pool
async function initializeConnection() {
  // First, ensure database exists
  const dbExists = await ensureDatabaseExists();
  if (!dbExists) {
    console.error("❌ Failed to ensure database exists. Exiting...");
    process.exit(1);
  }

  // Create connection pool with database
  pool = mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  // Test connection
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL database connected successfully");
    connection.release();
    initializeDatabase();
  } catch (error) {
    console.error("❌ MySQL database connection error:", error.message);
    console.error(
      "Please ensure MySQL is running and credentials are correct in .env file"
    );
    process.exit(1);
  }
}

// Start initialization (don't await, let it run in background)
initializeConnection().catch((error) => {
  console.error("❌ Fatal error during database initialization:", error);
  process.exit(1);
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(50),
        postal_code VARCHAR(10),
        prefecture VARCHAR(50),
        city VARCHAR(100),
        street_address VARCHAR(255),
        apartment VARCHAR(255),
        birth_date DATE,
        avatar_url VARCHAR(500),
        bio TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Users table initialized");

    // Add missing columns if they don't exist (for existing tables)
    const columnsToAdd = [
      { name: "first_name", type: "VARCHAR(100)" },
      { name: "last_name", type: "VARCHAR(100)" },
      { name: "phone", type: "VARCHAR(50)" },
      { name: "postal_code", type: "VARCHAR(10)" },
      { name: "prefecture", type: "VARCHAR(50)" },
      { name: "city", type: "VARCHAR(100)" },
      { name: "street_address", type: "VARCHAR(255)" },
      { name: "apartment", type: "VARCHAR(255)" },
    ];

    for (const column of columnsToAdd) {
      try {
        const [columns] = await pool.query(
          `
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'users' 
          AND COLUMN_NAME = ?
        `,
          [dbConfig.database, column.name]
        );

        if (columns.length === 0) {
          await pool.query(`
            ALTER TABLE users 
            ADD COLUMN ${column.name} ${column.type}
          `);
          console.log(`✅ Added ${column.name} column to users table`);
        }
      } catch (error) {
        console.log(`Note: ${column.name} column check:`, error.message);
      }
    }

    // Categories table (supports 5-level hierarchy)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        parent_id VARCHAR(255) NULL,
        level INT DEFAULT 1,
        description TEXT,
        image_url VARCHAR(500),
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_parent (parent_id),
        INDEX idx_slug (slug),
        INDEX idx_level (level),
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Categories table initialized");

    // Brands master data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        logo_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Brands table initialized");

    // Products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        sku VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        compare_price DECIMAL(10, 2),
        cost_price DECIMAL(10, 2),
        stock_quantity INT DEFAULT 0,
        low_stock_threshold INT DEFAULT 5,
        restock_date DATE NULL,
        restock_quantity INT NULL,
        status ENUM('active', 'inactive', 'out_of_stock', 'draft', 'reservation') DEFAULT 'draft',
        brand_id VARCHAR(255),
        main_image_url VARCHAR(500),
        product_url VARCHAR(500),
        weight DECIMAL(8, 2),
        dimensions VARCHAR(100),
        seo_title VARCHAR(255),
        seo_description TEXT,
        is_featured BOOLEAN DEFAULT FALSE,
        average_rating DECIMAL(3, 2) DEFAULT 0,
        review_count INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sku (sku),
        INDEX idx_status (status),
        INDEX idx_brand (brand_id),
        INDEX idx_created (createdAt),
        INDEX idx_product_url (product_url),
        INDEX idx_stock (stock_quantity),
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Products table initialized");

    // Add product_url column if it doesn't exist (for existing databases)
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'product_url'
      `);
      if (columns.length === 0) {
        await pool.query(`
          ALTER TABLE products 
          ADD COLUMN product_url VARCHAR(500) AFTER main_image_url,
          ADD INDEX idx_product_url (product_url)
        `);
        console.log("✅ Added product_url column to products table");
      }
    } catch (error) {
      if (!error.message.includes("Duplicate column name")) {
        console.warn("Warning adding product_url column:", error.message);
      }
    }

    // Add average_rating and review_count columns if they don't exist (for existing databases)
    try {
      const [ratingColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'average_rating'
      `);
      if (ratingColumns.length === 0) {
        await pool.query(`
          ALTER TABLE products 
          ADD COLUMN average_rating DECIMAL(3, 2) DEFAULT 0 AFTER is_featured,
          ADD COLUMN review_count INT DEFAULT 0 AFTER average_rating
        `);
        console.log("✅ Added average_rating and review_count columns to products table");
      }
    } catch (error) {
      if (!error.message.includes("Duplicate column name")) {
        console.warn("Warning adding average_rating and review_count columns:", error.message);
      }
    }

    // Update status ENUM to include 'reservation' if it doesn't exist
    try {
      const [enumCheck] = await pool.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'status'
      `);
      if (enumCheck.length > 0) {
        const columnType = enumCheck[0].COLUMN_TYPE;
        if (!columnType.includes("reservation")) {
          await pool.query(`
            ALTER TABLE products 
            MODIFY COLUMN status ENUM('active', 'inactive', 'out_of_stock', 'draft', 'reservation') DEFAULT 'draft'
          `);
          console.log(
            "✅ Updated products status ENUM to include 'reservation'"
          );
        }
      }
    } catch (error) {
      if (
        !error.message.includes("Duplicate") &&
        !error.message.includes("doesn't exist")
      ) {
        console.warn("Warning updating status ENUM:", error.message);
      }
    }

    // Product attributes (category-specific attributes)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_attributes (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        attribute_definition_id VARCHAR(255) NOT NULL,
        value TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product (product_id),
        INDEX idx_attribute_def (attribute_definition_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product_attribute (product_id, attribute_definition_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Product attributes table initialized");

    // Product-Category many-to-many relationship
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        category_id VARCHAR(255) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product (product_id),
        INDEX idx_category (category_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product_category (product_id, category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Product categories table initialized");

    // Product images
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        image_name VARCHAR(255),
        alt_text VARCHAR(255),
        sort_order INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product (product_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Add image_name column if it doesn't exist (for existing databases)
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'product_images' 
        AND COLUMN_NAME = 'image_name'
      `);
      if (columns.length === 0) {
        await pool.query(`
          ALTER TABLE product_images 
          ADD COLUMN image_name VARCHAR(255) AFTER image_url
        `);
        console.log("✅ Added image_name column to product_images table");
      }
    } catch (error) {
      // Column might already exist or table doesn't exist yet, ignore error
      if (!error.message.includes("Duplicate column name")) {
        console.warn("Warning adding image_name column:", error.message);
      }
    }
    console.log("✅ Product images table initialized");

    // Customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Customers table initialized");

    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        order_number VARCHAR(255) UNIQUE NOT NULL,
        customer_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NULL,
        status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        shipping_cost DECIMAL(10, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
        payment_method VARCHAR(100),
        shipping_address TEXT,
        billing_address TEXT,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_order_number (order_number),
        INDEX idx_created (createdAt),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Orders table initialized");

    // Order items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        sku VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order (order_id),
        INDEX idx_product (product_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Order items table initialized");

    // Shipping tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipping_tracking (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        tracking_number VARCHAR(255),
        carrier VARCHAR(100),
        carrier_url VARCHAR(500),
        status VARCHAR(100),
        shipped_at TIMESTAMP NULL,
        delivered_at TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order (order_id),
        INDEX idx_tracking (tracking_number),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Shipping tracking table initialized");

    // Campaigns/Events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        label VARCHAR(255),
        type ENUM('discount_percent', 'fixed_price', 'buy_one_get_one') DEFAULT 'discount_percent',
        target_type ENUM('product', 'category', 'all') DEFAULT 'product',
        discount_type ENUM('percent', 'amount', 'freeShipping', 'points') DEFAULT 'percent',
        discount_percent DECIMAL(5, 2),
        discount_value DECIMAL(10, 2),
        fixed_price DECIMAL(10, 2),
        minimum_purchase DECIMAL(10, 2) DEFAULT 0,
        usage_limit INT DEFAULT NULL,
        user_limit INT DEFAULT NULL,
        current_usage INT DEFAULT 0,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        status ENUM('active', 'inactive') DEFAULT 'active',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dates (start_date, end_date),
        INDEX idx_active (is_active),
        INDEX idx_status (status),
        INDEX idx_target_type (target_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Campaigns table initialized");

    // Add new columns if they don't exist (for existing databases)
    const campaignColumnsToAdd = [
      { name: "target_type", type: "ENUM('product', 'category', 'all') DEFAULT 'product'" },
      { name: "discount_type", type: "ENUM('percent', 'amount', 'freeShipping', 'points') DEFAULT 'percent'" },
      { name: "discount_value", type: "DECIMAL(10, 2)" },
      { name: "minimum_purchase", type: "DECIMAL(10, 2) DEFAULT 0" },
      { name: "usage_limit", type: "INT DEFAULT NULL" },
      { name: "user_limit", type: "INT DEFAULT NULL" },
      { name: "current_usage", type: "INT DEFAULT 0" },
      { name: "status", type: "ENUM('active', 'inactive') DEFAULT 'active'" },
      { name: "label", type: "VARCHAR(255)" },
    ];

    for (const column of campaignColumnsToAdd) {
      try {
        const [columns] = await pool.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? 
           AND TABLE_NAME = 'campaigns' 
           AND COLUMN_NAME = ?`,
          [dbConfig.database, column.name]
        );
        if (columns.length === 0) {
          await pool.query(`ALTER TABLE campaigns ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ Added ${column.name} column to campaigns table`);
        }
      } catch (error) {
        if (!error.message.includes("Duplicate column name")) {
          console.warn(`Warning adding ${column.name} column:`, error.message);
        }
      }
    }

    // Product-Campaign many-to-many relationship (kept for backward compatibility)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_campaigns (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        campaign_id VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product (product_id),
        INDEX idx_campaign (campaign_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product_campaign (product_id, campaign_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Product campaigns table initialized");

    // Campaign targets table (for storing target IDs - products/categories)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_targets (
        id VARCHAR(255) PRIMARY KEY,
        campaign_id VARCHAR(255) NOT NULL,
        target_id VARCHAR(255) NOT NULL,
        target_type ENUM('product', 'category') NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_campaign (campaign_id),
        INDEX idx_target (target_id, target_type),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        UNIQUE KEY unique_campaign_target (campaign_id, target_id, target_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Campaign targets table initialized");

    // Campaign usage tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_usage (
        id VARCHAR(255) PRIMARY KEY,
        campaign_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        usage_count INT DEFAULT 1,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_campaign (campaign_id),
        INDEX idx_user (user_id),
        INDEX idx_campaign_user (campaign_id, user_id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_campaign_user (campaign_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Campaign usage table initialized");

    // Banners table (simplified schema)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        title_color VARCHAR(7) DEFAULT '#000000',
        title_font_size VARCHAR(20) DEFAULT 'text-4xl',
        title_position VARCHAR(20) DEFAULT 'left',
        title_vertical_position VARCHAR(20) DEFAULT 'middle',
        description TEXT,
        description_color VARCHAR(7) DEFAULT '#000000',
        description_font_size VARCHAR(20) DEFAULT 'text-lg',
        description_position VARCHAR(20) DEFAULT 'left',
        description_vertical_position VARCHAR(20) DEFAULT 'middle',
        image_url VARCHAR(500) NOT NULL,
        page_url VARCHAR(500),
        display_text VARCHAR(255),
        status ENUM('active', 'inactive') DEFAULT 'active',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrate existing columns if they exist
    try {
      // Check if old columns exist and migrate data
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'banners'
      `);

      const columnNames = columns.map((col) => col.COLUMN_NAME);

      // Migrate name to title if name exists and title doesn't
      if (columnNames.includes("name") && !columnNames.includes("title")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '',
          ADD COLUMN title_color VARCHAR(7) DEFAULT '#000000',
          ADD COLUMN description_color VARCHAR(7) DEFAULT '#000000',
          ADD COLUMN page_url VARCHAR(500),
          ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'
        `);
        await pool.query(`
          UPDATE banners SET title = name WHERE title = '' OR title IS NULL
        `);
        await pool.query(`
          UPDATE banners SET page_url = link_url WHERE page_url IS NULL AND link_url IS NOT NULL
        `);
        await pool.query(`
          UPDATE banners SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END WHERE status IS NULL
        `);
        console.log("✅ Migrated banners table columns");
      }

      // Add missing columns if they don't exist
      if (!columnNames.includes("title_color")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN title_color VARCHAR(7) DEFAULT '#000000'
        `);
      }
      if (!columnNames.includes("display_text")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN display_text VARCHAR(255)
        `);
      }
      if (!columnNames.includes("description_color")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN description_color VARCHAR(7) DEFAULT '#000000'
        `);
      }
      if (!columnNames.includes("page_url")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN page_url VARCHAR(500)
        `);
      }
      if (!columnNames.includes("status")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'
        `);
        // Migrate is_active to status
        await pool.query(`
          UPDATE banners SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END WHERE status IS NULL
        `);
      }
      // Add font size and position columns if they don't exist
      if (!columnNames.includes("title_font_size")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN title_font_size VARCHAR(20) DEFAULT 'text-4xl'
        `);
      }
      if (!columnNames.includes("title_position")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN title_position VARCHAR(20) DEFAULT 'left'
        `);
      }
      if (!columnNames.includes("description_font_size")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN description_font_size VARCHAR(20) DEFAULT 'text-lg'
        `);
      }
      if (!columnNames.includes("description_position")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN description_position VARCHAR(20) DEFAULT 'left'
        `);
      }
      // Add vertical position columns if they don't exist
      if (!columnNames.includes("title_vertical_position")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN title_vertical_position VARCHAR(20) DEFAULT 'middle'
        `);
      }
      if (!columnNames.includes("description_vertical_position")) {
        await pool.query(`
          ALTER TABLE banners 
          ADD COLUMN description_vertical_position VARCHAR(20) DEFAULT 'middle'
        `);
      }
    } catch (error) {
      console.error("Error migrating banners table:", error);
    }

    console.log("✅ Banners table initialized");

    // Images table (for general image management)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255),
        file_path VARCHAR(500) NOT NULL,
        file_size INT,
        mime_type VARCHAR(100),
        width INT,
        height INT,
        uploaded_via ENUM('web', 'ftp') DEFAULT 'web',
        uploaded_by VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_filename (filename),
        INDEX idx_uploaded_by (uploaded_by),
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Images table initialized");

    // Audit logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(255),
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_action (action),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created (createdAt),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Audit logs table initialized");

    // Favorites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_product (product_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_product (user_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Favorites table initialized");

    // Cart table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_product (product_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_product (user_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Cart table initialized");

    // Shipping addresses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipping_addresses (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        prefecture VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        phone VARCHAR(50) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_default (user_id, is_default),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Shipping addresses table initialized");

    // Add missing columns to shipping_addresses table if they don't exist (for existing tables)
    const shippingAddressColumnsToAdd = [
      { name: "name", type: "VARCHAR(255)" },
    ];

    for (const column of shippingAddressColumnsToAdd) {
      try {
        const [columns] = await pool.query(
          `
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'shipping_addresses' 
          AND COLUMN_NAME = ?
        `,
          [dbConfig.database, column.name]
        );

        if (columns.length === 0) {
          if (column.name === "name") {
            // Add name column with default value first, then update existing rows
            await pool.query(
              `ALTER TABLE shipping_addresses ADD COLUMN ${column.name} ${column.type} DEFAULT ''`
            );
            // Update existing rows to have a default name
            await pool.query(
              `UPDATE shipping_addresses SET ${column.name} = CONCAT(prefecture, ' ', city) WHERE ${column.name} = '' OR ${column.name} IS NULL`
            );
            // Now make it NOT NULL
            await pool.query(
              `ALTER TABLE shipping_addresses MODIFY COLUMN ${column.name} ${column.type} NOT NULL`
            );
          } else {
            await pool.query(
              `ALTER TABLE shipping_addresses ADD COLUMN ${column.name} ${column.type}`
            );
          }
          console.log(`✅ Added ${column.name} column to shipping_addresses table`);
        }
      } catch (error) {
        console.log(`Note: ${column.name} column check:`, error.message);
      }
    }

    // User notification settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_notification_settings (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        email_order_updates BOOLEAN DEFAULT TRUE,
        email_promotions BOOLEAN DEFAULT TRUE,
        email_new_products BOOLEAN DEFAULT FALSE,
        email_price_drops BOOLEAN DEFAULT FALSE,
        email_back_in_stock BOOLEAN DEFAULT TRUE,
        email_newsletter BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ User notification settings table initialized");

    // Product reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        order_id VARCHAR(255),
        rating INT NOT NULL,
        title VARCHAR(255),
        comment TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        admin_reply TEXT,
        admin_reply_at TIMESTAMP NULL,
        helpful_count INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product (product_id),
        INDEX idx_user (user_id),
        INDEX idx_order (order_id),
        INDEX idx_status (status),
        INDEX idx_rating (rating),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        UNIQUE KEY unique_user_product (user_id, product_id, order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Product reviews table initialized");

    // Stock history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_history (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        change_type ENUM('order', 'restock', 'adjustment', 'cancel', 'return', 'refund') NOT NULL,
        quantity_change INT NOT NULL,
        quantity_before INT NOT NULL,
        quantity_after INT NOT NULL,
        reference_id VARCHAR(255),
        reference_type VARCHAR(50),
        notes TEXT,
        created_by VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product (product_id),
        INDEX idx_type (change_type),
        INDEX idx_created (createdAt),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Stock history table initialized");

    // Add username column if it doesn't exist (for existing databases)
    try {
      // Check if username column exists
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'username'
      `);

      if (columns.length === 0) {
        // Add username column
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN username VARCHAR(255) UNIQUE AFTER id
        `);
        await pool.query(`
          ALTER TABLE users 
          ADD INDEX idx_username (username)
        `);
        console.log("✅ Username column added to existing table");
      }
    } catch (error) {
      // Column might already exist or other error
      if (
        error.message.includes("Duplicate column name") ||
        error.message.includes("Duplicate key name")
      ) {
        console.log("Note: Username column already exists");
      } else {
        console.log("Note: Username column check completed");
      }
    }

    // Add status column if it doesn't exist (for existing databases)
    try {
      const [statusColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'status'
      `);

      if (statusColumns.length === 0) {
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN status ENUM('active', 'blocked') DEFAULT 'active' AFTER role
        `);
        await pool.query(`
          ALTER TABLE users 
          ADD INDEX idx_status (status)
        `);
        console.log("✅ Status column added to users table");
      }
    } catch (error) {
      if (
        error.message.includes("Duplicate column name") ||
        error.message.includes("Duplicate key name")
      ) {
        console.log("Note: Status column already exists");
      } else {
        console.log("Note: Status column check completed");
      }
    }

    // Add home_address column if it doesn't exist (for existing databases)
    try {
      const [addressColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'home_address'
      `);

      if (addressColumns.length === 0) {
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN home_address TEXT AFTER phone
        `);
        console.log("✅ Home address column added to users table");
      }
    } catch (error) {
      if (
        error.message.includes("Duplicate column name") ||
        error.message.includes("Duplicate key name")
      ) {
        console.log("Note: Home address column already exists");
      } else {
        console.log("Note: Home address column check completed");
      }
    }

    // Check and create admin user if it doesn't exist
    await createAdminUser();

    // Initialize categories with gender -> primary -> subcategory structure
    await initializeCategories();
  } catch (error) {
    console.error("❌ Error initializing database tables:", error.message);
  }
}

// Initialize categories with hierarchical structure
async function initializeCategories() {
  try {
    // Check if categories already exist
    const [existingCategories] = await pool.query(
      "SELECT COUNT(*) as count FROM categories"
    );

    if (existingCategories.length > 0 && existingCategories[0].count > 0) {
      console.log("✅ Categories already exist, skipping initialization");
      return;
    }

    console.log("🔄 Initializing categories...");

    // Define category structure
    const categoryStructure = {
      ladies: {
        name: "レディース",
        slug: "ladies",
        primaryCategories: {
          footwear: {
            name: "シューズ",
            slug: "ladies-footwear",
            subcategories: [
              { name: "パンプス", slug: "ladies-footwear-pumps" },
              { name: "サンダル", slug: "ladies-footwear-sandals" },
              { name: "ブーツ", slug: "ladies-footwear-boots" },
              { name: "スニーカー", slug: "ladies-footwear-sneakers" },
              { name: "バレエシューズ", slug: "ladies-footwear-ballet" },
              {
                name: "ローファー・ドレスシューズ",
                slug: "ladies-footwear-loafers-dress",
              },
              {
                name: "モカシン・カジュアルシューズ",
                slug: "ladies-footwear-moccasin-casual",
              },
              {
                name: "レイン・スノーシューズ",
                slug: "ladies-footwear-rain-snow",
              },
              { name: "コンフォートシューズ", slug: "ladies-footwear-comfort" },
              { name: "シューケア・靴用品", slug: "ladies-footwear-care" },
            ],
          },
          clothing: {
            name: "アパレル",
            slug: "ladies-clothing",
            subcategories: [
              { name: "トップス", slug: "ladies-clothing-tops" },
              { name: "スカート", slug: "ladies-clothing-skirts" },
              { name: "パンツ", slug: "ladies-clothing-pants" },
              { name: "ワンピース", slug: "ladies-clothing-one-piece" },
              { name: "ドレス", slug: "ladies-clothing-dresses" },
              {
                name: "ジャケット・アウター",
                slug: "ladies-clothing-jacket-outer",
              },
              {
                name: "スーツ・フォーマル",
                slug: "ladies-clothing-suits-formal",
              },
              {
                name: "オールインワン・セットアップ",
                slug: "ladies-clothing-all-in-one-setup",
              },
              {
                name: "下着・ルームウェア",
                slug: "ladies-clothing-underwear-roomwear",
              },
              {
                name: "靴下・フットウェア",
                slug: "ladies-clothing-socks-footwear",
              },
              { name: "マタニティウェア", slug: "ladies-clothing-maternity" },
              { name: "浴衣・下駄", slug: "ladies-clothing-yukata-geta" },
              {
                name: "水着・マリンウェア",
                slug: "ladies-clothing-swimwear-marine",
              },
            ],
          },
          bags: {
            name: "バッグ",
            slug: "ladies-bags",
            subcategories: [
              { name: "ハンドバッグ", slug: "ladies-bags-handbag" },
              { name: "トートバッグ", slug: "ladies-bags-tote" },
              { name: "ショルダーバッグ", slug: "ladies-bags-shoulder" },
              { name: "リュック・バックパック", slug: "ladies-bags-backpack" },
              {
                name: "ボディバッグ・サコッシュ",
                slug: "ladies-bags-body-sacoche",
              },
              {
                name: "クラッチ・パーティバッグ",
                slug: "ladies-bags-clutch-party",
              },
              { name: "カゴバッグ", slug: "ladies-bags-basket" },
              { name: "クリアバッグ", slug: "ladies-bags-clear" },
              { name: "ファーバッグ", slug: "ladies-bags-fur" },
              { name: "ボストンバッグ", slug: "ladies-bags-boston" },
              {
                name: "スーツケース・トランク",
                slug: "ladies-bags-suitcase-trunk",
              },
              {
                name: "ビジネス・オフィスバッグ",
                slug: "ladies-bags-business-office",
              },
              { name: "エコバッグ", slug: "ladies-bags-eco" },
              { name: "ママバッグ", slug: "ladies-bags-mama" },
              { name: "バッグアクセサリー", slug: "ladies-bags-accessories" },
            ],
          },
          wallets: {
            name: "財布・ケース・小物",
            slug: "ladies-wallets-cases",
            subcategories: [
              { name: "長財布", slug: "ladies-wallets-long" },
              { name: "折りたたみ財布", slug: "ladies-wallets-foldable" },
              { name: "ウォレットバッグ", slug: "ladies-wallets-wallet-bag" },
              { name: "コインケース", slug: "ladies-wallets-coin-case" },
              { name: "カードケース", slug: "ladies-wallets-card-case" },
              { name: "パスケース", slug: "ladies-wallets-pass-case" },
              { name: "キーケース", slug: "ladies-wallets-key-case" },
              { name: "マネークリップ", slug: "ladies-wallets-money-clip" },
              { name: "ポーチ", slug: "ladies-wallets-pouch" },
              {
                name: "スマホ・PC・タブレットケース",
                slug: "ladies-wallets-device-cases",
              },
              { name: "ペンケース", slug: "ladies-wallets-pen-case" },
              {
                name: "手帳ケース・カバー",
                slug: "ladies-wallets-planner-case",
              },
              { name: "キーホルダー", slug: "ladies-wallets-keyholder" },
              { name: "チャーム", slug: "ladies-wallets-charm" },
            ],
          },
          fashionAccessories: {
            name: "ファッション雑貨",
            slug: "ladies-fashion-accessories",
            subcategories: [
              { name: "ネックウェア", slug: "ladies-accessories-neckwear" },
              { name: "帽子", slug: "ladies-accessories-hats" },
              { name: "イヤーマフ", slug: "ladies-accessories-earmuffs" },
              { name: "手袋", slug: "ladies-accessories-gloves" },
              { name: "ベルト", slug: "ladies-accessories-belts" },
              { name: "ヘアアクセサリー", slug: "ladies-accessories-hair" },
              { name: "サスペンダー", slug: "ladies-accessories-suspenders" },
              { name: "つけ襟", slug: "ladies-accessories-collar" },
              {
                name: "サングラス・眼鏡",
                slug: "ladies-accessories-sunglasses-glasses",
              },
              { name: "マスク・マスクグッズ", slug: "ladies-accessories-mask" },
              {
                name: "タオル・ハンカチ",
                slug: "ladies-accessories-towel-handkerchief",
              },
              { name: "レイングッズ", slug: "ladies-accessories-rain" },
            ],
          },
        },
      },
      mens: {
        name: "メンズ",
        slug: "mens",
        primaryCategories: {
          footwear: {
            name: "シューズ",
            slug: "mens-footwear",
            subcategories: [
              { name: "スニーカー", slug: "mens-footwear-sneakers" },
              {
                name: "ビジネス・ドレスシューズ",
                slug: "mens-footwear-business-dress",
              },
              { name: "カジュアルシューズ", slug: "mens-footwear-casual" },
              { name: "ブーツ", slug: "mens-footwear-boots" },
              { name: "サンダル", slug: "mens-footwear-sandals" },
              {
                name: "レインシューズ・スノーブーツ",
                slug: "mens-footwear-rain-snow",
              },
              { name: "シューケア・靴用品", slug: "mens-footwear-care" },
            ],
          },
          clothing: {
            name: "アパレル",
            slug: "mens-clothing",
            subcategories: [
              { name: "トップス", slug: "mens-clothing-tops" },
              { name: "パンツ", slug: "mens-clothing-pants" },
              {
                name: "ジャケット・アウター",
                slug: "mens-clothing-jacket-outer",
              },
              { name: "スーツ", slug: "mens-clothing-suits" },
              {
                name: "オーバーオール・セットアップ",
                slug: "mens-clothing-overall-setup",
              },
              {
                name: "下着・ルームウェア",
                slug: "mens-clothing-underwear-roomwear",
              },
              {
                name: "靴下・フットウェア",
                slug: "mens-clothing-socks-footwear",
              },
              { name: "浴衣・下駄", slug: "mens-clothing-yukata-geta" },
              {
                name: "水着・マリンウェア",
                slug: "mens-clothing-swimwear-marine",
              },
            ],
          },
          bags: {
            name: "バッグ",
            slug: "mens-bags",
            subcategories: [
              { name: "トートバッグ", slug: "mens-bags-tote" },
              { name: "ショルダーバッグ", slug: "mens-bags-shoulder" },
              { name: "リュック・バックパック", slug: "mens-bags-backpack" },
              {
                name: "ボディバッグ・サコッシュ",
                slug: "mens-bags-body-sacoche",
              },
              {
                name: "ビジネス・オフィスバッグ",
                slug: "mens-bags-business-office",
              },
              { name: "クラッチバッグ", slug: "mens-bags-clutch" },
              { name: "ボストンバッグ", slug: "mens-bags-boston" },
              {
                name: "スーツケース・トランク",
                slug: "mens-bags-suitcase-trunk",
              },
              { name: "エコバッグ", slug: "mens-bags-eco" },
              { name: "バッグアクセサリー", slug: "mens-bags-accessories" },
            ],
          },
          wallets: {
            name: "財布・ケース・小物",
            slug: "mens-wallets-cases",
            subcategories: [
              { name: "長財布", slug: "mens-wallets-long" },
              { name: "折りたたみ財布", slug: "mens-wallets-foldable" },
              { name: "コインケース", slug: "mens-wallets-coin-case" },
              { name: "カードケース", slug: "mens-wallets-card-case" },
              { name: "パスケース", slug: "mens-wallets-pass-case" },
              { name: "キーケース", slug: "mens-wallets-key-case" },
              { name: "マネークリップ", slug: "mens-wallets-money-clip" },
              { name: "ポーチ", slug: "mens-wallets-pouch" },
              {
                name: "スマホ・PC・タブレットケース",
                slug: "mens-wallets-device-cases",
              },
              { name: "ペンケース", slug: "mens-wallets-pen-case" },
              { name: "手帳ケース・カバー", slug: "mens-wallets-planner-case" },
              { name: "キーホルダー", slug: "mens-wallets-keyholder" },
              { name: "チャーム", slug: "mens-wallets-charm" },
            ],
          },
          fashionAccessories: {
            name: "ファッション雑貨",
            slug: "mens-fashion-accessories",
            subcategories: [
              {
                name: "ネックウェア・ネクタイ",
                slug: "mens-accessories-neckwear-tie",
              },
              { name: "帽子", slug: "mens-accessories-hats" },
              { name: "イヤーマフ", slug: "mens-accessories-earmuffs" },
              { name: "手袋", slug: "mens-accessories-gloves" },
              { name: "ベルト", slug: "mens-accessories-belts" },
              { name: "サスペンダー", slug: "mens-accessories-suspenders" },
              {
                name: "サングラス・眼鏡",
                slug: "mens-accessories-sunglasses-glasses",
              },
              { name: "マスク", slug: "mens-accessories-mask" },
              {
                name: "タオル・ハンカチ",
                slug: "mens-accessories-towel-handkerchief",
              },
              { name: "レイングッズ", slug: "mens-accessories-rain" },
            ],
          },
        },
      },
    };

    // Create categories
    for (const [genderKey, genderData] of Object.entries(categoryStructure)) {
      // Create gender category (Level 1)
      const genderId = uuidv4();
      await pool.query(
        `INSERT INTO categories (id, name, slug, parent_id, level, sort_order, is_active)
         VALUES (?, ?, ?, NULL, 1, ?, TRUE)`,
        [
          genderId,
          genderData.name,
          genderData.slug,
          genderKey === "mens" ? 1 : 2,
        ]
      );
      console.log(`✅ Created gender category: ${genderData.name}`);

      // Create primary categories (Level 2)
      let primarySortOrder = 1;
      for (const [primaryKey, primaryData] of Object.entries(
        genderData.primaryCategories
      )) {
        const primaryId = uuidv4();
        await pool.query(
          `INSERT INTO categories (id, name, slug, parent_id, level, sort_order, is_active)
           VALUES (?, ?, ?, ?, 2, ?, TRUE)`,
          [
            primaryId,
            primaryData.name,
            primaryData.slug,
            genderId,
            primarySortOrder,
          ]
        );
        console.log(`  ✅ Created primary category: ${primaryData.name}`);

        // Create subcategories (Level 3)
        let subSortOrder = 1;
        for (const subcategory of primaryData.subcategories) {
          const subId = uuidv4();
          await pool.query(
            `INSERT INTO categories (id, name, slug, parent_id, level, sort_order, is_active)
             VALUES (?, ?, ?, ?, 3, ?, TRUE)`,
            [subId, subcategory.name, subcategory.slug, primaryId, subSortOrder]
          );
          subSortOrder++;
        }
        console.log(
          `    ✅ Created ${primaryData.subcategories.length} subcategories for ${primaryData.name}`
        );
        primarySortOrder++;
      }
    }

    console.log("✅ Categories initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing categories:", error.message);
    // Don't throw - allow app to continue even if category init fails
  }
}

// Create admin user if it doesn't exist
async function createAdminUser() {
  try {
    const adminEmail = "admin@gmail.com";

    // Check if admin user already exists
    const [existingAdmin] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [adminEmail]
    );

    if (existingAdmin.length > 0) {
      console.log("✅ Admin user already exists");
      return;
    }

    // Hash admin password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin", salt);

    // Generate unique ID for admin
    const adminId = "admin_" + Date.now().toString(36);

    // Create admin user
    await pool.query(
      "INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)",
      [adminId, "admin", adminEmail, hashedPassword, "admin"]
    );

    console.log("✅ Admin user created successfully");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: admin`);
    console.log(`   Role: admin`);
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
  }
}

// Export pool with Proxy to handle async initialization
// This ensures pool methods work even if pool is not yet initialized
// (pool will be initialized before any actual queries are made)
module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      if (pool) {
        return pool[prop];
      }
      // If pool is not yet initialized, return a function that will wait
      if (prop === "query" || prop === "getConnection" || prop === "execute") {
        return async function (...args) {
          // Wait for pool to be initialized (max 10 seconds)
          let attempts = 0;
          const maxAttempts = 100;
          while (!pool && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }
          if (!pool) {
            throw new Error(
              "Database pool is not initialized. Please check database connection."
            );
          }
          return pool[prop](...args);
        };
      }
      return pool?.[prop];
    },
  }
);

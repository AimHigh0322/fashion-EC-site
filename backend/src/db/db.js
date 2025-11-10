// Database connection file
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Users table initialized");

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

    // Attribute definitions (master data)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attribute_definitions (
        id VARCHAR(255) PRIMARY KEY,
        category_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        type ENUM('text', 'number', 'select', 'boolean', 'date') DEFAULT 'text',
        is_required BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category_id),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Attribute definitions table initialized");

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
        status ENUM('active', 'inactive', 'out_of_stock', 'draft', 'reservation') DEFAULT 'draft',
        brand_id VARCHAR(255),
        main_image_url VARCHAR(500),
        product_url VARCHAR(500),
        weight DECIMAL(8, 2),
        dimensions VARCHAR(100),
        seo_title VARCHAR(255),
        seo_description TEXT,
        is_featured BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sku (sku),
        INDEX idx_status (status),
        INDEX idx_brand (brand_id),
        INDEX idx_created (createdAt),
        INDEX idx_product_url (product_url),
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
        FOREIGN KEY (attribute_definition_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE,
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
        type ENUM('discount_percent', 'fixed_price', 'buy_one_get_one') DEFAULT 'discount_percent',
        discount_percent DECIMAL(5, 2),
        fixed_price DECIMAL(10, 2),
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dates (start_date, end_date),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Campaigns table initialized");

    // Product-Campaign many-to-many relationship
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

    // Check and create admin user if it doesn't exist
    await createAdminUser();

    // Check and create default categories if they don't exist
    await createDefaultCategories();
  } catch (error) {
    console.error("❌ Error initializing database tables:", error.message);
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

// Create default categories if they don't exist
async function createDefaultCategories() {
  try {
    const { v4: uuidv4 } = require("uuid");

    // Default categories structure for fashion EC site
    const defaultCategories = [
      // Level 1 categories
      { name: "メンズ", slug: "mens", parent_id: null, level: 1 },
      { name: "レディース", slug: "ladies", parent_id: null, level: 1 },
      { name: "キッズ", slug: "kids", parent_id: null, level: 1 },
      { name: "アクセサリー", slug: "accessories", parent_id: null, level: 1 },
    ];

    let createdCount = 0;
    const parentMap = new Map(); // Store parent IDs for child categories

    // Create level 1 categories
    for (const category of defaultCategories) {
      const [existing] = await pool.query(
        "SELECT id FROM categories WHERE slug = ?",
        [category.slug]
      );

      if (existing.length === 0) {
        const categoryId = uuidv4();
        await pool.query(
          `INSERT INTO categories (id, name, slug, parent_id, level, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            categoryId,
            category.name,
            category.slug,
            category.parent_id,
            category.level,
            true,
            createdCount,
          ]
        );
        parentMap.set(category.slug, categoryId);
        createdCount++;
      } else {
        parentMap.set(category.slug, existing[0].id);
      }
    }

    // Level 2 categories for メンズ
    const mensSubCategories = [
      { name: "トップス", slug: "mens-tops", parent_slug: "mens" },
      { name: "ボトムス", slug: "mens-bottoms", parent_slug: "mens" },
      { name: "アウター", slug: "mens-outer", parent_slug: "mens" },
      { name: "シューズ", slug: "mens-shoes", parent_slug: "mens" },
    ];

    // Level 2 categories for レディース
    const ladiesSubCategories = [
      { name: "トップス", slug: "ladies-tops", parent_slug: "ladies" },
      { name: "ボトムス", slug: "ladies-bottoms", parent_slug: "ladies" },
      { name: "ワンピース", slug: "ladies-dresses", parent_slug: "ladies" },
      { name: "アウター", slug: "ladies-outer", parent_slug: "ladies" },
      { name: "シューズ", slug: "ladies-shoes", parent_slug: "ladies" },
    ];

    // Level 2 categories for アクセサリー
    const accessoriesSubCategories = [
      { name: "バッグ", slug: "bags", parent_slug: "accessories" },
      { name: "財布", slug: "wallets", parent_slug: "accessories" },
      { name: "時計", slug: "watches", parent_slug: "accessories" },
      { name: "ジュエリー", slug: "jewelry", parent_slug: "accessories" },
    ];

    const allSubCategories = [
      ...mensSubCategories,
      ...ladiesSubCategories,
      ...accessoriesSubCategories,
    ];

    let subCreatedCount = 0;
    for (const subCategory of allSubCategories) {
      const parentId = parentMap.get(subCategory.parent_slug);
      if (!parentId) continue;

      const [existing] = await pool.query(
        "SELECT id FROM categories WHERE slug = ?",
        [subCategory.slug]
      );

      if (existing.length === 0) {
        const categoryId = uuidv4();
        await pool.query(
          `INSERT INTO categories (id, name, slug, parent_id, level, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            categoryId,
            subCategory.name,
            subCategory.slug,
            parentId,
            2,
            true,
            subCreatedCount,
          ]
        );
        subCreatedCount++;
      }
    }

    if (createdCount > 0 || subCreatedCount > 0) {
      console.log(
        `✅ Default categories created successfully (${
          createdCount + subCreatedCount
        } categories)`
      );
    } else {
      console.log("✅ Default categories already exist");
    }
  } catch (error) {
    console.error("❌ Error creating default categories:", error.message);
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
        return function (...args) {
          if (!pool) {
            throw new Error(
              "Database pool is not initialized yet. Please wait a moment and try again."
            );
          }
          return pool[prop](...args);
        };
      }
      return pool?.[prop];
    },
  }
);

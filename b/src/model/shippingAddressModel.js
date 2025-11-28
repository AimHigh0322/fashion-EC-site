const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

async function getShippingAddresses(userId) {
  try {
    const [addresses] = await pool.query(
      "SELECT * FROM shipping_addresses WHERE user_id = ? ORDER BY is_default DESC, createdAt DESC",
      [userId]
    );
    return addresses;
  } catch (error) {
    console.error("Database error in getShippingAddresses:", error);
    throw error;
  }
}

async function getShippingAddressById(id, userId) {
  const [addresses] = await pool.query(
    "SELECT * FROM shipping_addresses WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return addresses.length > 0 ? addresses[0] : null;
}

async function createShippingAddress(userId, addressData) {
  // Validate required fields
  if (!addressData.name || !addressData.name.trim()) {
    throw new Error("配送先の名前は必須です");
  }
  if (!addressData.postal_code || !addressData.postal_code.trim()) {
    throw new Error("郵便番号は必須です");
  }
  if (!addressData.prefecture || !addressData.prefecture.trim()) {
    throw new Error("都道府県は必須です");
  }
  if (!addressData.city || !addressData.city.trim()) {
    throw new Error("市区町村は必須です");
  }
  if (!addressData.address_line1 || !addressData.address_line1.trim()) {
    throw new Error("番地・建物名は必須です");
  }
  if (!addressData.phone || !addressData.phone.trim()) {
    throw new Error("電話番号は必須です");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const addressId = uuidv4();

    // If this is set as default, unset all other defaults for this user
    if (addressData.is_default) {
      await connection.query(
        "UPDATE shipping_addresses SET is_default = FALSE WHERE user_id = ?",
        [userId]
      );
    }

    // Trim and prepare data
    const name = addressData.name.trim();
    const postal_code = addressData.postal_code.trim();
    const prefecture = addressData.prefecture.trim();
    const city = addressData.city.trim();
    const address_line1 = addressData.address_line1.trim();
    const address_line2 =
      addressData.address_line2 && addressData.address_line2.trim()
        ? addressData.address_line2.trim()
        : null;
    const phone = addressData.phone.trim();
    // Ensure is_default is a boolean
    const is_default = Boolean(addressData.is_default);

    // Create the shipping address
    const [result] = await connection.query(
      `INSERT INTO shipping_addresses 
        (id, user_id, name, postal_code, prefecture, city, address_line1, address_line2, phone, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        addressId,
        userId,
        name,
        postal_code,
        prefecture,
        city,
        address_line1,
        address_line2,
        phone,
        is_default,
      ]
    );

    await connection.commit();
    console.log("Shipping address created successfully:", addressId);
    return { id: addressId };
  } catch (error) {
    await connection.rollback();
    console.error("Error in createShippingAddress:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error sqlMessage:", error.sqlMessage);
    console.error("Address data:", JSON.stringify(addressData, null, 2));

    // Provide more specific error messages
    if (error.code === "ER_NO_SUCH_TABLE") {
      throw new Error(
        "配送先テーブルが見つかりません。データベースを確認してください。"
      );
    } else if (error.code === "ER_DUP_ENTRY") {
      throw new Error("この配送先は既に登録されています。");
    } else if (error.code === "ER_BAD_FIELD_ERROR") {
      throw new Error(
        `データベーススキーマエラー: ${error.sqlMessage || error.message}`
      );
    } else if (error.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
      throw new Error("データ形式が正しくありません。");
    } else if (error.code === "ER_DATA_TOO_LONG") {
      throw new Error("入力データが長すぎます。");
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function updateShippingAddress(id, userId, addressData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if address belongs to user
    const [existing] = await connection.query(
      "SELECT * FROM shipping_addresses WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (existing.length === 0) {
      throw new Error("Shipping address not found");
    }

    // If this is set as default, unset all other defaults for this user
    if (addressData.is_default) {
      await connection.query(
        "UPDATE shipping_addresses SET is_default = FALSE WHERE user_id = ? AND id != ?",
        [userId, id]
      );
    }

    // Update the shipping address
    const updates = [];
    const values = [];

    if (addressData.name !== undefined) {
      updates.push("name = ?");
      values.push(addressData.name);
    }
    if (addressData.postal_code !== undefined) {
      updates.push("postal_code = ?");
      values.push(addressData.postal_code);
    }
    if (addressData.prefecture !== undefined) {
      updates.push("prefecture = ?");
      values.push(addressData.prefecture);
    }
    if (addressData.city !== undefined) {
      updates.push("city = ?");
      values.push(addressData.city);
    }
    if (addressData.address_line1 !== undefined) {
      updates.push("address_line1 = ?");
      values.push(addressData.address_line1);
    }
    if (addressData.address_line2 !== undefined) {
      updates.push("address_line2 = ?");
      values.push(addressData.address_line2);
    }
    if (addressData.phone !== undefined) {
      updates.push("phone = ?");
      values.push(addressData.phone);
    }
    if (addressData.is_default !== undefined) {
      updates.push("is_default = ?");
      values.push(addressData.is_default);
    }

    if (updates.length > 0) {
      values.push(id, userId);
      await connection.query(
        `UPDATE shipping_addresses SET ${updates.join(
          ", "
        )} WHERE id = ? AND user_id = ?`,
        values
      );
    }

    await connection.commit();
    return { id };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteShippingAddress(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM shipping_addresses WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  if (result.affectedRows === 0) {
    throw new Error("Shipping address not found");
  }
  return { id };
}

async function setDefaultAddress(id, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if address belongs to user
    const [existing] = await connection.query(
      "SELECT * FROM shipping_addresses WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (existing.length === 0) {
      throw new Error("Shipping address not found");
    }

    // Unset all defaults for this user
    await connection.query(
      "UPDATE shipping_addresses SET is_default = FALSE WHERE user_id = ?",
      [userId]
    );

    // Set this address as default
    await connection.query(
      "UPDATE shipping_addresses SET is_default = TRUE WHERE id = ?",
      [id]
    );

    await connection.commit();
    return { id };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Calculate shipping cost based on prefecture and cart total
function calculateShippingCost(prefecture, cartTotal) {
  // Free shipping for orders over 5000 yen
  if (cartTotal >= 5000) {
    return 0;
  }

  // Regional shipping costs (simplified - in reality this would be more complex)
  const shippingRates = {
    // Hokkaido and Okinawa - higher rates
    北海道: 800,
    沖縄県: 800,
    // Tohoku region
    青森県: 700,
    岩手県: 700,
    宮城県: 700,
    秋田県: 700,
    山形県: 700,
    福島県: 700,
    // Kanto region - standard rate
    茨城県: 500,
    栃木県: 500,
    群馬県: 500,
    埼玉県: 500,
    千葉県: 500,
    東京都: 500,
    神奈川県: 500,
    // Chubu region
    新潟県: 600,
    富山県: 600,
    石川県: 600,
    福井県: 600,
    山梨県: 500,
    長野県: 600,
    岐阜県: 600,
    静岡県: 600,
    愛知県: 600,
    // Kansai region
    三重県: 600,
    滋賀県: 600,
    京都府: 600,
    大阪府: 600,
    兵庫県: 600,
    奈良県: 600,
    和歌山県: 600,
    // Chugoku region
    鳥取県: 700,
    島根県: 700,
    岡山県: 700,
    広島県: 700,
    山口県: 700,
    // Shikoku region
    徳島県: 700,
    香川県: 700,
    愛媛県: 700,
    高知県: 700,
    // Kyushu region
    福岡県: 800,
    佐賀県: 800,
    長崎県: 800,
    熊本県: 800,
    大分県: 800,
    宮崎県: 800,
    鹿児島県: 800,
  };

  return shippingRates[prefecture] || 500;
}

module.exports = {
  getShippingAddresses,
  getShippingAddressById,
  createShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  setDefaultAddress,
  calculateShippingCost,
};

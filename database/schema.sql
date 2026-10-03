-- Purpose: Cloudflare D1-compatible database schema for Panda Closet.
-- Linked to: worker/src/index.js, admin and public API routes, and all product/order/message/settings records.
-- Note: This file defines the persistent application data model and should remain closely aligned with the app logic.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE CHECK(email <> ''),
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Admin',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(name <> ''),
  slug TEXT NOT NULL UNIQUE CHECK(slug <> ''),
  parent_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO categories (id, name, slug, parent_id, status) VALUES
  ('cat-men', 'Men', 'men', NULL, 'active'),
  ('cat-women', 'Women', 'women', NULL, 'active'),
  ('cat-kids', 'Kids', 'kids', NULL, 'active'),
  ('cat-unisex', 'Unisex', 'unisex', NULL, 'active'),
  ('cat-men-suits', 'Suits', 'men-suits', 'cat-men', 'active'),
  ('cat-men-trousers', 'Trousers', 'men-trousers', 'cat-men', 'active'),
  ('cat-men-jackets', 'Jackets', 'men-jackets', 'cat-men', 'active'),
  ('cat-men-shirts', 'Shirts', 'men-shirts', 'cat-men', 'active'),
  ('cat-women-suits', 'Suits', 'women-suits', 'cat-women', 'active'),
  ('cat-women-dresses', 'Dresses', 'women-dresses', 'cat-women', 'active'),
  ('cat-women-skirts', 'Skirts', 'women-skirts', 'cat-women', 'active'),
  ('cat-women-blazers', 'Blazers', 'women-blazers', 'cat-women', 'active'),
  ('cat-women-trousers', 'Trousers', 'women-trousers', 'cat-women', 'active');

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(name <> ''),
  slug TEXT NOT NULL UNIQUE CHECK(slug <> ''),
  description TEXT DEFAULT '',
  category_id TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  sale_price INTEGER,
  availability TEXT NOT NULL DEFAULT 'available',
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  sizes TEXT NOT NULL DEFAULT '[]',
  colours TEXT NOT NULL DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  image_path TEXT NOT NULL CHECK(image_path <> ''),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE CHECK(order_number <> ''),
  customer_name TEXT NOT NULL CHECK(customer_name <> ''),
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  location TEXT,
  product_id TEXT NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  product_slug TEXT,
  size TEXT,
  colour TEXT,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  contact_preference TEXT NOT NULL DEFAULT 'whatsapp',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(name <> ''),
  phone TEXT,
  email TEXT,
  message TEXT NOT NULL CHECK(message <> ''),
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY CHECK(id = 'main'),
  business_name TEXT NOT NULL DEFAULT 'Panda Closet',
  whatsapp_number TEXT DEFAULT '+265888131243',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT 'hello@pandacloset.com',
  admin_email TEXT DEFAULT 'admin@pandacloset.com',
  instagram_url TEXT DEFAULT '',
  facebook_url TEXT DEFAULT '',
  tiktok_url TEXT DEFAULT '',
  logo_path TEXT DEFAULT '',
  business_description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  default_whatsapp_message TEXT DEFAULT 'Hello Panda Closet, I would like to enquire about ordering this piece.',
  currency TEXT DEFAULT 'MWK',
  currency_symbol TEXT DEFAULT 'K',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_status_availability
  ON products(status, availability, featured);

CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON products(category_id);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON product_images(product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_status
  ON messages(status, created_at DESC);

INSERT INTO settings (
  id,
  business_name,
  whatsapp_number,
  phone,
  email,
  admin_email,
  instagram_url,
  facebook_url,
  tiktok_url,
  logo_path,
  business_description,
  location,
  default_whatsapp_message,
  currency,
  currency_symbol,
  updated_at
)
SELECT
  'main',
  'Panda Closet',
  '+265888131243',
  '+265888131243',
  'pandacloset02@gmail.com',
  'pandacloset02@gmail.com',
  'https://instagram.com/pandacloset',
  'https://facebook.com/pandacloset',
  'https://tiktok.com/@pandacloset',
  '',
  'Minimal tailoring, crafted for everyday confidence.',
  'Lilongwe, Malawi',
  'Hello Panda Closet, I would like to enquire about ordering this piece.',
  'MWK',
  'K',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 'main');

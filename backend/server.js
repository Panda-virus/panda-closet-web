/*
 * Purpose: Local development API for Panda Closet using Express, SQLite, sessions, and file uploads.
 * Linked to: src/pages/*, src/context/store.tsx, database schema, and the Cloudflare Worker replacement.
 * Note: This file is kept as the local dev backend and must remain compatible with the public API routes.
 */

import express from "express"

import session from "express-session"

import cors from "cors"

import bcrypt from "bcryptjs"

import multer from "multer"

import dotenv from "dotenv"

import fs from "fs"

import path from "path"

import { randomUUID } from "crypto"

import { fileURLToPath } from "url"

import Database from "better-sqlite3"

import nodemailer from "nodemailer"

const __filename = fileURLToPath(import.meta.url)

const __dirname = path.dirname(__filename)

const rootDir = path.resolve(__dirname, "..")

dotenv.config({ path: path.join(rootDir, ".env") })

dotenv.config({ path: path.join(__dirname, ".env") })

const PORT = Number(process.env.PORT || 3000)

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "database.db")

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4173"

const SESSION_SECRET = process.env.SESSION_SECRET || randomUUID()

const app = express()

const db = new Database(DB_PATH)

db.pragma("foreign_keys = ON")

const ensureDir = (target) => fs.mkdirSync(target, { recursive: true })

const uploadsRoot = path.join(__dirname, "uploads")

const productUploadsDir = path.join(uploadsRoot, "products")

const brandingUploadsDir = path.join(uploadsRoot, "branding")

ensureDir(productUploadsDir)

ensureDir(brandingUploadsDir)

const makeSvgPlaceholder = (label, bg, textColor) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="${bg}" />
  <rect x="80" y="80" width="1040" height="1040" rx="30" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" />
  <text x="600" y="560" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" fill="${textColor}" font-weight="700">${label}</text>
</svg>
`

const seedPlaceholderImages = () => {
  const files = [
    ["linen-two-piece-set", "#E8DDD2", "#2D2A2A"],

    ["classic-brown-dress", "#C9B399", "#2D2A2A"],

    ["tailored-black-shirt", "#202020", "#F7F4EF"],

    ["beige-co-ord-set", "#DCC7A3", "#2D2A2A"],

    ["linen-summer-shirt", "#E6D3BC", "#2D2A2A"],
  ]

  for (const [name, bg, textColor] of files) {
    const filePath = path.join(productUploadsDir, `${name}.svg`)

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        makeSvgPlaceholder(name.replace(/-/g, " "), bg, textColor),
      )
    }
  }
}

const ensureDefaultSettings = () => {
  const row = db.prepare("SELECT * FROM settings WHERE id = ?").get("main")

  if (!row) {
    db.prepare(`
      INSERT INTO settings (
        id, business_name, whatsapp_number, phone, email, admin_email, instagram_url,
        facebook_url, tiktok_url, logo_path, business_description, location,
        default_whatsapp_message, currency, currency_symbol, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "main",

      "Panda Closet",

      "+265888131243",

      "+265888131243",

      "pandacloset02@gmail.com",

      "admin@pandacloset.com",

      "https://instagram.com/pandacloset",

      "https://facebook.com/pandacloset",

      "https://tiktok.com/@pandacloset",

      "",

      "Minimal tailoring, crafted for everyday confidence.",

      "Blantyre, Malawi",

      "Hello Panda Closet, I would like to see what you have available in your collection.",

      "MWK",

      "K",

      new Date().toISOString(),
    )
  }
}

const ensureAdminAccount = () => {
  const email = (process.env.ADMIN_EMAIL || "admin@pandacloset.com").trim()

  const existing = db
    .prepare("SELECT id FROM admins WHERE email = ?")
    .get(email)

  if (existing) return

  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    console.warn("Set ADMIN_PASSWORD in .env to create the local admin account.")
    return
  }

  const hash = bcrypt.hashSync(password, 10)

  db.prepare(`
      INSERT INTO admins (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      email,
      hash,
      "Panda Closet Admin",
      new Date().toISOString(),
      new Date().toISOString(),
    )
}

const ensureCategory = (name, slug, parentId = null) => {
  const row = db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug)

  if (row) {
    if (parentId) {
      db.prepare("UPDATE categories SET parent_id = ? WHERE id = ?").run(
        parentId,
        row.id,
      )
    }

    return row.id
  }

  const id = randomUUID()

  db.prepare(
    "INSERT INTO categories (id, name, slug, status, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )

    .run(
      id,
      name,
      slug,
      "active",
      parentId,
      new Date().toISOString(),
      new Date().toISOString(),
    )

  return id
}

const ensureSeedCategories = () => {
  // Safe migration: add parent_id column if it does not exist yet.

  try {
    db.prepare("ALTER TABLE categories ADD COLUMN parent_id TEXT").run()
  } catch (_) {}

  const menId = ensureCategory("Men", "men")

  const womenId = ensureCategory("Women", "women")

  ensureCategory("Kids", "kids")

  ensureCategory("Unisex", "unisex")

  // Men subcategories

  ensureCategory("Suits", "men-suits", menId)

  ensureCategory("Trousers", "men-trousers", menId)

  ensureCategory("Jackets", "men-jackets", menId)

  ensureCategory("Shirts", "men-shirts", menId)

  // Women subcategories

  ensureCategory("Suits", "women-suits", womenId)

  ensureCategory("Dresses", "women-dresses", womenId)

  ensureCategory("Skirts", "women-skirts", womenId)

  ensureCategory("Blazers", "women-blazers", womenId)

  ensureCategory("Trousers", "women-trousers", womenId)
}

const seedProducts = () => {
  const existingCount = db
    .prepare("SELECT COUNT(*) AS count FROM products")
    .get().count

  if (existingCount > 0) return

  const rows = [
    {
      id: randomUUID(),

      name: "Linen Two-Piece Set",

      slug: "linen-two-piece-set",

      description:
        "A soft, breathable linen set designed for effortless everyday movement.",

      category: "Suits",

      price: 45000,

      sale_price: null,

      availability: "available",

      featured: 1,

      status: "published",

      sizes: JSON.stringify(["S", "M", "L"]),

      colours: JSON.stringify(["Sand", "Cream"]),

      notes: "Easy to style and tailored for comfort.",

      images: [
        "/uploads/products/linen-two-piece-set.svg",
        "/uploads/products/linen-two-piece-set.svg",
      ],
    },

    {
      id: randomUUID(),

      name: "Classic Brown Dress",

      slug: "classic-brown-dress",

      description:
        "A timeless fitted dress in a rich brown tone with understated elegance.",

      category: "Dresses",

      price: 55000,

      sale_price: null,

      availability: "made-to-order",

      featured: 1,

      status: "published",

      sizes: JSON.stringify(["S", "M", "L", "XL"]),

      colours: JSON.stringify(["Brown", "Espresso"]),

      notes: "Made to order within 7 days.",

      images: ["/uploads/products/classic-brown-dress.svg"],
    },

    {
      id: randomUUID(),

      name: "Tailored Black Shirt",

      slug: "tailored-black-shirt",

      description:
        "An elevated shirt silhouette for polished everyday wear and formal pairing.",

      category: "Shirts",

      price: 32000,

      sale_price: 28000,

      availability: "available",

      featured: 0,

      status: "published",

      sizes: JSON.stringify(["S", "M", "L"]),

      colours: JSON.stringify(["Black", "Charcoal"]),

      notes: "A crisp tailored finish.",

      images: ["/uploads/products/tailored-black-shirt.svg"],
    },

    {
      id: randomUUID(),

      name: "Beige Co-Ord Set",

      slug: "beige-co-ord-set",

      description:
        "A relaxed yet refined matching set created for chic, easy dressing.",

      category: "Suits",

      price: 62000,

      sale_price: null,

      availability: "sold-out",

      featured: 0,

      status: "published",

      sizes: JSON.stringify(["M", "L"]),

      colours: JSON.stringify(["Beige"]),

      notes: "Limited stock available in selected sizes.",

      images: ["/uploads/products/beige-co-ord-set.svg"],
    },
  ]

  const now = new Date().toISOString()

  for (const row of rows) {
    const category = db
      .prepare("SELECT id FROM categories WHERE name = ?")
      .get(row.category)

    db.prepare(`
      INSERT INTO products (
        id, name, slug, description, category_id, price, sale_price, availability,
        featured, status, sizes, colours, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id,

      row.name,

      row.slug,

      row.description,

      category.id,

      row.price,

      row.sale_price,

      row.availability,

      row.featured ? 1 : 0,

      row.status,

      row.sizes,

      row.colours,

      row.notes,

      now,

      now,
    )

    for (const [index, imagePath] of row.images.entries()) {
      db.prepare(`
        INSERT INTO product_images (id, product_id, image_path, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(randomUUID(), row.id, imagePath, index, now)
    }
  }
}

const initDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      parent_id TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      category_id TEXT,
      price INTEGER NOT NULL,
      sale_price INTEGER,
      availability TEXT DEFAULT 'available',
      featured INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      sizes TEXT DEFAULT '[]',
      colours TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      image_path TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      email TEXT,
      location TEXT,
      product_id TEXT NOT NULL,
      product_name_snapshot TEXT NOT NULL,
      product_slug TEXT,
      size TEXT,
      colour TEXT,
      quantity INTEGER NOT NULL,
      contact_preference TEXT DEFAULT 'whatsapp',
      notes TEXT,
      design_image TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      business_name TEXT,
      whatsapp_number TEXT,
      phone TEXT,
      email TEXT,
      admin_email TEXT,
      instagram_url TEXT,
      facebook_url TEXT,
      tiktok_url TEXT,
      logo_path TEXT,
      business_description TEXT,
      location TEXT,
      default_whatsapp_message TEXT,
      currency TEXT,
      currency_symbol TEXT,
      updated_at TEXT
    );
  `)

  const orderColumns = db.prepare("PRAGMA table_info(orders)").all()

  if (!orderColumns.some((column) => column.name === "product_slug")) {
    db.exec("ALTER TABLE orders ADD COLUMN product_slug TEXT")
  }

  if (!orderColumns.some((column) => column.name === "location")) {
    db.exec("ALTER TABLE orders ADD COLUMN location TEXT")
  }

  if (!orderColumns.some((column) => column.name === "design_image")) {
    db.exec("ALTER TABLE orders ADD COLUMN design_image TEXT")
  }

  ensureDefaultSettings()

  ensureSeedCategories()

  ensureAdminAccount()

  seedPlaceholderImages()

  seedProducts()
}

const parseJson = (value, fallback = []) => {
  if (!value) return fallback

  try {
    const parsed = JSON.parse(value)

    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

const normalizeOrderStatus = (status) => {
  const valid = ["new", "contacted", "confirmed", "completed", "cancelled"]

  return valid.includes(status) ? status : "new"
}

const normalizeMessageStatus = (status) => {
  const valid = ["unread", "read", "responded"]

  return valid.includes(status) ? status : "unread"
}

const buildPublicProduct = (productRow, categoryName = "") => {
  const images = db
    .prepare(
      "SELECT image_path FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC",
    )
    .all(productRow.id)
    .map((row) => row.image_path)

  return {
    id: productRow.id,

    name: productRow.name,

    slug: productRow.slug,

    description: productRow.description,

    category: categoryName || "",

    price: Number(productRow.price),

    salePrice: productRow.sale_price
      ? Number(productRow.sale_price)
      : undefined,

    availability: productRow.availability,

    featured: Boolean(productRow.featured),

    images,

    sizes: parseJson(productRow.sizes, []),

    colours: parseJson(productRow.colours, []),

    notes: productRow.notes || "",

    createdAt: productRow.created_at,

    updatedAt: productRow.updated_at,
  }
}

const getPublicSettings = () => {
  const row = db.prepare("SELECT * FROM settings WHERE id = ?").get("main")

  if (!row) {
    return {
      businessName: "Panda Closet",

      whatsappNumber: "+265888131243",

      phoneNumber: "+265888131243",

      email: "pandacloset02@gmail.com",

      adminEmail: "admin@pandacloset.com",

      instagramUrl: "",

      facebookUrl: "",

      tiktokUrl: "",

      location: "Blantyre, Malawi",

      defaultWhatsappMessage:
        "Hello Panda Closet, I would like to see what you have available in your collection.",

      currency: "MWK",

      currencySymbol: "K",

      businessDescription:
        "Minimal tailoring, crafted for everyday confidence.",
    }
  }

  return {
    businessName: row.business_name || "Panda Closet",

    whatsappNumber: "+265888131243",

    phoneNumber: "+265888131243",

    email: "pandacloset02@gmail.com",

    instagramUrl: row.instagram_url || "",

    facebookUrl: row.facebook_url || "",

    tiktokUrl: row.tiktok_url || "",

    location: "Blantyre, Malawi",

    defaultWhatsappMessage:
      row.default_whatsapp_message ||
      "Hello Panda Closet, I would like to see what you have available in your collection.",

    currency: row.currency || "MWK",

    currencySymbol: row.currency_symbol || "K",

    businessDescription:
      row.business_description ||
      "Minimal tailoring, crafted for everyday confidence.",
  }
}

const getOrderNumber = () => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  const dateKey = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`

  const count = db
    .prepare(
      `SELECT COUNT(*) AS count FROM orders WHERE substr(order_number, 4, 8) = ?`,
    )
    .get(dateKey).count

  return `PC-${dateKey}-${String(count + 1).padStart(4, "0")}`
}

const buildOrderNotificationText = (order) => {
  const lines = [
    "New order request received.",
    `Order Number: ${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `WhatsApp: ${order.whatsapp || order.phone}`,
    ...(order.location ? [`Location: ${order.location}`] : []),
    `Email: ${order.email || "Not provided"}`,
    `Product: ${order.productName}`,
    `Size: ${order.size || "Not specified"}`,
    `Colour: ${order.colour || "Not specified"}`,
    `Quantity: ${order.quantity || 1}`,
  ]

  if (order.notes) {
    lines.push(`Notes: ${order.notes}`)
  }

  return lines.join("\n")
}

const buildOrderEmailHtml = (order) => {
  const noteBlock = order.notes
    ? `<p><strong>Notes:</strong> ${order.notes}</p>`
    : ""
  const locationBlock = order.location
    ? `<p><strong>Location:</strong> ${order.location}</p>`
    : ""

  return `
    <div style="font-family: Arial, sans-serif; color: #1f1b18; line-height: 1.6;">
      <h2 style="margin-bottom: 12px;">New order request</h2>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Customer:</strong> ${order.customerName}</p>
      <p><strong>Phone:</strong> ${order.phone}</p>
      <p><strong>WhatsApp:</strong> ${order.whatsapp || order.phone}</p>
      ${locationBlock}
      <p><strong>Email:</strong> ${order.email || "Not provided"}</p>
      <p><strong>Product:</strong> ${order.productName}</p>
      <p><strong>Size:</strong> ${order.size || "Not specified"}</p>
      <p><strong>Colour:</strong> ${order.colour || "Not specified"}</p>
      <p><strong>Quantity:</strong> ${order.quantity || 1}</p>
      ${noteBlock}
    </div>
  `
}

const sendOrderNotifications = async (order) => {
  const settings = getPublicSettings()
  const recipient = (
    settings.adminEmail ||
    process.env.ADMIN_EMAIL ||
    process.env.BUSINESS_EMAIL ||
    settings.email ||
    "admin@pandacloset.com"
  ).trim()

  const whatsappNumber = "265888131243"
  const whatsappText = encodeURIComponent(
    `Hello Panda Closet, I just submitted order request ${order.orderNumber} and would like to follow up.`,
  )

  const waLink = `https://wa.me/${whatsappNumber}?text=${whatsappText}`
  const emailSubject = `New order request - ${order.orderNumber}`
  const emailBody = buildOrderNotificationText(order)
  const emailLink = `mailto:${recipient}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`

  const smtpHost = process.env.SMTP_HOST?.trim()
  const smtpUser = process.env.SMTP_USER?.trim()
  const smtpPass = process.env.SMTP_PASS?.trim()
  const smtpPort = Number(process.env.SMTP_PORT || 587)
  const fromAddress = (process.env.EMAIL_FROM || settings.email || "pandacloset02@gmail.com").trim()

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        replyTo: order.email || order.phone,
        subject: emailSubject,
        text: emailBody,
        html: buildOrderEmailHtml(order),
      })

      logNotification("ORDER_EMAIL_SENT", { orderNumber: order.orderNumber, recipient })
      return { whatsappLink: waLink, emailLink, emailSent: true }
    } catch (error) {
      logNotification("ORDER_EMAIL_FAILED", {
        orderNumber: order.orderNumber,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  logNotification("ORDER_NOTIFICATION_READY", {
    orderNumber: order.orderNumber,
    whatsappLink: waLink,
    emailLink,
    emailSent: false,
    smtpConfigured: Boolean(smtpHost && smtpUser && smtpPass),
  })

  return { whatsappLink: waLink, emailLink, emailSent: false }
}

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next()
  }

  return res
    .status(401)
    .json({ success: false, message: "Authentication required." })
}

const logNotification = (type, payload) => {
  if (process.env.NODE_ENV === "production") {
    console.log(`[${type}] ${JSON.stringify(payload)}`)
  } else {
    console.log(`[${type}] ${JSON.stringify(payload)}`)
  }
}

app.use(
  cors({
    origin: [
      FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
      "http://127.0.0.1:5173",
    ],

    credentials: true,
  }),
)

app.use(express.json({ limit: "10mb" }))

app.use(express.urlencoded({ extended: true }))

app.use(
  session({
    secret: SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,

      sameSite: "lax",

      secure: false,

      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
)

app.use("/uploads", express.static(uploadsRoot))

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"]

  if (allowed.includes(file.mimetype)) {
    cb(null, true)

    return
  }

  cb(
    new Error(
      "Unsupported file type. Please upload JPG, JPEG, PNG, or WEBP images only.",
    ),
  )
}

const productImageUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, productUploadsDir)
    },

    filename(req, file, cb) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")

      cb(null, `${Date.now()}-${safeName}`)
    },
  }),

  limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter,
})

const brandingUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, brandingUploadsDir)
    },

    filename(req, file, cb) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")

      cb(null, `${Date.now()}-${safeName}`)
    },
  }),

  limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter,
})

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

app.get("/api/categories", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM categories WHERE status = ? ORDER BY name ASC")
    .all("active")

  res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      parentId: row.parent_id || null,
    })),
  )
})

app.get("/api/admin/categories", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY name ASC").all()

  res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      parentId: row.parent_id || null,
    })),
  )
})

app.post("/api/admin/categories", requireAdmin, (req, res) => {
  const name = String(req.body?.name || "").trim()

  const parentId = req.body?.parentId || null

  if (!name)
    return res
      .status(400)
      .json({ success: false, message: "Category name is required." })

  const parent = parentId
    ? db
        .prepare("SELECT id, slug, parent_id FROM categories WHERE id = ?")
        .get(parentId)
    : null

  if (parentId && !parent)
    return res
      .status(400)
      .json({ success: false, message: "Parent category not found." })

  if (parent?.parent_id)
    return res
      .status(400)
      .json({
        success: false,
        message: "Subcategories cannot have subcategories.",
      })

  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const slug = parent ? `${parent.slug}-${baseSlug}` : baseSlug

  if (!slug)
    return res
      .status(400)
      .json({
        success: false,
        message: "Category name must contain letters or numbers.",
      })

  if (db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug)) {
    return res
      .status(409)
      .json({
        success: false,
        message: "A category with this name already exists under that parent.",
      })
  }

  const id = randomUUID()

  const now = new Date().toISOString()

  db.prepare(
    "INSERT INTO categories (id, name, slug, parent_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )

    .run(id, name, slug, parentId, "active", now, now)

  return res
    .status(201)
    .json({
      success: true,
      category: { id, name, slug, status: "active", parentId },
    })
})

app.put("/api/admin/categories/:id", requireAdmin, (req, res) => {
  const category = db
    .prepare("SELECT * FROM categories WHERE id = ?")
    .get(req.params.id)

  if (!category)
    return res
      .status(404)
      .json({ success: false, message: "Category not found." })

  const name = String(req.body?.name ?? category.name).trim()

  const status = ["active", "hidden"].includes(req.body?.status)
    ? req.body.status
    : category.status

  if (!name)
    return res
      .status(400)
      .json({ success: false, message: "Category name is required." })

  const parent = category.parent_id
    ? db
        .prepare("SELECT slug FROM categories WHERE id = ?")
        .get(category.parent_id)
    : null

  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const slug = parent ? `${parent.slug}-${baseSlug}` : baseSlug

  const duplicate = db
    .prepare("SELECT id FROM categories WHERE slug = ? AND id != ?")
    .get(slug, category.id)

  if (duplicate)
    return res
      .status(409)
      .json({
        success: false,
        message: "A category with this name already exists under that parent.",
      })

  db.prepare(
    "UPDATE categories SET name = ?, slug = ?, status = ?, updated_at = ? WHERE id = ?",
  )

    .run(name, slug, status, new Date().toISOString(), category.id)

  return res.json({ success: true, message: "Category updated." })
})

app.delete("/api/admin/categories/:id", requireAdmin, (req, res) => {
  const category = db
    .prepare("SELECT id, parent_id FROM categories WHERE id = ?")
    .get(req.params.id)

  if (!category)
    return res
      .status(404)
      .json({ success: false, message: "Category not found." })

  const childIds = category.parent_id
    ? []
    : db
        .prepare("SELECT id FROM categories WHERE parent_id = ?")
        .all(category.id)
        .map((row) => row.id)

  const ids = [category.id, ...childIds]

  const placeholders = ids.map(() => "?").join(", ")

  const removeCategories = db.transaction(() => {
    db.prepare(
      `UPDATE products SET category_id = NULL WHERE category_id IN (${placeholders})`,
    ).run(...ids)

    db.prepare(`DELETE FROM categories WHERE id IN (${placeholders})`).run(
      ...ids,
    )
  })

  removeCategories()

  return res.json({
    success: true,
    message: "Category and its subcategories deleted.",
  })
})

app.get("/api/settings/public", (req, res) => {
  res.json(getPublicSettings())
})

app.get("/api/products", (req, res) => {
  const rows = db
    .prepare(`
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'published' AND p.availability != 'hidden'
    ORDER BY p.featured DESC, p.created_at DESC
  `)
    .all()

  const products = rows.map((row) => buildPublicProduct(row, row.category_name))

  res.json(products)
})

app.get("/api/products/:slug", (req, res) => {
  const row = db
    .prepare(`
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.slug = ? AND p.status = 'published' AND p.availability != 'hidden'
  `)
    .get(req.params.slug)

  if (!row) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found." })
  }

  return res.json(buildPublicProduct(row, row.category_name))
})

app.post("/api/orders", async (req, res) => {
  const body = req.body || {}

  const customerName = (body.customerName || body.customer_name || "").trim()

  const phone = (body.phone || "").trim()

  const whatsapp = (body.whatsapp || "").trim()

  const email = (body.email || "").trim()

  const location = (body.location || "").trim()

  const productId = body.productId || body.product_id || ""

  const productSlug = String(body.productSlug || "").trim()

  const productName = String(body.productName || "").trim()

  const size = (body.size || "").trim()

  const colour = (body.colour || "").trim()

  const quantity = Number(body.quantity || 1)

  const contactPreference =
    body.contactPreference || body.contact_preference || "whatsapp"

  const notes = (body.notes || "").trim()
  const designImage = typeof body.designImage === "string" ? body.designImage : ""

  if (
    designImage &&
    (designImage.length > 1_870_000 ||
      !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        designImage,
      ))
  ) {
    return res.status(400).json({
      success: false,
      message: "Please upload a PNG, JPG, or WEBP image under 1.4 MB.",
    })
  }

  if (
    !customerName ||
    !/^0\d{9}$/.test(phone) ||
    (whatsapp && !/^0\d{9}$/.test(whatsapp)) ||
    (!productId && !productSlug) ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Please complete the required order fields.",
      })
  }

  const product =
    db.prepare("SELECT * FROM products WHERE id = ?").get(productId) ||
    (productSlug
      ? db.prepare("SELECT * FROM products WHERE slug = ?").get(productSlug)
      : null)

  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found." })
  }

  if (
    product.status !== "published" ||
    ![
      "available",
      "made-to-order",
      "available-and-made-to-order",
    ].includes(product.availability)
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "This product is not available for ordering.",
      })
  }

  if (!colour) {
    return res
      .status(400)
      .json({ success: false, message: "Please select a colour." })
  }

  const orderProductName = product.name

  if (!orderProductName) {
    return res
      .status(400)
      .json({ success: false, message: "Product details are required." })
  }

  const orderNumber = getOrderNumber()

  const now = new Date().toISOString()

  const orderId =
    typeof body.id === "string" && body.id.length < 80 ? body.id : randomUUID()

  db.prepare(`
    INSERT INTO orders (
      id, order_number, customer_name, phone, whatsapp, email, location,
      product_id, product_name_snapshot, product_slug, size, colour, quantity, contact_preference, notes,
      design_image, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,

    orderNumber,

    customerName,

    phone,

    whatsapp,

    email,

    location,

    productId || product?.id,

    orderProductName,

    productSlug || product?.slug || "",

    size,

    colour,

    quantity,

    contactPreference,

    notes,

    designImage,

    "new",

    now,

    now,
  )

  const notifyEmail =
    process.env.ADMIN_EMAIL ||
    process.env.EMAIL_API_KEY ||
    "admin@pandacloset.com"

  logNotification("ORDER_SUBMITTED", {
    orderNumber,

    customerName,

    phone,

    whatsapp,

    location,

    email,

    product: orderProductName,

    adminEmail: notifyEmail,

    quantity,

    size,

    colour,

    contactPreference,
  })

  const settings = getPublicSettings()

  const priceAmount = Number(product?.price)
  const estimatedPrice = Number.isFinite(priceAmount)
    ? `💰 *Price:* ${settings.currencySymbol || "K"}${priceAmount.toLocaleString()} (Estimated Cost)`
    : ""
  const customerMessage = [
    `✨ *NEW ORDER - ${settings.businessName || "Panda Closet"}* ✨`,
    "",
    `🧾 *Order #:* ${orderNumber}`,
    "",
    `🛍️ *Product:* ${orderProductName}`,
    estimatedPrice,
    `📏 *Size:* ${size || "Not specified"}`,
    `🎨 *Colour:* ${colour || "Not specified"}`,
    `🔢 *Quantity:* ${quantity}`,
    "",
    `👤 *Customer:* ${customerName}`,
    location ? `📍 *Location:* ${location}` : "",
    `📞 *Phone:* ${phone}`,
    `📱 *WhatsApp:* ${whatsapp || phone}`,
    `✉️ *Email:* ${email || "Not provided"}`,
    notes ? `📝 *Notes:* ${notes}` : "",
    "",
    "🙏 Please review and confirm my order. Thank you!",
  ]
    .filter(Boolean)
    .join("\n")

  const waLink = `https://wa.me/265888131243?text=${encodeURIComponent(customerMessage)}`

  const notified = await sendOrderNotifications({
    orderNumber,
    customerName,
    phone,
    whatsapp: whatsapp || phone,
    location,
    email,
    productName: orderProductName,
    size,
    colour,
    quantity,
    contactPreference,
    notes,
  })

  return res.status(201).json({
    success: true,

    order_number: orderNumber,

    orderNumber,

    message: "Order request received.",

    whatsappLink: notified.whatsappLink || waLink,
    emailLink: notified.emailLink,
    emailSent: notified.emailSent,

    order: {
      id: orderId,

      orderNumber,

      customerName,

      phone,

      whatsapp: whatsapp || phone,

      email,

      location,

      productId: productId || product.id,

      productName: orderProductName,

      productSlug: productSlug || product?.slug || "",

      size,

      colour,

      quantity,

      designImage,

      notes,

      contactPreference,

      status: "new",

      createdAt: now,

      updatedAt: now,
    },
  })
})

app.post("/api/messages", (req, res) => {
  const body = req.body || {}

  const id =
    typeof body.id === "string" && body.id.length < 80 ? body.id : randomUUID()

  const name = (body.name || "").trim()

  const phone = (body.phone || "").trim()

  const email = (body.email || "").trim()

  const message = (body.message || "").trim()

  if (!name || !message) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Please provide your name and message.",
      })
  }

  db.prepare(`
    INSERT INTO messages (id, name, phone, email, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, phone, email, message, "unread", new Date().toISOString())

  logNotification("CONTACT_MESSAGE", { name, phone, email, message })

  return res
    .status(201)
    .json({ success: true, id, message: "Message received." })
})

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {}

  const row = db
    .prepare("SELECT * FROM admins WHERE email = ?")
    .get((email || "").trim().toLowerCase())

  if (!row || !bcrypt.compareSync(String(password || ""), row.password_hash)) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid email or password." })
  }

  req.session.adminId = row.id

  req.session.adminEmail = row.email

  req.session.adminName = row.name

  return res.json({
    success: true,
    message: "Login successful.",
    admin: { email: row.email, name: row.name },
  })
})

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out." })
  })
})

app.get("/api/admin/session", requireAdmin, (req, res) => {
  const row = db
    .prepare("SELECT email, name FROM admins WHERE id = ?")
    .get(req.session.adminId)

  res.json({
    authenticated: true,
    admin: {
      email: row?.email || req.session.adminEmail,
      name: row?.name || "Admin",
    },
  })
})

app.get("/api/admin/products", requireAdmin, (req, res) => {
  const rows = db
    .prepare(`
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.updated_at DESC
  `)
    .all()

  res.json(
    rows.map((row) => ({
      ...buildPublicProduct(row, row.category_name),

      categoryId: row.category_id,

      status: row.status,
    })),
  )
})

app.get("/api/admin/products/:id", requireAdmin, (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
    )
    .get(req.params.id)

  if (!row)
    return res
      .status(404)
      .json({ success: false, message: "Product not found." })

  return res.json({
    ...buildPublicProduct(row, row.category_name),

    categoryId: row.category_id,

    status: row.status,
  })
})

app.post(
  "/api/admin/products",
  requireAdmin,
  productImageUpload.array("images", 10),
  (req, res) => {
    try {
      const payload =
        typeof req.body.product === "string"
          ? JSON.parse(req.body.product)
          : req.body

      const categoryName = payload.category || payload.categoryName || "Sets"

      let category = db
        .prepare("SELECT * FROM categories WHERE name = ?")
        .get(categoryName)

      if (!category) {
        const slug = categoryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")

        category = {
          id: randomUUID(),

          name: categoryName,

          slug,

          status: "active",
        }

        db.prepare(
          "INSERT INTO categories (id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )

          .run(
            category.id,
            category.name,
            category.slug,
            "active",
            new Date().toISOString(),
            new Date().toISOString(),
          )
      }

      const productId = randomUUID()

      const now = new Date().toISOString()

      const productName = (payload.name || "").trim()

      const slug = (payload.slug || productName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

      if (!productName) {
        return res
          .status(400)
          .json({ success: false, message: "Product name is required." })
      }

      const price = Number(payload.price || 0)

      db.prepare(`
      INSERT INTO products (
        id, name, slug, description, category_id, price, sale_price, availability,
        featured, status, sizes, colours, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        productId,

        productName,

        slug,

        payload.description || "",

        category.id,

        Number.isFinite(price) ? price : 0,

        payload.salePrice ? Number(payload.salePrice) : null,

        payload.availability || "available",

        payload.featured ? 1 : 0,

        payload.status === "hidden" ? "hidden" : "published",

        JSON.stringify(Array.isArray(payload.sizes) ? payload.sizes : []),

        JSON.stringify(Array.isArray(payload.colours) ? payload.colours : []),

        payload.notes || "",

        now,

        now,
      )

      const uploaded = Array.isArray(req.files) ? req.files : []

      const retainedImages = Array.isArray(payload.images)
        ? payload.images.filter(
            (image) => typeof image === "string" && !image.startsWith("data:"),
          )
        : []

      retainedImages.forEach((image, index) => {
        db.prepare(
          "INSERT INTO product_images (id, product_id, image_path, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
        )

          .run(randomUUID(), productId, image, index, now)
      })

      uploaded.forEach((file, index) => {
        const relative = `/uploads/products/${path.basename(file.path)}`

        db.prepare(
          "INSERT INTO product_images (id, product_id, image_path, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
        )

          .run(
            randomUUID(),
            productId,
            relative,
            retainedImages.length + index,
            now,
          )
      })

      return res
        .status(201)
        .json({ success: true, productId, message: "Product created." })
    } catch (error) {
      console.error(error)

      return res
        .status(400)
        .json({ success: false, message: "Unable to create product." })
    }
  },
)

app.put(
  "/api/admin/products/:id",
  requireAdmin,
  productImageUpload.array("images", 10),
  (req, res) => {
    try {
      const payload =
        typeof req.body.product === "string"
          ? JSON.parse(req.body.product)
          : req.body

      const product = db
        .prepare("SELECT * FROM products WHERE id = ?")
        .get(req.params.id)

      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found." })

      const categoryName = payload.category || payload.categoryName || "Sets"

      let category = db
        .prepare("SELECT * FROM categories WHERE name = ?")
        .get(categoryName)

      if (!category) {
        const slug = categoryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")

        category = {
          id: randomUUID(),
          name: categoryName,
          slug,
          status: "active",
        }

        db.prepare(
          "INSERT INTO categories (id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )

          .run(
            category.id,
            category.name,
            category.slug,
            "active",
            new Date().toISOString(),
            new Date().toISOString(),
          )
      }

      const slug = (payload.slug || payload.name || product.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

      const price = Number(payload.price ?? product.price)

      const newStatus = payload.status === "hidden" ? "hidden" : "published"

      db.prepare(`
      UPDATE products SET
        name = ?, slug = ?, description = ?, category_id = ?, price = ?, sale_price = ?, availability = ?,
        featured = ?, status = ?, sizes = ?, colours = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
        payload.name || product.name,

        slug,

        payload.description ?? product.description,

        category.id,

        Number.isFinite(price) ? price : product.price,

        payload.salePrice ? Number(payload.salePrice) : product.sale_price,

        payload.availability || product.availability,

        payload.featured ? 1 : 0,

        newStatus,

        JSON.stringify(
          Array.isArray(payload.sizes)
            ? payload.sizes
            : parseJson(product.sizes, []),
        ),

        JSON.stringify(
          Array.isArray(payload.colours)
            ? payload.colours
            : parseJson(product.colours, []),
        ),

        payload.notes ?? product.notes,

        new Date().toISOString(),

        product.id,
      )

      const uploaded = Array.isArray(req.files) ? req.files : []

      if (Array.isArray(payload.images) || uploaded.length) {
        const previousImages = db
          .prepare("SELECT image_path FROM product_images WHERE product_id = ?")
          .all(product.id)

        const retainedImages = Array.isArray(payload.images)
          ? payload.images.filter(
              (image) =>
                typeof image === "string" && !image.startsWith("data:"),
            )
          : []

        db.prepare("DELETE FROM product_images WHERE product_id = ?").run(
          product.id,
        )

        previousImages.forEach(({ image_path: imagePath }) => {
          if (
            retainedImages.includes(imagePath) ||
            !imagePath.startsWith("/uploads/products/")
          )
            return

          const filePath = path.join(
            productUploadsDir,
            path.basename(imagePath),
          )

          if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        })

        retainedImages.forEach((image, index) => {
          db.prepare(
            "INSERT INTO product_images (id, product_id, image_path, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
          )

            .run(
              randomUUID(),
              product.id,
              image,
              index,
              new Date().toISOString(),
            )
        })

        uploaded.forEach((file, index) => {
          const relative = `/uploads/products/${path.basename(file.path)}`

          db.prepare(
            "INSERT INTO product_images (id, product_id, image_path, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
          )

            .run(
              randomUUID(),
              product.id,
              relative,
              retainedImages.length + index,
              new Date().toISOString(),
            )
        })
      }

      return res.json({ success: true, message: "Product updated." })
    } catch (error) {
      console.error(error)

      return res
        .status(400)
        .json({ success: false, message: "Unable to update product." })
    }
  },
)

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const product = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(req.params.id)

  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found." })

  const images = db
    .prepare("SELECT image_path FROM product_images WHERE product_id = ?")
    .all(product.id)

  db.prepare("DELETE FROM product_images WHERE product_id = ?").run(product.id)

  db.prepare("DELETE FROM products WHERE id = ?").run(product.id)

  images.forEach(({ image_path: imagePath }) => {
    if (!imagePath.startsWith("/uploads/products/")) return

    const filePath = path.join(productUploadsDir, path.basename(imagePath))

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  })

  return res.json({ success: true, message: "Product deleted." })
})

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all()

  res.json(
    rows.map((row) => ({
      id: row.id,

      orderNumber: row.order_number,

      customerName: row.customer_name,

      phone: row.phone,

      whatsapp: row.whatsapp,

      email: row.email,

      location: row.location || "",

      productId: row.product_id,

      productName: row.product_name_snapshot,

      productSlug: row.product_slug || "",

      size: row.size,

      colour: row.colour,

      quantity: row.quantity,

      notes: row.notes,

      contactPreference: row.contact_preference,

      status: row.status,

      createdAt: row.created_at,

      updatedAt: row.updated_at,
    })),
  )
})

app.get("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id)

  if (!row)
    return res.status(404).json({ success: false, message: "Order not found." })

  return res.json({
    id: row.id,

    orderNumber: row.order_number,

    customerName: row.customer_name,

    phone: row.phone,

    whatsapp: row.whatsapp,

    email: row.email,

    location: row.location || "",

    productId: row.product_id,

    productName: row.product_name_snapshot,

    productSlug: row.product_slug || "",

    size: row.size,

    colour: row.colour,

    quantity: row.quantity,

    notes: row.notes,

    designImage: row.design_image || "",

    contactPreference: row.contact_preference,

    status: row.status,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  })
})

app.put("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const { status } = req.body || {}

  const validStatus = normalizeOrderStatus(status)

  const updated = db
    .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
    .run(validStatus, new Date().toISOString(), req.params.id)

  if (!updated.changes)
    return res.status(404).json({ success: false, message: "Order not found." })

  return res.json({ success: true, message: "Order status updated." })
})

app.get("/api/admin/messages", requireAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM messages ORDER BY created_at DESC")
    .all()

  res.json(
    rows.map((row) => ({
      id: row.id,

      name: row.name,

      phone: row.phone,

      email: row.email,

      message: row.message,

      status: row.status,

      createdAt: row.created_at,
    })),
  )
})

app.put("/api/admin/messages/:id", requireAdmin, (req, res) => {
  const { status } = req.body || {}

  const validStatus = normalizeMessageStatus(status)

  const updated = db
    .prepare("UPDATE messages SET status = ? WHERE id = ?")
    .run(validStatus, req.params.id)

  if (!updated.changes)
    return res
      .status(404)
      .json({ success: false, message: "Message not found." })

  return res.json({ success: true, message: "Message updated." })
})

app.get("/api/admin/settings", requireAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM settings WHERE id = ?").get("main")

  if (!row)
    return res
      .status(404)
      .json({ success: false, message: "Settings not found." })

  res.json({
    businessName: row.business_name,

    whatsappNumber: "+265888131243",

    phoneNumber: "+265888131243",

    email: "pandacloset02@gmail.com",

    adminEmail: row.admin_email,

    instagramUrl: row.instagram_url,

    facebookUrl: row.facebook_url,

    tiktokUrl: row.tiktok_url,

    logoPath: row.logo_path,

    businessDescription: row.business_description,

    location: "Blantyre, Malawi",

    defaultWhatsappMessage: row.default_whatsapp_message,

    currency: row.currency,

    currencySymbol: row.currency_symbol,
  })
})

app.put("/api/admin/settings", requireAdmin, (req, res) => {
  const payload = req.body || {}

  db.prepare(`
    UPDATE settings SET
      business_name = ?, whatsapp_number = ?, phone = ?, email = ?, admin_email = ?,
      instagram_url = ?, facebook_url = ?, tiktok_url = ?, logo_path = ?, business_description = ?,
      location = ?, default_whatsapp_message = ?, currency = ?, currency_symbol = ?, updated_at = ?
    WHERE id = ?
  `).run(
    payload.businessName || "Panda Closet",

    payload.whatsappNumber || "",

    payload.phoneNumber || "",

    payload.email || "pandacloset02@gmail.com",

    payload.adminEmail || "admin@pandacloset.com",

    payload.instagramUrl || "",

    payload.facebookUrl || "",

    payload.tiktokUrl || "",

    payload.logoPath || "",

    payload.businessDescription || "",

    payload.location || "",

    payload.defaultWhatsappMessage ||
      "Hello Panda Closet, I would like to see what you have available in your collection.",

    payload.currency || "MWK",

    payload.currencySymbol || "K",

    new Date().toISOString(),

    "main",
  )

  return res.json({ success: true, message: "Settings updated." })
})

app.post(
  "/api/admin/logo",
  requireAdmin,
  brandingUpload.single("logo"),
  (req, res) => {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Logo upload is required." })

    const logoPath = `/uploads/branding/${path.basename(req.file.path)}`

    db.prepare(
      "UPDATE settings SET logo_path = ?, updated_at = ? WHERE id = ?",
    ).run(logoPath, new Date().toISOString(), "main")

    return res.json({ success: true, logoPath, message: "Logo uploaded." })
  },
)

app.post("/api/admin/create", requireAdmin, (req, res) => {
  const { email, password, name } = req.body || {}

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." })
  }

  const existing = db
    .prepare("SELECT id FROM admins WHERE email = ?")
    .get(String(email).trim().toLowerCase())

  if (existing) {
    return res
      .status(409)
      .json({ success: false, message: "Admin already exists." })
  }

  db.prepare(
    "INSERT INTO admins (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  )

    .run(
      randomUUID(),
      String(email).trim().toLowerCase(),
      bcrypt.hashSync(String(password), 10),
      name || "Admin",
      new Date().toISOString(),
      new Date().toISOString(),
    )

  return res.status(201).json({ success: true, message: "Admin created." })
})

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: error.message })
  }

  if (error) {
    return res
      .status(400)
      .json({
        success: false,
        message: error.message || "Request could not be processed.",
      })
  }

  return next()
})

const createAdminFromCli = () => {
  const email = (process.env.ADMIN_EMAIL || "admin@pandacloset.com")
    .trim()
    .toLowerCase()

  const password = process.env.ADMIN_PASSWORD || "admin123"

  const hash = bcrypt.hashSync(password, 10)

  const exists = db.prepare("SELECT id FROM admins WHERE email = ?").get(email)

  if (exists) {
    console.log(`Admin already exists: ${email}`)

    return
  }

  db.prepare(
    "INSERT INTO admins (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  )

    .run(
      randomUUID(),
      email,
      hash,
      "Panda Closet Admin",
      new Date().toISOString(),
      new Date().toISOString(),
    )

  console.log(`Created admin account: ${email}`)
}

if (process.argv.includes("--create-admin")) {
  initDatabase()

  createAdminFromCli()

  console.log("Admin creation complete.")

  process.exit(0)
}

initDatabase()

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Panda Closet backend running on http://localhost:${PORT}`)
})

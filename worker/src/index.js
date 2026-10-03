/*
 * Purpose: Cloudflare Worker API layer for the Panda Closet storefront and protected admin routes.
 * Linked to: database/schema.sql, Cloudflare D1, R2 storage, and the frontend API calls in src/lib/api.ts.
 * Note: This is the production-ready backend replacement for the local Express server.
 */

import bcrypt from "bcryptjs"

const SESSION_COOKIE = "panda_admin_session"

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8

const REQUEST_LIMIT = 30

const RATE_LIMIT_WINDOW_MS = 60 * 1000

const RATE_LIMIT_STORE = new Map()

const json = (body, init = {}) => {
  const headers = new Headers(init.headers || {})

  headers.set("Content-Type", "application/json; charset=utf-8")

  return new Response(JSON.stringify(body), {
    ...init,

    headers,
  })
}

const parseCookies = (cookieHeader = "") => {
  const result = {}

  for (const part of String(cookieHeader).split(";")) {
    const [name, ...rest] = part.trim().split("=")

    if (!name) continue

    try {
      result[name] = decodeURIComponent(rest.join("="))
    } catch {
      continue
    }
  }

  return result
}

const serializeCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`)

  if (options.httpOnly) parts.push("HttpOnly")

  if (options.secure) parts.push("Secure")

  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)

  if (options.path) parts.push(`Path=${options.path}`)

  return parts.join("; ")
}

const getAllowedOrigin = (request, env = {}) => {
  const origin = request.headers.get("Origin")
  if (!origin) return ""

  const allowList = [
    env.FRONTEND_URL,
    new URL(request.url).origin,
    "http://localhost:4173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:5173",
  ].filter(Boolean)

  return allowList.includes(origin) ? origin : ""
}

const withCors = (response, request, env) => {
  const origin = getAllowedOrigin(request, env)

  const headers = new Headers(response.headers)
  const vary = headers.get("Vary")

  if (!vary || !vary.toLowerCase().split(",").some((value) => value.trim() === "origin")) {
    headers.set("Vary", vary ? `${vary}, Origin` : "Origin")
  }

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin)
    headers.set("Access-Control-Allow-Credentials", "true")
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  }

  return new Response(response.body, {
    status: response.status,

    statusText: response.statusText,

    headers,
  })
}

const parseJsonBody = async (request) => {
  if (request.method === "GET" || request.method === "HEAD") return {}

  const text = await request.text()

  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

const getSessionFromRequest = async (request, env) => {
  const cookies = parseCookies(request.headers.get("Cookie") || "")

  const sessionId = cookies[SESSION_COOKIE]

  if (!sessionId) return null

  const session = await env.DB.prepare(`
    SELECT s.id, s.admin_id, s.expires_at, a.email
    FROM admin_sessions s
    JOIN admins a ON a.id = s.admin_id
    WHERE s.id = ?
  `)
    .bind(sessionId)
    .first()

  if (!session) return null

  if (Date.parse(session.expires_at) <= Date.now()) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE id = ?")
      .bind(sessionId)
      .run()

    return null
  }

  return {
    id: session.id,
    adminId: session.admin_id,
    adminEmail: session.email,
  }
}

const parseProductForm = async (request) => {
  const form = await request.formData()

  const rawProduct = form.get("product")

  const product = typeof rawProduct === "string" ? JSON.parse(rawProduct) : {}

  const files = form
    .getAll("images")
    .filter((value) => value && typeof value !== "string" && value.size > 0)

  return { product, files }
}

const getProductImages = async (env, productId) => {
  const result = await env.DB.prepare(`
    SELECT image_path FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC
  `)
    .bind(productId)
    .all()

  return result.results.map((row) => row.image_path)
}

const getOrCreateCategory = async (env, categoryName) => {
  const name = sanitizeString(categoryName, "Sets")

  let category = await env.DB.prepare(
    "SELECT id, name FROM categories WHERE name = ?",
  )
    .bind(name)
    .first()

  if (!category) {
    const now = new Date().toISOString()

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    category = { id: crypto.randomUUID(), name }

    await env.DB.prepare(`
      INSERT INTO categories (id, name, slug, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?)
    `)
      .bind(category.id, name, slug, now, now)
      .run()
  }

  return category
}

const replaceProductImages = async (
  env,
  productId,
  retainedImages,
  files,
) => {
  const retained = retainedImages.filter(
    (image) =>
      typeof image === "string" &&
      !image.startsWith("data:") &&
      !image.startsWith("/api/images/"),
  )

  if (files.length > 10)
    throw new Error("A maximum of 10 product images can be uploaded.")

  for (const file of files) {
    if (
      file.size > 1_400_000 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      throw new Error("Upload compressed JPG, PNG, or WEBP images under 1.4 MB each.")
    }
  }

  const uploadedImages = await Promise.all(
    files.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ""

      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
      }

      return `data:${file.type};base64,${btoa(binary)}`
    }),
  )

  const now = new Date().toISOString()
  const imagePaths = [...retained, ...uploadedImages]
  const statements = [
    env.DB.prepare("DELETE FROM product_images WHERE product_id = ?").bind(
      productId,
    ),
  ]

  for (const [index, image] of imagePaths.entries()) {
    statements.push(
      env.DB.prepare(`
      INSERT INTO product_images (id, product_id, image_path, sort_order, created_at) VALUES (?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), productId, image, index, now),
    )
  }

  await env.DB.batch(statements)
}

const ensureRateLimit = (requestKey) => {
  const now = Date.now()

  const record = RATE_LIMIT_STORE.get(requestKey) || {
    count: 0,
    resetAt: now + RATE_LIMIT_WINDOW_MS,
  }

  if (now > record.resetAt) {
    record.count = 0

    record.resetAt = now + RATE_LIMIT_WINDOW_MS
  }

  record.count += 1

  RATE_LIMIT_STORE.set(requestKey, record)

  return record.count <= REQUEST_LIMIT
}

const getRateLimitKey = (request) => {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown"

  const path = new URL(request.url).pathname

  return `${ip}:${path}`
}

const sanitizeString = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback

  return String(value).trim()
}

const normalizeStatus = (status, valid, fallback) => {
  return valid.includes(status) ? status : fallback
}

const buildPublicProduct = (row, categoryName = "") => ({
  id: row.id,

  name: row.name,

  slug: row.slug,

  description: row.description || "",

  category: categoryName || "",

  price: Number(row.price || 0),

  salePrice: row.sale_price ? Number(row.sale_price) : undefined,

  availability: row.availability || "available",

  featured: Boolean(row.featured),

  images: Array.isArray(row.images) ? row.images : [],

  sizes: JSON.parse(row.sizes || "[]"),

  colours: JSON.parse(row.colours || "[]"),

  notes: row.notes || "",

  createdAt: row.created_at,

  updatedAt: row.updated_at,
})

const proxyD1Error = (error) => {
  console.error("[Worker][DB]", error)

  return json(
    { success: false, error: "The request could not be processed." },
    { status: 500 },
  )
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === "OPTIONS") {
      return withCors(
        new Response(null, { status: 204 }),

        request,

        env,
      )
    }

    if (!url.pathname.startsWith("/api/") && env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    if (!env.DB) {
      return withCors(
        json(
          { success: false, error: "Cloudflare D1 is not configured yet." },
          { status: 503 },
        ),

        request,

        env,
      )
    }

    const rateKey = getRateLimitKey(request)

    const publicWriteRoutes = [
      "/api/orders",
      "/api/messages",
      "/api/admin/login",
    ]

    if (publicWriteRoutes.includes(url.pathname) && !ensureRateLimit(rateKey)) {
      return withCors(
        json(
          {
            success: false,
            error: "Too many requests. Please try again shortly.",
          },
          { status: 429 },
        ),

        request,

        env,
      )
    }

    if (url.pathname === "/api/health") {
      return withCors(
        json({ status: "ok", service: "cloudflare-worker" }),
        request,
        env,
      )
    }

    if (url.pathname.startsWith("/api/images/")) {
      return withCors(
        json({ success: false, error: "Image not found." }, { status: 404 }),
        request,
        env,
      )
    }

    if (url.pathname === "/api/categories") {
      try {
        const rows = await env.DB.prepare(
          "SELECT * FROM categories WHERE status = ? ORDER BY name ASC",
        )
          .bind("active")
          .all()

        return withCors(
          json(
            rows.results.map((row) => ({
              id: row.id,
              name: row.name,
              slug: row.slug,
              status: row.status,
              parentId: row.parent_id || null,
            })),
          ),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (
      url.pathname === "/api/settings/public" ||
      url.pathname === "/api/settings"
    ) {
      try {
        const row = await env.DB.prepare("SELECT * FROM settings WHERE id = ?")
          .bind("main")
          .first()

        const payload = row || {}

        return withCors(
          json({
            businessName: payload.business_name || "Panda Closet",

            whatsappNumber: "+265888131243",

            phoneNumber: payload.phone || "",

            email: payload.email || "hello@pandacloset.com",

            instagramUrl: payload.instagram_url || "",

            facebookUrl: payload.facebook_url || "",

            tiktokUrl: payload.tiktok_url || "",

            location: payload.location || "",

            defaultWhatsappMessage:
              payload.default_whatsapp_message ||
              "Hello Panda Closet, I would like to enquire about ordering this piece.",

            currency: payload.currency || "MWK",

            currencySymbol: payload.currency_symbol || "K",

            businessDescription:
              payload.business_description ||
              "Minimal tailoring, crafted for everyday confidence.",
          }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/products") {
      try {
        const rows = await env.DB.prepare(`
          SELECT p.*, c.name AS category_name
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.status = 'published' AND p.availability != 'hidden'
          ORDER BY p.featured DESC, p.created_at DESC
        `).all()

        const products = await Promise.all(
          rows.results.map(async (row) => {
            const images = await getProductImages(env, row.id)

            return buildPublicProduct({ ...row, images }, row.category_name)
          }),
        )

        return withCors(json(products), request, env)
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname.startsWith("/api/products/")) {
      const slug = url.pathname.split("/").filter(Boolean).pop()

      try {
        const row = await env.DB.prepare(`
          SELECT p.*, c.name AS category_name
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.slug = ? AND p.status = 'published' AND p.availability != 'hidden'
        `)
          .bind(slug)
          .first()

        if (!row) {
          return withCors(
            json({ success: false, error: "Product not found." }, {
              status: 404,
            }),
            request,
            env,
          )
        }

        const images = await getProductImages(env, row.id)

        return withCors(
          json(buildPublicProduct({ ...row, images }, row.category_name)),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/orders" && request.method === "POST") {
      try {
        const body = await parseJsonBody(request)

        const customerName = sanitizeString(
          body.customerName || body.customer_name,
        )

        const phone = sanitizeString(body.phone)

        const whatsapp = sanitizeString(body.whatsapp)

        const productId = sanitizeString(body.productId || body.product_id)

        const productSlug = sanitizeString(
          body.productSlug || body.product_slug,
        )

        const productName = sanitizeString(
          body.productName ||
            body.product_name ||
            body.productNameSnapshot ||
            "",
        )

        const quantity = Number(body.quantity || 1)

        if (
          !customerName ||
          !/^0\d{9}$/.test(phone) ||
          (whatsapp && !/^0\d{9}$/.test(whatsapp)) ||
          (!productId && !productSlug) ||
          !Number.isInteger(quantity) ||
          quantity < 1
        ) {
          return withCors(
            json(
              {
                success: false,
                error: "Please complete the required order fields.",
              },
              { status: 400 },
            ),
            request,
            env,
          )
        }

        const productRow = productId
          ? await env.DB.prepare("SELECT * FROM products WHERE id = ?")
              .bind(productId)
              .first()
          : await env.DB.prepare("SELECT * FROM products WHERE slug = ?")
              .bind(productSlug)
              .first()

        if (!productRow) {
          return withCors(
            json({ success: false, error: "Product not found." }, { status: 404 }),
            request,
            env,
          )
        }

        if (
          productRow.status !== "published" ||
          !["available", "made-to-order"].includes(productRow.availability)
        ) {
          return withCors(
            json(
              { success: false, error: "This product is not available for ordering." },
              { status: 400 },
            ),
            request,
            env,
          )
        }

        if (!sanitizeString(body.colour)) {
          return withCors(
            json({ success: false, error: "Please select a colour." }, { status: 400 }),
            request,
            env,
          )
        }

        const resolvedName = productRow?.name || productName

        const orderNumber = `PC-${new Date().getFullYear()}-${String((await env.DB.prepare("SELECT COUNT(*) AS count FROM orders WHERE strftime('%Y', created_at) = ?").bind(String(new Date().getFullYear())).first()).count + 1).padStart(4, "0")}`

        const now = new Date().toISOString()

        const orderId = crypto.randomUUID()

        await env.DB.prepare(`
          INSERT INTO orders (
            id, order_number, customer_name, phone, whatsapp, email, location,
            product_id, product_name_snapshot, product_slug, size, colour, quantity, contact_preference,
            notes, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            orderId,

            orderNumber,

            customerName,

            phone,

            whatsapp,

            sanitizeString(body.email),

            sanitizeString(body.location),

            productRow?.id || productId || crypto.randomUUID(),

            resolvedName,

            productSlug || productRow?.slug || "",

            sanitizeString(body.size),

            sanitizeString(body.colour),

            quantity,

            sanitizeString(
              body.contactPreference || body.contact_preference || "whatsapp",
              "whatsapp",
            ),

            sanitizeString(body.notes),

            "new",

            now,

            now,
          )
          .run()

        return withCors(
          json(
            {
              success: true,

              order_number: orderNumber,

              orderNumber,

              message: "Order request received.",

              order: {
                id: orderId,

                orderNumber,

                customerName,

                phone,

                whatsapp: whatsapp || phone,

                email: sanitizeString(body.email),

                location: sanitizeString(body.location),

                productId: productRow?.id || productId,

                productName: resolvedName,

                productSlug: productSlug || productRow?.slug || "",

                size: sanitizeString(body.size),

                colour: sanitizeString(body.colour),

                quantity,

                notes: sanitizeString(body.notes),

                contactPreference: sanitizeString(
                  body.contactPreference ||
                    body.contact_preference ||
                    "whatsapp",
                  "whatsapp",
                ),

                status: "new",

                createdAt: now,

                updatedAt: now,
              },
            },
            { status: 201 },
          ),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/messages" && request.method === "POST") {
      try {
        const body = await parseJsonBody(request)

        const name = sanitizeString(body.name)

        const message = sanitizeString(body.message)

        if (!name || !message) {
          return withCors(
            json(
              {
                success: false,
                error: "Please provide your name and message.",
              },
              { status: 400 },
            ),
            request,
            env,
          )
        }

        const id = crypto.randomUUID()

        await env.DB.prepare(`
          INSERT INTO messages (id, name, phone, email, message, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            id,
            name,
            sanitizeString(body.phone),
            sanitizeString(body.email),
            message,
            "unread",
            new Date().toISOString(),
          )
          .run()

        return withCors(
          json({ success: true, id, message: "Message received." }, {
            status: 201,
          }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      try {
        const body = await parseJsonBody(request)

        const email = sanitizeString(body.email).toLowerCase()

        const password = sanitizeString(body.password)

        const admin = await env.DB.prepare(
          "SELECT * FROM admins WHERE email = ?",
        )
          .bind(email)
          .first()

        if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
          return withCors(
            json({ success: false, error: "Invalid email or password." }, {
              status: 401,
            }),
            request,
            env,
          )
        }

        const sessionId = crypto.randomUUID()

        const now = new Date()

        const expiresAt = new Date(
          now.getTime() + ADMIN_SESSION_TTL_SECONDS * 1000,
        ).toISOString()

        await env.DB.prepare(`
          INSERT INTO admin_sessions (id, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)
        `)
          .bind(sessionId, admin.id, expiresAt, now.toISOString())
          .run()

        const response = withCors(
          json({
            success: true,
            message: "Login successful.",
            admin: { email: admin.email, name: admin.name },
          }),
          request,
          env,
        )

        response.headers.set(
          "Set-Cookie",
          serializeCookie(SESSION_COOKIE, sessionId, {
            httpOnly: true,
            secure: url.protocol === "https:",
            sameSite: "Lax",
            path: "/",
            maxAge: ADMIN_SESSION_TTL_SECONDS,
          }),
        )

        return response
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/admin/create" && request.method === "POST") {
      const authorization = request.headers.get("Authorization") || ""

      if (
        !env.ADMIN_SETUP_TOKEN ||
        authorization !== `Bearer ${env.ADMIN_SETUP_TOKEN}`
      ) {
        return withCors(
          json({ success: false, error: "Admin setup is not authorized." }, {
            status: 401,
          }),
          request,
          env,
        )
      }

      try {
        const count = await env.DB.prepare(
          "SELECT COUNT(*) AS count FROM admins",
        ).first()

        if (count.count > 0) {
          return withCors(
            json(
              { success: false, error: "An admin account already exists." },
              { status: 409 },
            ),
            request,
            env,
          )
        }

        const body = await parseJsonBody(request)

        const email = sanitizeString(body.email).toLowerCase()

        const password = String(body.password || "")

        const name = sanitizeString(body.name, "Admin")

        if (!email.includes("@") || password.length < 12) {
          return withCors(
            json(
              {
                success: false,
                error:
                  "Provide a valid email and a password of at least 12 characters.",
              },
              { status: 400 },
            ),
            request,
            env,
          )
        }

        await env.DB.prepare(`
          INSERT INTO admins (id, email, password_hash, name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
          .bind(
            crypto.randomUUID(),
            email,
            await bcrypt.hash(password, 12),
            name,
            new Date().toISOString(),
            new Date().toISOString(),
          )
          .run()

        return withCors(
          json({ success: true, message: "Initial admin created." }, {
            status: 201,
          }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/admin/logout" && request.method === "POST") {
      const session = await getSessionFromRequest(request, env)

      if (session) {
        await env.DB.prepare("DELETE FROM admin_sessions WHERE id = ?")
          .bind(session.id)
          .run()
      }

      const response = withCors(
        json({ success: true, message: "Logged out." }),
        request,
        env,
      )

      response.headers.set(
        "Set-Cookie",
        serializeCookie(SESSION_COOKIE, "", {
          httpOnly: true,
          secure: url.protocol === "https:",
          sameSite: "Lax",
          path: "/",
          maxAge: 0,
        }),
      )

      return response
    }

    const adminSession = await getSessionFromRequest(request, env)

    if (url.pathname.startsWith("/api/admin") && !adminSession) {
      return withCors(
        json({ success: false, error: "Authentication required." }, {
          status: 401,
        }),
        request,
        env,
      )
    }

    if (url.pathname === "/api/admin/session") {
      return withCors(
        json({
          authenticated: true,
          admin: { email: adminSession.adminEmail, name: "Admin" },
        }),
        request,
        env,
      )
    }

    if (url.pathname === "/api/admin/categories" && request.method === "GET") {
      try {
        const rows = await env.DB.prepare(
          "SELECT * FROM categories ORDER BY name ASC",
        ).all()

        return withCors(
          json(
            rows.results.map((row) => ({
              id: row.id,
              name: row.name,
              slug: row.slug,
              status: row.status,
              parentId: row.parent_id || null,
            })),
          ),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/admin/products" && request.method === "GET") {
      try {
        const rows = await env.DB.prepare(`
          SELECT p.*, c.name AS category_name
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          ORDER BY p.updated_at DESC
        `).all()

        const products = await Promise.all(
          rows.results.map(async (row) => {
            const images = await getProductImages(env, row.id)

            return {
              ...buildPublicProduct({ ...row, images }, row.category_name),

              categoryId: row.category_id,

              status: row.status,
            }
          }),
        )

        return withCors(json(products), request, env)
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/admin/products" && request.method === "POST") {
      let createdProductId = ""
      try {
        const { product, files } = await parseProductForm(request)

        const name = sanitizeString(product.name)

        if (!name)
          return withCors(
            json({ success: false, error: "Product name is required." }, {
              status: 400,
            }),
            request,
            env,
          )

        const category = await getOrCreateCategory(env, product.category)

        const productId = crypto.randomUUID()
        createdProductId = productId

        const now = new Date().toISOString()

        const slug = sanitizeString(product.slug, name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")

        const price = Number(product.price || 0)

        await env.DB.prepare(`
          INSERT INTO products (
            id, name, slug, description, category_id, price, sale_price, availability,
            featured, status, sizes, colours, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            productId,
            name,
            slug,
            sanitizeString(product.description),
            category.id,

            Number.isFinite(price) ? price : 0,

            product.salePrice ? Number(product.salePrice) : null,

            normalizeStatus(
              product.availability,
              ["available", "made-to-order", "sold-out", "hidden"],
              "available",
            ),

            product.featured ? 1 : 0,

            product.status === "hidden" ? "hidden" : "published",

            JSON.stringify(Array.isArray(product.sizes) ? product.sizes : []),

            JSON.stringify(
              Array.isArray(product.colours) ? product.colours : [],
            ),

            sanitizeString(product.notes),
            now,
            now,
          )
          .run()

        await replaceProductImages(
          env,
          productId,
          Array.isArray(product.images) ? product.images : [],
          files,
        )

        return withCors(
          json({ success: true, productId, message: "Product created." }, {
            status: 201,
          }),
          request,
          env,
        )
      } catch (error) {
        console.error("[Worker][Product create]", error)

        if (createdProductId) {
          await env.DB.prepare("DELETE FROM products WHERE id = ?")
            .bind(createdProductId)
            .run()
            .catch(() => {})
        }

        return withCors(
          json({ success: false, error: "Unable to create product." }, {
            status: 500,
          }),
          request,
          env,
        )
      }
    }

    if (url.pathname === "/api/admin/categories" && request.method === "POST") {
      try {
        const payload = await parseJsonBody(request)

        const name = sanitizeString(payload.name)

        const parentId = sanitizeString(payload.parentId) || null

        if (!name)
          return withCors(
            json({ success: false, error: "Category name is required." }, {
              status: 400,
            }),
            request,
            env,
          )

        const parent = parentId
          ? await env.DB.prepare(
              "SELECT id, slug, parent_id FROM categories WHERE id = ?",
            )
              .bind(parentId)
              .first()
          : null

        if (parentId && !parent)
          return withCors(
            json({ success: false, error: "Parent category not found." }, {
              status: 400,
            }),
            request,
            env,
          )

        if (parent?.parent_id)
          return withCors(
            json(
              {
                success: false,
                error: "Subcategories cannot have subcategories.",
              },
              { status: 400 },
            ),
            request,
            env,
          )

        const baseSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")

        const slug = parent ? `${parent.slug}-${baseSlug}` : baseSlug

        if (!slug)
          return withCors(
            json(
              {
                success: false,
                error: "Category name must contain letters or numbers.",
              },
              { status: 400 },
            ),
            request,
            env,
          )

        const duplicate = await env.DB.prepare(
          "SELECT id FROM categories WHERE slug = ?",
        )
          .bind(slug)
          .first()

        if (duplicate)
          return withCors(
            json(
              {
                success: false,
                error:
                  "A category with this name already exists under that parent.",
              },
              { status: 409 },
            ),
            request,
            env,
          )

        const id = crypto.randomUUID()

        const now = new Date().toISOString()

        await env.DB.prepare(`
          INSERT INTO categories (id, name, slug, parent_id, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'active', ?, ?)
        `)
          .bind(id, name, slug, parentId, now, now)
          .run()

        return withCors(
          json(
            {
              success: true,
              category: { id, name, slug, status: "active", parentId },
            },
            { status: 201 },
          ),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (
      url.pathname.startsWith("/api/admin/categories/") &&
      request.method === "PUT"
    ) {
      try {
        const id = decodeURIComponent(url.pathname.split("/").pop() || "")

        const existing = await env.DB.prepare(
          "SELECT * FROM categories WHERE id = ?",
        )
          .bind(id)
          .first()

        if (!existing)
          return withCors(
            json({ success: false, error: "Category not found." }, {
              status: 404,
            }),
            request,
            env,
          )

        const payload = await parseJsonBody(request)

        const name = sanitizeString(payload.name, existing.name)

        const parent = existing.parent_id
          ? await env.DB.prepare("SELECT slug FROM categories WHERE id = ?")
              .bind(existing.parent_id)
              .first()
          : null

        const baseSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")

        const slug = parent ? `${parent.slug}-${baseSlug}` : baseSlug

        const status = normalizeStatus(
          payload.status,
          ["active", "hidden"],
          existing.status,
        )

        const duplicate = await env.DB.prepare(
          "SELECT id FROM categories WHERE slug = ? AND id != ?",
        )
          .bind(slug, id)
          .first()

        if (duplicate)
          return withCors(
            json(
              {
                success: false,
                error:
                  "A category with this name already exists under that parent.",
              },
              { status: 409 },
            ),
            request,
            env,
          )

        await env.DB.prepare(
          "UPDATE categories SET name = ?, slug = ?, status = ?, updated_at = ? WHERE id = ?",
        )

          .bind(name, slug, status, new Date().toISOString(), id)
          .run()

        return withCors(
          json({ success: true, message: "Category updated." }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (
      url.pathname.startsWith("/api/admin/categories/") &&
      request.method === "DELETE"
    ) {
      try {
        const id = decodeURIComponent(url.pathname.split("/").pop() || "")

        const category = await env.DB.prepare(
          "SELECT id, parent_id FROM categories WHERE id = ?",
        )
          .bind(id)
          .first()

        if (!category)
          return withCors(
            json({ success: false, error: "Category not found." }, {
              status: 404,
            }),
            request,
            env,
          )

        const childRows = category.parent_id
          ? { results: [] }
          : await env.DB.prepare(
              "SELECT id FROM categories WHERE parent_id = ?",
            )
              .bind(id)
              .all()

        const ids = [id, ...childRows.results.map((row) => row.id)]

        const statements = ids.flatMap((categoryId) => [
          env.DB.prepare(
            "UPDATE products SET category_id = NULL WHERE category_id = ?",
          ).bind(categoryId),

          env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(
            categoryId,
          ),
        ])

        await env.DB.batch(statements)

        return withCors(
          json({
            success: true,
            message: "Category and its subcategories deleted.",
          }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (
      url.pathname.startsWith("/api/admin/products/") &&
      request.method === "PUT"
    ) {
      try {
        const productId = decodeURIComponent(
          url.pathname.split("/").pop() || "",
        )

        const existing = await env.DB.prepare(
          "SELECT * FROM products WHERE id = ?",
        )
          .bind(productId)
          .first()

        if (!existing)
          return withCors(
            json({ success: false, error: "Product not found." }, {
              status: 404,
            }),
            request,
            env,
          )

        const { product, files } = await parseProductForm(request)

        const name = sanitizeString(product.name, existing.name)

        const category = await getOrCreateCategory(env, product.category)

        const slug = sanitizeString(product.slug, name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")

        const price = Number(product.price ?? existing.price)

        const now = new Date().toISOString()

        await env.DB.prepare(`
          UPDATE products SET
            name = ?, slug = ?, description = ?, category_id = ?, price = ?, sale_price = ?, availability = ?,
            featured = ?, status = ?, sizes = ?, colours = ?, notes = ?, updated_at = ?
          WHERE id = ?
        `)
          .bind(
            name,
            slug,
            sanitizeString(product.description, existing.description),
            category.id,

            Number.isFinite(price) ? price : existing.price,

            product.salePrice ? Number(product.salePrice) : null,

            normalizeStatus(
              product.availability,
              ["available", "made-to-order", "sold-out", "hidden"],
              existing.availability,
            ),

            product.featured ? 1 : 0,

            product.status === "hidden" ? "hidden" : "published",

            JSON.stringify(
              Array.isArray(product.sizes)
                ? product.sizes
                : JSON.parse(existing.sizes || "[]"),
            ),

            JSON.stringify(
              Array.isArray(product.colours)
                ? product.colours
                : JSON.parse(existing.colours || "[]"),
            ),

            sanitizeString(product.notes, existing.notes),
            now,
            productId,
          )
          .run()

        const previousImages = await getProductImages(env, productId)

        await replaceProductImages(
          env,
          productId,
          Array.isArray(product.images) ? product.images : previousImages,
          files,
        )

        return withCors(
          json({ success: true, message: "Product updated." }),
          request,
          env,
        )
      } catch (error) {
        console.error("[Worker][Product update]", error)

        return withCors(
          json({ success: false, error: "Unable to update product." }, {
            status: 400,
          }),
          request,
          env,
        )
      }
    }

    if (
      url.pathname.startsWith("/api/admin/products/") &&
      request.method === "DELETE"
    ) {
      try {
        const productId = decodeURIComponent(
          url.pathname.split("/").pop() || "",
        )

        const existing = await env.DB.prepare(
          "SELECT id FROM products WHERE id = ?",
        )
          .bind(productId)
          .first()

        if (!existing)
          return withCors(
            json({ success: false, error: "Product not found." }, {
              status: 404,
            }),
            request,
            env,
          )

        await env.DB.prepare("DELETE FROM product_images WHERE product_id = ?")
          .bind(productId)
          .run()

        await env.DB.prepare("DELETE FROM products WHERE id = ?")
          .bind(productId)
          .run()

        return withCors(
          json({ success: true, message: "Product deleted." }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/admin/orders" && request.method === "GET") {
      try {
        const rows = await env.DB.prepare(
          "SELECT * FROM orders ORDER BY created_at DESC",
        ).all()

        return withCors(
          json(
            rows.results.map((row) => ({
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
          ),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (
      url.pathname.startsWith("/api/admin/orders/") &&
      request.method === "PUT"
    ) {
      try {
        const id = decodeURIComponent(url.pathname.split("/").pop() || "")

        const payload = await parseJsonBody(request)

        const status = normalizeStatus(
          payload.status,
          ["new", "contacted", "confirmed", "completed", "cancelled"],
          "new",
        )

        const result = await env.DB.prepare(
          "UPDATE orders SET status = ?, updated_at = ? WHERE id = ?",
        )

          .bind(status, new Date().toISOString(), id)
          .run()

        if (!result.meta.changes)
          return withCors(
            json({ success: false, error: "Order not found." }, {
              status: 404,
            }),
            request,
            env,
          )

        return withCors(
          json({ success: true, message: "Order status updated." }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/admin/messages" && request.method === "GET") {
      try {
        const rows = await env.DB.prepare(
          "SELECT * FROM messages ORDER BY created_at DESC",
        ).all()

        return withCors(
          json(
            rows.results.map((row) => ({
              id: row.id,

              name: row.name,

              phone: row.phone,

              email: row.email,

              message: row.message,

              status: row.status,

              createdAt: row.created_at,
            })),
          ),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (
      url.pathname.startsWith("/api/admin/messages/") &&
      request.method === "PUT"
    ) {
      try {
        const id = decodeURIComponent(url.pathname.split("/").pop() || "")

        const payload = await parseJsonBody(request)

        const status = normalizeStatus(
          payload.status,
          ["unread", "read", "responded"],
          "unread",
        )

        const result = await env.DB.prepare(
          "UPDATE messages SET status = ? WHERE id = ?",
        )
          .bind(status, id)
          .run()

        if (!result.meta.changes)
          return withCors(
            json({ success: false, error: "Message not found." }, {
              status: 404,
            }),
            request,
            env,
          )

        return withCors(
          json({ success: true, message: "Message updated." }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/admin/settings" && request.method === "GET") {
      try {
        const row = await env.DB.prepare("SELECT * FROM settings WHERE id = ?")
          .bind("main")
          .first()

        return withCors(
          json({
            businessName: row.business_name,

            whatsappNumber: "+265888131243",

            phoneNumber: row.phone,

            email: row.email,

            adminEmail: row.admin_email,

            instagramUrl: row.instagram_url,

            facebookUrl: row.facebook_url,

            tiktokUrl: row.tiktok_url,

            logoPath: row.logo_path,

            businessDescription: row.business_description,

            location: row.location,

            defaultWhatsappMessage: row.default_whatsapp_message,

            currency: row.currency,

            currencySymbol: row.currency_symbol,
          }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (url.pathname === "/api/admin/settings" && request.method === "PUT") {
      try {
        const payload = await parseJsonBody(request)

        await env.DB.prepare(`
          UPDATE settings SET
            business_name = ?, whatsapp_number = ?, phone = ?, email = ?, admin_email = ?,
            instagram_url = ?, facebook_url = ?, tiktok_url = ?, logo_path = ?, business_description = ?,
            location = ?, default_whatsapp_message = ?, currency = ?, currency_symbol = ?, updated_at = ?
          WHERE id = ?
        `)
          .bind(
            sanitizeString(payload.businessName, "Panda Closet"),

            sanitizeString(payload.whatsappNumber),

            sanitizeString(payload.phoneNumber),

            sanitizeString(payload.email, "hello@pandacloset.com"),

            sanitizeString(payload.adminEmail, "admin@pandacloset.com"),

            sanitizeString(payload.instagramUrl),

            sanitizeString(payload.facebookUrl),

            sanitizeString(payload.tiktokUrl),

            sanitizeString(payload.logoPath),

            sanitizeString(payload.businessDescription),

            sanitizeString(payload.location),

            sanitizeString(
              payload.defaultWhatsappMessage,
              "Hello Panda Closet, I would like to enquire about your clothing collection.",
            ),

            sanitizeString(payload.currency, "MWK"),

            sanitizeString(payload.currencySymbol, "K"),

            new Date().toISOString(),

            "main",
          )
          .run()

        return withCors(
          json({ success: true, message: "Settings updated." }),
          request,
          env,
        )
      } catch (error) {
        return proxyD1Error(error)
      }
    }

    if (!url.pathname.startsWith("/api/") && env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return withCors(
      json({ success: false, error: "Route not found." }, { status: 404 }),
      request,
      env,
    )
  },
}

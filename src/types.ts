/*
 * Purpose: Shared TypeScript contracts for products, orders, categories, settings, and admin session data.
 * Linked to: src/context/store.tsx, src/pages/*, and the UI components that consume app data.
 * Note: This file keeps the frontend types aligned with the backend payload structure.
 */
export type Availability = "available" | "made-to-order" | "sold-out" | "hidden"
export type OrderStatus = "new" | "contacted" | "confirmed" | "completed" | "cancelled"
export type MessageStatus = "unread" | "read" | "responded"
export type CategoryStatus = "active" | "hidden"

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: string
  price: number
  salePrice?: number
  availability: Availability
  featured: boolean
  images: string[]
  sizes: string[]
  colours: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  whatsapp?: string
  email?: string
  location?: string
  productId: string
  productName: string
  productSlug: string
  size?: string
  colour?: string
  quantity: number
  notes?: string
  contactPreference: "whatsapp" | "phone"
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  name: string
  phone?: string
  email?: string
  message: string
  status: MessageStatus
  createdAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  status: CategoryStatus
  /** Reference to the parent category id. `null` (or omitted) = a top-level category such as Men/Women/Kids/Unisex. */
  parentId?: string | null
  /** Ordered subcategory names for top-level categories (e.g. Men: Suits, Trousers, Jackets, Shirts). */
  subcategories?: string[]
}

export interface Settings {
  businessName: string
  whatsappNumber: string
  phoneNumber: string
  email: string
  adminEmail: string
  instagramUrl: string
  facebookUrl: string
  tiktokUrl: string
  location: string
  defaultWhatsappMessage: string
  currency: string
  currencySymbol: string
  businessDescription: string
}

export interface AdminUser {
  email: string
  loggedIn: boolean
}

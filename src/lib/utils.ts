/*
 * Purpose: Shared helper methods for pricing, order numbers, WhatsApp links, and formatting.
 * Linked to: src/pages/*, src/components/*, and the store logic used across the storefront and admin panels.
 * Note: This file is reused throughout the system and should be kept lightweight and consistent.
 */
import type { Availability, AvailabilityChoice, Settings } from "../types"

export const BUSINESS_WHATSAPP_NUMBER = "0888131243"
export const BUSINESS_PHONE_NUMBER = "+265888131243"
export const BUSINESS_EMAIL = "pandacloset02@gmail.com"
export const BUSINESS_LOCATION = "Blantyre, Malawi"

export function formatPrice(amount: number, settings: Settings): string {
  return `${settings.currencySymbol}${amount.toLocaleString()}`
}

export function generateOrderNumber(existingCount: number): string {
  const year = new Date().getFullYear()
  const num = String(existingCount + 1).padStart(4, "0")
  return `PC-${year}-${num}`
}

export function normalizeLocalPhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  // Convert a +265 country-code number to the local 0-prefixed format,
  // e.g. +265987414840 -> 0987414840
  if (digits.startsWith("265") && digits.length > 10) return `0${digits.slice(3)}`
  // Keep the value as-is so validation can flag anything that is not exactly
  // 10 digits. Never silently truncate a too-long number here.
  return digits
}

export function isValidLocalPhone(value: string): boolean {
  const digits = normalizeLocalPhone(value)
  return digits.length === 10 && /^0\d{9}$/.test(digits)
}

export function toWhatsAppInternationalNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("0")) return `265${digits.slice(1)}`
  if (digits.startsWith("265")) return digits
  if (digits.startsWith("+265")) return digits.replace(/^\+/, "")
  return digits
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = toWhatsAppInternationalNumber(phone)
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

export type WhatsAppMessageContext = {
  productName?: string
  size?: string
  colour?: string
  orderNumber?: string
  customerName?: string
  enquiryType?: string
}

export function customizeWhatsAppMessage(
  template: string,
  context: WhatsAppMessageContext = {},
): string {
  const keys = Object.keys(context) as (keyof WhatsAppMessageContext)[]
  const message = template
    .replace(
      /\{(productName|size|colour|orderNumber|customerName|enquiryType)\}/g,
      (_, key: keyof WhatsAppMessageContext) => context[key] || "",
    )
    .trim()
  const details = keys
    .filter((key) => context[key]?.trim() && !template.includes(`{${key}}`))
    .map(
      (key) =>
        `${key === "enquiryType" ? "" : `${key[0].toUpperCase()}${key.slice(1)}: `}${context[key]}`,
    )

  return [message, ...details].filter(Boolean).join("\n")
}

export type OrderWhatsAppMessageOptions = {
  businessName: string
  orderNumber: string
  customerName: string
  phone: string
  whatsapp?: string
  email?: string
  location?: string
  productName: string
  productCategory?: string
  productPrice?: string
  size?: string
  colour?: string
  quantity: number
  notes?: string
}

/**
 * Builds the lively, pre-filled WhatsApp message a customer sends with their
 * order. It carries the full order details (order number, product, size,
 * colour, quantity, customer, location, phone and any notes) plus an estimated
 * cost. No image URL and no preferred-contact line are included.
 */
export function buildOrderWhatsAppMessage(
  options: OrderWhatsAppMessageOptions,
): string {
  const lines: string[] = [
    `✨ *NEW ORDER - ${options.businessName || "Panda Closet"}* ✨`,
    "",
    `🧾 *Order #:* ${options.orderNumber}`,
    "",
    options.productCategory
      ? `🛍️ *Product:* ${options.productName} (${options.productCategory})`
      : `🛍️ *Product:* ${options.productName}`,
  ]

  if (options.productPrice) {
    lines.push(`💰 *Price:* ${options.productPrice} (Estimated Cost)`)
  }

  lines.push(
    `📏 *Size:* ${options.size || "Not specified"}`,
    `🎨 *Colour:* ${options.colour || "Not specified"}`,
    `🔢 *Quantity:* ${options.quantity}`,
    "",
    `👤 *Customer:* ${options.customerName}`,
  )

  if (options.location) lines.push(`📍 *Location:* ${options.location}`)

  lines.push(`📞 *Phone:* ${options.phone}`)
  if (options.whatsapp) lines.push(`📱 *WhatsApp:* ${options.whatsapp}`)
  if (options.email) lines.push(`✉️ *Email:* ${options.email}`)
  if (options.notes) lines.push(`📝 *Notes:* ${options.notes}`)
  lines.push("", "🙏 Please review and confirm my order. Thank you!")

  return lines.join("\n")
}

export function orderFollowUpMessage(orderNumber: string): string {
  return `Hello Panda Closet, I submitted order request ${orderNumber} and would like to follow up.`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  available: "Available",
  "made-to-order": "Made to Order",
  "available-and-made-to-order": "Available + Made to Order",
  "sold-out": "Sold Out",
  hidden: "Hidden",
}

export function availabilityIncludes(
  availability: Availability,
  choice: AvailabilityChoice,
): boolean {
  if (availability === "available-and-made-to-order")
    return choice === "available" || choice === "made-to-order"
  return availability === choice
}

export function isOrderableAvailability(availability: Availability): boolean {
  return (
    availabilityIncludes(availability, "available") ||
    availabilityIncludes(availability, "made-to-order")
  )
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
}

/**
 * Standard notes that are always shown on the order form for every outfit.
 * Admins can add extra per-product notes, but these two are always present.
 */
export const DEFAULT_ORDER_NOTES: string[] = [
  "Price may be adjusted if you choose to bring your own materials.",
  "Custom sizes can be ordered. Custom-made pieces may attract different pricing.",
]
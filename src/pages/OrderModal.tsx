/*
 * Purpose: Order request modal used when a customer submits a product enquiry.
 * Linked to: src/pages/Product.tsx, src/lib/api.ts, and the order submission backend endpoint.
 * Note: This is the critical customer ordering workflow for the store.
 */
import { useState } from "react"
import { useNavigate } from "react-router"
import type { Product } from "../types"
import { useStore } from "../context/store"
import { API_BASE_URL } from "../lib/api"
import {
  generateId,
  DEFAULT_ORDER_NOTES,
  normalizeLocalPhone,
  isValidLocalPhone,
  formatPrice,
  buildWhatsAppUrl,
  buildOrderWhatsAppMessage,
  colourHex,
} from "../lib/utils"

interface Props {
  product: Product
  preselectedSize: string
  preselectedCustomSize?: string
  preselectedColour: string
  onClose: () => void
}

export default function OrderModal({
  product,
  preselectedSize,
  preselectedCustomSize = "",
  preselectedColour,
  onClose,
}: Props) {
  const { addOrder, settings } = useStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    whatsapp: "",
    location: "",
    size: preselectedSize || (product.sizes[0] ?? ""),
    customSize: preselectedCustomSize,
    colour: preselectedColour || "",
    quantity: 1,
    notes: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const set = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: "" }))
    setSubmitError("")
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.customerName.trim()) e.customerName = "Please enter your name."
    const cleanPhone = normalizeLocalPhone(form.phone)
    const cleanWhatsapp = normalizeLocalPhone(form.whatsapp)

    if (!cleanPhone) {
      e.phone = "Please enter your phone number."
    } else if (cleanPhone.length > 10) {
      e.phone = `Phone number cannot be more than 10 digits (you entered ${cleanPhone.length}).`
    } else if (cleanPhone.length < 10) {
      e.phone = `Phone number must be exactly 10 digits (you entered ${cleanPhone.length}).`
    } else if (!isValidLocalPhone(cleanPhone)) {
      e.phone = "Phone number must start with 0 (e.g. 0990000000)."
    }

    if (form.whatsapp.trim()) {
      if (cleanWhatsapp.length > 10) {
        e.whatsapp = `WhatsApp number cannot be more than 10 digits (you entered ${cleanWhatsapp.length}).`
      } else if (cleanWhatsapp.length < 10) {
        e.whatsapp = `WhatsApp number must be exactly 10 digits (you entered ${cleanWhatsapp.length}).`
      } else if (!isValidLocalPhone(cleanWhatsapp)) {
        e.whatsapp = "WhatsApp number must start with 0 (e.g. 0990000000)."
      }
    }
    if (product.sizes.length > 0 && !form.size) e.size = "Please select a size."
    if (form.size === "Custom" && !form.customSize.trim())
      e.customSize = "Please enter your custom size or measurements."
    if (!form.colour.trim()) e.colour = "Please select or enter a colour."
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    setSubmitError("")
    const userNote = form.notes.trim()
    const orderData = {
      id: generateId(),
      customerName: form.customerName,
      phone: normalizeLocalPhone(form.phone),
      whatsapp: normalizeLocalPhone(form.whatsapp || form.phone),
      location: form.location.trim() || undefined,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      size:
        form.size === "Custom"
          ? `Custom: ${form.customSize.trim()}`
          : form.size || undefined,
      colour: form.colour || undefined,
      quantity: form.quantity,
      notes: userNote || undefined,
      status: "new" as const,
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })
      const result = await response.json()
      if (!response.ok || !result.order)
        throw new Error(result.message || "Unable to submit your order.")

      const order = addOrder(result.order)

      // Lead the customer straight to WhatsApp with a pre-filled, editable
      // message containing the full order (product picture + all details) so
      // the business always receives the order even without logging in.
      const message = buildOrderWhatsAppMessage({
        businessName: settings.businessName,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        phone: order.phone,
        whatsapp: order.whatsapp,
        location: order.location,
        productName: order.productName,
        productCategory: product.category,
        productPrice: formatPrice(product.price, settings),
        size: order.size,
        colour: order.colour,
        quantity: order.quantity,
        notes: order.notes,
      })
      const whatsappUrl = buildWhatsAppUrl(settings.whatsappNumber, message)
      window.open(whatsappUrl, "_blank", "noopener,noreferrer")

      onClose()
      navigate(`/order-success?order=${order.orderNumber}`)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to submit your order. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-cream w-full sm:max-w-lg max-h-[95vh] overflow-y-auto sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-light sticky top-0 bg-cream z-10">
          <div>
            <h2 className="font-serif text-2xl text-ink">Order Request</h2>
            <p className="text-muted text-xs mt-0.5">
              Send us your details and we'll contact you to confirm.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-ink transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-5">
          {/* Product (read-only) */}
          <div className="bg-white border border-light px-4 py-3 flex items-center gap-3">
            {product.images[0] && (
              <img
                src={product.images[0]}
                alt=""
                className="w-12 h-16 object-cover shrink-0"
              />
            )}
            <div>
              <p className="text-xs text-muted tracking-wider uppercase">
                {product.category}
              </p>
              <p className="font-serif text-lg text-ink">{product.name}</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
              Full Name <span className="text-brown">*</span>
            </label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => set("customerName", e.target.value)}
              placeholder="Your name"
              className={`w-full bg-white border text-ink text-sm px-4 py-3 focus:outline-none transition-colors placeholder:text-muted ${
                errors.customerName
                  ? "border-red-400"
                  : "border-light focus:border-brown"
              }`}
            />
            {errors.customerName && (
              <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
              Phone Number <span className="text-brown">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", normalizeLocalPhone(e.target.value))}
              placeholder="0990000000"
              className={`w-full bg-white border text-ink text-sm px-4 py-3 focus:outline-none transition-colors placeholder:text-muted ${
                errors.phone
                  ? "border-red-400"
                  : "border-light focus:border-brown"
              }`}
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
            <p className="text-muted text-xs mt-1.5">
              10 digits starting with 0 (e.g. 0990000000).
            </p>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
              WhatsApp Number <span className="text-muted">(if different)</span>
            </label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", normalizeLocalPhone(e.target.value))}
              placeholder="0990000000"
              className={`w-full bg-white border text-ink text-sm px-4 py-3 focus:outline-none transition-colors placeholder:text-muted ${
                errors.whatsapp ? "border-red-400" : "border-light focus:border-brown"
              }`}
            />
            {errors.whatsapp && (
              <p className="text-red-500 text-xs mt-1">{errors.whatsapp}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="customer-location"
              className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2"
            >
              Location <span className="text-muted">(optional)</span>
            </label>
            <input
              id="customer-location"
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Area, town or city"
              className="w-full bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown transition-colors placeholder:text-muted"
            />
          </div>

          {/* Size */}
          {product.sizes.length > 0 && (
            <div>
              <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
                Size <span className="text-brown">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => set("size", s)}
                    className={`px-4 py-2 text-sm border transition-colors ${
                      form.size === s
                        ? "bg-ink text-white border-ink"
                        : "bg-white text-ink border-light hover:border-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {form.size === "Custom" && (
                <div className="mt-4">
                  <label
                    htmlFor="order-custom-size"
                    className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2"
                  >
                    Your custom size <span className="text-brown">*</span>
                  </label>
                  <input
                    id="order-custom-size"
                    type="text"
                    value={form.customSize}
                    onChange={(e) => set("customSize", e.target.value)}
                    placeholder="Enter your measurements or size"
                    className={`w-full bg-white border text-ink text-sm px-4 py-3 focus:outline-none transition-colors placeholder:text-muted ${
                      errors.customSize
                        ? "border-red-400"
                        : "border-light focus:border-brown"
                    }`}
                  />
                  {errors.customSize && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.customSize}
                    </p>
                  )}
                </div>
              )}
              {errors.size && (
                <p className="text-red-500 text-xs mt-1">{errors.size}</p>
              )}
            </div>
          )}

          {/* Colour */}
          <div>
            <label
              htmlFor="colour-input"
              className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2"
            >
              Colour <span className="text-brown">*</span>
            </label>
            {product.colours.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2" aria-label="Available colours">
                {product.colours.map((colour) => {
                  const hex = colourHex(colour)
                  return (
                    <button
                      type="button"
                      key={colour}
                      aria-pressed={form.colour === colour}
                      onClick={() => set("colour", colour)}
                      className={`inline-flex items-center gap-2 border px-3 py-2 text-sm transition-colors ${
                        form.colour === colour
                          ? "border-ink bg-ink text-white"
                          : "border-light bg-white text-ink hover:border-ink"
                      }`}
                    >
                      {hex ? (
                        <span
                          className="inline-block w-4 h-4 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: hex }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {colour}
                    </button>
                  )
                })}
              </div>
            )}
            <input
              id="colour-input"
              type="text"
              value={form.colour}
              onChange={(e) => set("colour", e.target.value)}
              aria-invalid={Boolean(errors.colour)}
              placeholder="Choose above or enter another colour, e.g. Ankara"
              className={`w-full bg-white border text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown transition-colors placeholder:text-muted ${
                errors.colour ? "border-red-400" : "border-light"
              }`}
            />
            <p className="text-muted text-xs mt-1.5">
              Select an available colour or enter a custom colour.
            </p>
            {errors.colour && (
              <p className="text-red-500 text-xs mt-1">{errors.colour}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set("quantity", Math.max(1, form.quantity - 1))}
                className="w-10 h-10 border border-light bg-white text-ink flex items-center justify-center text-lg hover:border-ink transition-colors"
              >
                −
              </button>
              <span className="text-ink font-medium w-8 text-center">
                {form.quantity}
              </span>
              <button
                type="button"
                onClick={() => set("quantity", form.quantity + 1)}
                className="w-10 h-10 border border-light bg-white text-ink flex items-center justify-center text-lg hover:border-ink transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
              Additional Notes
            </label>
            <ul className="mb-3 space-y-2 bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 leading-relaxed">
              {DEFAULT_ORDER_NOTES.map((note, index) => (
                <li key={index} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any special request, measurement note or question?"
              rows={3}
              className="w-full bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown transition-colors placeholder:text-muted resize-none"
            />
          </div>

          {Object.values(errors).some(Boolean) && (
            <p role="alert" className="text-red-600 text-sm">
              Please correct the highlighted fields above before sending.
            </p>
          )}

          {submitError && (
            <p role="alert" className="text-red-600 text-sm">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-cream text-xs font-medium tracking-[0.2em] uppercase py-4 hover:bg-ink-soft transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? "Sending..." : "Send Order Request"}
          </button>
        </form>
      </div>
    </div>
  )
}

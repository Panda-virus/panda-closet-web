/*
 * Purpose: Product detail page with gallery, selection options, and order modal flow.
 * Linked to: src/pages/OrderModal.tsx, src/context/store.tsx, and the product card/shop listing.
 * Note: This is a primary conversion page for customer orders.
 */
import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router"
import { useStore } from "../context/store"
import {
  formatPrice,
  buildWhatsAppUrl,
  customizeWhatsAppMessage,
  DEFAULT_ORDER_NOTES,
} from "../lib/utils"
import { WhatsAppIcon } from "../components/layout/Navbar"
import ProductCard from "../components/product/ProductCard"
import OrderModal from "./OrderModal"

const AVAILABILITY_BADGE: Record<string, { label: string; className: string }> =
  {
    available: {
      label: "Available",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    "made-to-order": {
      label: "Made to Order",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    "sold-out": {
      label: "Sold Out",
      className: "bg-light text-muted border-light",
    },
  }

export default function Product() {
  const { slug } = useParams()
  const { products, productsLoading, settings } = useStore()
  const navigate = useNavigate()

  const product = products.find(
    (p) => p.slug === slug && p.availability !== "hidden",
  )
  const [activeImage, setActiveImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState("")
  const [customSize, setCustomSize] = useState("")
  const [selectedColour, setSelectedColour] = useState("")
  const [orderOpen, setOrderOpen] = useState(false)

  if (!product) {
    if (productsLoading) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center pt-20 text-muted text-sm">
          Loading product...
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-6 pt-20 px-6 text-center">
        <p className="font-serif text-5xl text-ink/20">404</p>
        <h1 className="font-serif text-3xl text-ink">Product Not Found</h1>
        <p className="text-muted">This piece may no longer be available.</p>
        <Link
          to="/shop"
          className="text-xs font-medium tracking-[0.2em] uppercase border border-ink text-ink px-6 py-3 hover:bg-ink hover:text-white transition-colors"
        >
          Back to Shop
        </Link>
      </div>
    )
  }

  const badge = AVAILABILITY_BADGE[product.availability]
  const requestedSize =
    selectedSize === "Custom"
      ? customSize.trim()
        ? `Custom: ${customSize.trim()}`
        : "Custom size requested"
      : selectedSize
  const waMsg = customizeWhatsAppMessage(settings.defaultWhatsappMessage, {
    productName: product.name,
    size: requestedSize,
    colour: selectedColour,
    enquiryType: "I would like to enquire about ordering this piece.",
  })
  const waUrl = buildWhatsAppUrl(settings.whatsappNumber, waMsg)

  const canOrder =
    product.availability === "available" ||
    product.availability === "made-to-order"
  const visibleProducts = products.filter(
    (item) => item.id !== product.id && item.availability !== "hidden",
  )
  const sameCategory = visibleProducts.filter(
    (item) => item.category.toLowerCase() === product.category.toLowerCase(),
  )
  const similarProducts = (
    sameCategory.length ? sameCategory : visibleProducts
  ).slice(0, 4)

  return (
    <>
      <div className="bg-cream pt-16 lg:pt-20">
        {/* Breadcrumb */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-6 pb-4">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link to="/" className="hover:text-ink transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-ink transition-colors">
              Shop
            </Link>
            <span>/</span>
            <span className="text-ink">{product.name}</span>
          </nav>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 pb-16">
          <div className="grid grid-cols-1 items-start gap-y-4 sm:grid-cols-[minmax(220px,0.55fr)_minmax(0,1fr)] sm:gap-x-8 sm:gap-y-4 md:gap-y-8 lg:grid-cols-2 lg:gap-x-16">
            {/* Gallery */}
            <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-3 self-start sm:row-span-1 lg:row-span-2 lg:gap-4">
              <div className="relative aspect-[4/5] lg:aspect-[5/6] max-h-[68vh] w-full overflow-hidden bg-light">
                {product.images[activeImage] ? (
                  <img
                    src={product.images[activeImage]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-light flex items-center justify-center text-muted text-sm">
                    No image
                  </div>
                )}
                {product.availability === "sold-out" && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-ink text-cream text-xs font-medium tracking-[0.15em] uppercase px-3 py-1.5">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>
              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`shrink-0 w-20 aspect-[3/4] overflow-hidden border-2 transition-colors ${
                        activeImage === i
                          ? "border-ink"
                          : "border-transparent hover:border-beige"
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Compact product summary */}
            <div className="col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1 lg:pt-4">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted mb-4">
                {product.category}
              </p>
              <h1 className="font-serif text-xl sm:text-3xl lg:text-5xl font-light text-ink mb-3 sm:mb-4 leading-snug [overflow-wrap:anywhere]">
                {product.name}
              </h1>
              <div className="flex flex-col items-start gap-3">
                <div className="flex flex-col items-start gap-2">
                  <p className="font-medium text-lg sm:text-2xl text-ink">
                    {formatPrice(product.price, settings)}
                  </p>
                  {badge && (
                    <span
                      className={`inline-block text-[10px] sm:text-xs font-medium tracking-[0.12em] uppercase border px-2 sm:px-3 py-1.5 ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className="w-full max-w-[32rem] text-muted text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {product.description}
                </p>
              </div>
            </div>

            {/* Product details and order controls */}
            <div className="col-span-full row-start-3 min-w-0 sm:col-span-full sm:col-start-1 sm:row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-2 lg:pt-2">
              {/* Size + Colour (same line) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4 md:mb-8">
                {/* Size selector */}
                {product.sizes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium tracking-[0.15em] uppercase text-ink mb-2 md:mb-3">
                      Size
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            if (s === "Custom") {
                              setSelectedSize("Custom")
                              setOrderOpen(true)
                              return
                            }

                            setSelectedSize(selectedSize === s ? "" : s)
                          }}
                          className={`px-4 py-2 text-sm border transition-colors ${
                            selectedSize === s
                              ? "bg-ink text-white border-ink"
                              : "bg-white text-ink border-light hover:border-ink"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {selectedSize === "Custom" && (
                      <div className="mt-3 md:mt-4">
                        <label
                          htmlFor="custom-size-input"
                          className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2"
                        >
                          Your custom size
                        </label>
                        <input
                          id="custom-size-input"
                          type="text"
                          value={customSize}
                          onChange={(event) => setCustomSize(event.target.value)}
                          placeholder="Enter your measurements or size"
                          className="w-full bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown transition-colors placeholder:text-muted"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Colour selector */}
                <div className={product.sizes.length ? "" : "sm:col-span-2"}>
                  <p className="text-xs font-medium tracking-[0.15em] uppercase text-ink mb-2 md:mb-3">
                    Colour
                  </p>

                  {product.colours.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {product.colours.map((c) => (
                        <span
                          key={c}
                          className="px-3 py-1.5 border border-light bg-white text-sm text-ink"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                </div>
              </div>

              {/* Made to order note */}
              {product.availability === "made-to-order" && (
                <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-4 md:mb-8 text-sm text-amber-800 leading-relaxed">
                  This piece is made after your order is confirmed. Contact us
                  for available fabric, sizing and turnaround time.
                </div>
              )}

              {/* Notes */}
              <ul className="mb-3 space-y-1.5 bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 leading-relaxed md:mb-4 md:space-y-2">
                {DEFAULT_ORDER_NOTES.map((note, index) => (
                  <li key={index} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
              {product.notes && (
                <p className="text-muted text-sm leading-relaxed mb-4 italic md:mb-8">
                  {product.notes}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 md:gap-3">
                {canOrder && (
                  <button
                    onClick={() => setOrderOpen(true)}
                    className="w-full bg-ink text-cream text-xs font-medium tracking-[0.2em] uppercase py-4 hover:bg-ink-soft transition-colors"
                  >
                    {product.availability === "made-to-order"
                      ? "Order This Piece"
                      : "Order This Item"}
                  </button>
                )}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 text-xs font-medium tracking-[0.2em] uppercase py-4 transition-colors ${
                    canOrder
                      ? "border border-light text-ink hover:border-ink"
                      : "bg-whatsapp text-white hover:opacity-90"
                  }`}
                >
                  <WhatsAppIcon size={14} />
                  {product.availability === "sold-out"
                    ? "Enquire on WhatsApp"
                    : "Chat on WhatsApp"}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {similarProducts.length > 0 && (
        <section className="bg-white border-t border-light py-12 lg:py-16">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-3">
              More to explore
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-ink mb-8">
              Similar Pieces
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 lg:gap-8">
              {similarProducts.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {orderOpen && (
        <OrderModal
          product={product}
          preselectedSize={selectedSize}
          preselectedCustomSize={customSize}
          preselectedColour={selectedColour}
          onClose={() => setOrderOpen(false)}
        />
      )}
    </>
  )
}

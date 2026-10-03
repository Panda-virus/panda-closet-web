/*
 * Purpose: Reusable product card used to display products in the shop and featured sections.
 * Linked to: src/pages/Home.tsx, src/pages/Shop.tsx, and the product detail flow.
 * Note: This component defines the main storefront product display card.
 */
import { Link } from "react-router"
import type { Product } from "../../types"
import { useStore } from "../../context/store"
import { availabilityIncludes, formatPrice } from "../../lib/utils"

const BADGE_STYLES: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "made-to-order": "bg-amber-50 text-amber-700 border-amber-200",
  "available-and-made-to-order": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "sold-out": "bg-light text-muted border-light",
}

const BADGE_LABELS: Record<string, string> = {
  available: "Available",
  "made-to-order": "Made to Order",
  "available-and-made-to-order": "Available + Made to Order",
  "sold-out": "Sold Out",
}

export default function ProductCard({ product }: { product: Product }) {
  const { settings } = useStore()

  if (product.availability === "hidden") return null

  return (
    <Link
      to={`/shop/${product.slug}`}
      className="group block"
      aria-label={product.name}
    >
      {/* Image */}
      <div className="img-zoom relative bg-light aspect-[3/4] overflow-hidden mb-4">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            <PlaceholderIcon />
          </div>
        )}
        {product.availability === "sold-out" && (
          <div className="absolute inset-0 bg-cream/60 flex items-center justify-center">
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-muted border border-muted px-3 py-1.5">
              Sold Out
            </span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-ink/0 group-hover:bg-ink/10 transition-colors duration-300 flex items-end justify-center pb-4">
          <span className="text-white text-xs font-medium tracking-[0.15em] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-ink px-4 py-2">
            View Item
          </span>
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="text-xs text-muted tracking-[0.12em] uppercase mb-1">
          {product.category}
        </p>
        <p className="font-serif text-lg text-ink group-hover:text-brown transition-colors leading-snug mb-2">
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          <p className="font-medium text-ink text-sm">
            {formatPrice(product.price, settings)}
          </p>
          {!availabilityIncludes(product.availability, "available") && (
            <span
              className={`text-[10px] font-medium tracking-wider uppercase border px-2 py-0.5 ${BADGE_STYLES[product.availability]}`}
            >
              {BADGE_LABELS[product.availability]}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function PlaceholderIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21,15 16,10 5,21" />
    </svg>
  )
}

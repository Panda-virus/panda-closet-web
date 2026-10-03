/*
 * Purpose: Product listing page with search, filtering, and sorting for the storefront.
 * Linked to: src/components/product/ProductCard.tsx, src/context/store.tsx, and the product category data.
 * Note: This page is one of the main customer browsing experiences.
 */
import { useState, useMemo } from "react"
import { useStore } from "../context/store"
import ProductCard from "../components/product/ProductCard"
import { availabilityIncludes } from "../lib/utils"
import type { AvailabilityChoice } from "../types"

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
]

const AVAILABILITY_FILTERS: { value: AvailabilityChoice | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "made-to-order", label: "Made to Order" },
  { value: "sold-out", label: "Sold Out" },
]

export default function Shop() {
  const { products, productsLoading, categories } = useStore()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [availability, setAvailability] = useState<AvailabilityChoice | "all">("all")
  const [sort, setSort] = useState("featured")

  const activeCategories = categories.filter((c) => c.status === "active")
  const mainCategories = activeCategories.filter((c) => !c.parentId)

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.availability !== "hidden")

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
    }

    if (category !== "all") {
      const selected = activeCategories.find((c) => c.name === category)
      if (selected && !selected.parentId) {
        // Selecting a main category (e.g. Men) also shows its subcategories.
        const subs = activeCategories
          .filter((c) => c.parentId === selected.id)
          .map((c) => c.name.toLowerCase())
        list = list.filter((p) => {
          const pc = p.category.toLowerCase()
          return pc === category.toLowerCase() || subs.includes(pc)
        })
      } else {
        list = list.filter(
          (p) => p.category.toLowerCase() === category.toLowerCase(),
        )
      }
    }

    if (availability !== "all") {
      list = list.filter((p) => availabilityIncludes(p.availability, availability))
    }

    switch (sort) {
      case "newest":
        list = [...list].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        break
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price)
        break
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price)
        break
      case "featured":
        list = [...list].sort(
          (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0),
        )
        break
    }

    return list
  }, [products, categories, search, category, availability, sort])

  return (
    <div className="min-h-screen bg-cream pt-20 lg:pt-24">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-4 lg:py-6">
        {/* Search + Sort row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <SearchIcon />
            <input
              id="shop-search"
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
              className="w-full bg-white border border-light text-ink text-sm pl-10 pr-4 py-3 focus:outline-none focus:border-brown transition-colors placeholder:text-muted"
            />
          </div>
          <select
            id="shop-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort products"
            className="bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            id="shop-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown cursor-pointer min-w-[210px]"
          >
            <option value="all">All Categories</option>
            {mainCategories.map((main) => (
              <optgroup key={main.id} label={main.name}>
                <option value={main.name}>{main.name}</option>
                {activeCategories
                  .filter((c) => c.parentId === main.id)
                  .map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {main.name} / {sub.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Availability filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {AVAILABILITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setAvailability(f.value)}
              className={`text-[11px] font-medium tracking-wider uppercase px-3 py-1.5 border transition-colors ${
                availability === f.value
                  ? "bg-brown text-white border-brown"
                  : "bg-white text-muted border-light hover:border-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            {productsLoading ? (
              <p className="text-muted text-sm">Loading collection...</p>
            ) : (
              <>
                <p className="font-serif text-4xl text-ink/30 mb-4">
                  No Pieces Found
                </p>
                <p className="text-muted text-sm mb-6">
                  {search
                    ? "Try another search or browse the full collection."
                    : "No items match the selected filter."}
                </p>
                <button
                  onClick={() => {
                    setSearch("")
                    setCategory("all")
                    setAvailability("all")
                  }}
                  className="text-xs font-medium tracking-[0.15em] uppercase border border-ink text-ink px-6 py-3 hover:bg-ink hover:text-white transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted mb-6">
              {filtered.length} piece{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-8">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </span>
  )
}

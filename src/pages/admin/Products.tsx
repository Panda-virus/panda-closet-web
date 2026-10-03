/*
 * Purpose: Product management dashboard for listing, filtering, editing, and hiding catalog items.
 * Linked to: src/pages/admin/ProductForm.tsx, src/context/store.tsx, and the catalog data model.
 * Note: This is the main admin product-control screen for the storefront.
 */
import { useState } from "react"
import { Link } from "react-router"
import { useStore } from "../../context/store"
import { formatPrice, AVAILABILITY_LABELS } from "../../lib/utils"

const AVAIL_COLORS: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700",
  "made-to-order": "bg-amber-50 text-amber-700",
  "sold-out": "bg-gray-100 text-muted",
  hidden: "bg-red-50 text-red-600",
}

export default function AdminProducts() {
  const { products, productsLoading, deleteProduct, updateProduct, settings } =
    useStore()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [actionError, setActionError] = useState("")

  const filtered = products.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  )

  const handleDelete = async (id: string) => {
    try {
      setActionError("")
      await deleteProduct(id)
      setDeleteConfirm(null)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to delete this product.",
      )
    }
  }

  const handleToggleHide = async (product: typeof products[0]) => {
    const newAvail = product.availability === "hidden" ? "available" : "hidden"
    try {
      setActionError("")
      await updateProduct(product.id, { availability: newAvail })
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update this product.",
      )
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink">Products</h1>
          <p className="text-muted text-sm mt-1">
            {productsLoading
              ? "Loading products..."
              : `${products.length} total items`}
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="bg-ink text-cream text-xs font-medium tracking-[0.15em] uppercase px-5 py-3 hover:bg-ink-soft transition-colors shrink-0"
        >
          + Add Product
        </Link>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-light text-ink text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-brown transition-colors max-w-sm"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-light overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-light">
              <th className="px-5 py-3 text-left text-xs font-medium tracking-[0.1em] uppercase text-muted">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-[0.1em] uppercase text-muted">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-[0.1em] uppercase text-muted">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-[0.1em] uppercase text-muted">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-[0.1em] uppercase text-muted">
                Featured
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-[0.1em] uppercase text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted">
                  {productsLoading
                    ? "Loading products..."
                    : "No products found."}
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr
                  key={product.id}
                  className={`hover:bg-cream/30 transition-colors ${
                    product.availability === "hidden" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt=""
                          className="w-10 h-12 object-cover shrink-0 bg-light"
                        />
                      ) : (
                        <div className="w-10 h-12 bg-light shrink-0" />
                      )}
                      <span className="font-medium text-ink">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{product.category}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {formatPrice(product.price, settings)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${AVAIL_COLORS[product.availability]}`}
                    >
                      {AVAILABILITY_LABELS[product.availability]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs ${
                        product.featured ? "text-brown" : "text-muted"
                      }`}
                    >
                      {product.featured ? "★ Yes" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="text-xs text-ink hover:text-brown transition-colors border border-light px-3 py-1.5"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleToggleHide(product)}
                        className="text-xs text-muted hover:text-ink transition-colors border border-light px-3 py-1.5"
                      >
                        {product.availability === "hidden" ? "Show" : "Hide"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(product.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors border border-red-100 px-3 py-1.5"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.map((product) => (
          <div
            key={product.id}
            className={`bg-white border border-light p-4 ${
              product.availability === "hidden" ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt=""
                  className="w-12 h-14 object-cover bg-light shrink-0"
                />
              ) : (
                <div className="w-12 h-14 bg-light shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink text-sm truncate">
                  {product.name}
                </p>
                <p className="text-muted text-xs">{product.category}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium text-ink text-xs">
                    {formatPrice(product.price, settings)}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded ${AVAIL_COLORS[product.availability]}`}
                  >
                    {AVAILABILITY_LABELS[product.availability]}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/admin/products/${product.id}/edit`}
                className="flex-1 text-center text-xs border border-light text-ink py-2 hover:border-ink transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={() => handleToggleHide(product)}
                className="flex-1 text-xs border border-light text-muted py-2 hover:border-ink hover:text-ink transition-colors"
              >
                {product.availability === "hidden" ? "Show" : "Hide"}
              </button>
              <button
                onClick={() => setDeleteConfirm(product.id)}
                className="flex-1 text-xs border border-red-100 text-red-500 py-2"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted">
            {productsLoading ? "Loading products..." : "No products found."}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white border border-light p-8 max-w-sm w-full text-center">
            <h3 className="font-serif text-2xl text-ink mb-3">
              Delete Product?
            </h3>
            <p className="text-muted text-sm mb-6">
              Are you sure you want to delete this product? This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-light text-ink text-sm py-3 hover:border-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 text-white text-sm py-3 hover:bg-red-600 transition-colors"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

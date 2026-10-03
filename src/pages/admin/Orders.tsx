/*
 * Purpose: Admin order list with filtering and search tools for tracking customer requests.
 * Linked to: src/pages/admin/OrderDetail.tsx, src/context/store.tsx, and the order status workflow.
 * Note: This page is central to the store's private order management experience.
 */
import { useState } from "react"
import { Link } from "react-router"
import { useStore } from "../../context/store"
import { formatDate, ORDER_STATUS_LABELS } from "../../lib/utils"
import type { OrderStatus } from "../../types"

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
}

const STATUS_FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export default function AdminOrders() {
  const { orders } = useStore()
  const [filter, setFilter] = useState<OrderStatus | "all">("all")
  const [search, setSearch] = useState("")

  const filtered = orders
    .filter((o) => filter === "all" || o.status === filter)
    .filter(
      (o) =>
        !search ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.productName.toLowerCase().includes(search.toLowerCase()),
    )

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-ink">Orders</h1>
        <p className="text-muted text-sm mt-1">{orders.length} total orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white border border-light text-ink text-sm px-4 py-2.5 focus:outline-none focus:border-brown transition-colors max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs font-medium tracking-wide uppercase px-3 py-1.5 border transition-colors ${
                filter === f.value
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-muted border-light hover:border-ink hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table (desktop) */}
      <div className="hidden md:block bg-white border border-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-light">
              <th className="px-5 py-3 text-left text-xs font-medium tracking-wider uppercase text-muted">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider uppercase text-muted">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider uppercase text-muted">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider uppercase text-muted">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider uppercase text-muted">
                Status
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted">
                  No orders found.
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-cream/30 transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-ink">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{order.customerName}</p>
                    <p className="text-muted text-xs">{order.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{order.productName}</p>
                    <p className="text-muted text-xs">
                      {[order.size, order.colour].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 border rounded ${STATUS_COLORS[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="text-xs text-muted hover:text-ink border border-light px-3 py-1.5 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted py-10">No orders found.</p>
        ) : (
          filtered.map((order) => (
            <Link
              key={order.id}
              to={`/admin/orders/${order.id}`}
              className="bg-white border border-light p-4 hover:border-brown transition-colors block"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-ink text-sm">
                    {order.orderNumber}
                  </p>
                  <p className="text-muted text-xs">{order.customerName}</p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-1 border rounded ${STATUS_COLORS[order.status]}`}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <p className="text-muted text-xs">{order.productName}</p>
              <p className="text-muted text-[10px] mt-1">
                {formatDate(order.createdAt)}
              </p>
            </Link>
          ))
        )}
      </div>

      {filtered.length === 0 && orders.length === 0 && (
        <div className="text-center py-16">
          <p className="font-serif text-3xl text-ink/30 mb-2">No Orders Yet</p>
          <p className="text-muted text-sm">
            New order requests will appear here.
          </p>
        </div>
      )}
    </div>
  )
}

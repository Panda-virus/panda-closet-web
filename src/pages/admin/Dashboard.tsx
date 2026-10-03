/*
 * Purpose: Summary dashboard for the admin portal showing key stats, recent orders, and unread messages.
 * Linked to: src/pages/admin/Orders.tsx, src/pages/admin/Messages.tsx, and the protected admin API state.
 * Note: This page is the default landing screen for the private admin experience.
 */
import { Link } from "react-router"
import { useStore } from "../../context/store"
import { formatDate, ORDER_STATUS_LABELS } from "../../lib/utils"

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-amber-50 text-amber-700",
  confirmed: "bg-purple-50 text-purple-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
}

export default function Dashboard() {
  const { products, orders, messages, admin } = useStore()

  const activeProducts = products.filter(
    (p) => p.availability !== "hidden",
  ).length
  const pendingOrders = orders.filter(
    (o) => o.status === "new" || o.status === "contacted",
  ).length
  const unreadMessages = messages.filter((m) => m.status === "unread").length
  const recentOrders = orders.slice(0, 5)

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl text-ink">
          {greeting}, Admin.
        </h1>
        <p className="text-muted text-sm mt-1">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total Products"
          value={products.length}
          sub="in catalogue"
        />
        <StatCard
          label="Active Products"
          value={activeProducts}
          sub="visible publicly"
          accent
        />
        <StatCard label="Total Orders" value={orders.length} sub="all time" />
        <StatCard
          label="Pending Orders"
          value={pendingOrders}
          sub="need attention"
          warn={pendingOrders > 0}
        />
      </div>

      {/* Messages alert */}
      {unreadMessages > 0 && (
        <Link
          to="/admin/messages"
          className="flex items-center gap-3 bg-brown/10 border border-brown/20 px-5 py-4 mb-8 hover:bg-brown/15 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-brown" />
          <p className="text-sm text-ink">
            You have <strong>{unreadMessages}</strong> unread{" "}
            {unreadMessages === 1 ? "message" : "messages"}.
          </p>
          <span className="ml-auto text-xs text-muted">View →</span>
        </Link>
      )}

      {/* Recent Orders */}
      <div className="bg-white border border-light">
        <div className="flex items-center justify-between px-6 py-4 border-b border-light">
          <h2 className="font-serif text-xl text-ink">Recent Orders</h2>
          <Link
            to="/admin/orders"
            className="text-xs text-muted hover:text-ink transition-colors tracking-wide"
          >
            View all →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-serif text-2xl text-ink/30 mb-2">
              No Orders Yet
            </p>
            <p className="text-muted text-sm">
              New order requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-light">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to={`/admin/orders/${order.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-cream/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink text-sm">
                    {order.orderNumber}
                  </p>
                  <p className="text-muted text-xs mt-0.5 truncate">
                    {order.productName} — {order.customerName}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[order.status]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <p className="text-muted text-[10px] mt-1">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Link
          to="/admin/products/new"
          className="bg-white border border-light px-5 py-4 hover:border-brown transition-colors group"
        >
          <p className="text-xs text-muted tracking-wide mb-1">Products</p>
          <p className="text-ink text-sm font-medium group-hover:text-brown transition-colors">
            + Add new product
          </p>
        </Link>
        <Link
          to="/admin/orders"
          className="bg-white border border-light px-5 py-4 hover:border-brown transition-colors group"
        >
          <p className="text-xs text-muted tracking-wide mb-1">Orders</p>
          <p className="text-ink text-sm font-medium group-hover:text-brown transition-colors">
            Manage orders
          </p>
        </Link>
        <Link
          to="/admin/settings"
          className="bg-white border border-light px-5 py-4 hover:border-brown transition-colors group"
        >
          <p className="text-xs text-muted tracking-wide mb-1">Settings</p>
          <p className="text-ink text-sm font-medium group-hover:text-brown transition-colors">
            Update settings
          </p>
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
  warn,
}: {
  label: string
  value: number
  sub: string
  accent?: boolean
  warn?: boolean
}) {
  return (
    <div
      className={`bg-white border px-5 py-5 ${
        warn ? "border-amber-200" : accent ? "border-brown/30" : "border-light"
      }`}
    >
      <p className="text-xs text-muted tracking-wide mb-2">{label}</p>
      <p
        className={`font-serif text-4xl ${
          warn ? "text-amber-600" : accent ? "text-brown" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="text-muted text-xs mt-1">{sub}</p>
    </div>
  )
}

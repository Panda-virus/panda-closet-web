/*
 * Purpose: Admin navigation shell that protects dashboard routes and syncs order/message activity.
 * Linked to: src/pages/admin/*, src/context/store.tsx, and the authenticated admin API endpoints.
 * Note: This is the main dashboard layout for the private admin portal.
 */
import { useEffect, useRef, useState } from "react"
import { Outlet, Link, Navigate, useLocation, useNavigate } from "react-router"
import { useStore } from "../../context/store"
import type { Message, Order } from "../../types"
import { API_BASE_URL } from "../../lib/api"

type AdminNotification =
  | { type: "order"; item: Order }
  | { type: "whatsapp"; item: Message }

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: DashIcon },
  { to: "/admin/products", label: "Products", icon: ProductIcon },
  { to: "/admin/orders", label: "Orders", icon: OrderIcon },
  { to: "/admin/messages", label: "Messages", icon: MessageIcon },
  { to: "/admin/categories", label: "Categories", icon: CategoryIcon },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
]

export default function AdminLayout() {
  const { admin, logout, messages, orders, syncAdminActivity } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notification, setNotification] = useState<AdminNotification | null>(
    null,
  )
  const seenOrderIds = useRef<Set<string> | null>(null)
  const seenMessageIds = useRef<Set<string> | null>(null)

  const unreadMessages = messages.filter((m) => m.status === "unread").length
  const newOrders = orders.filter((o) => o.status === "new").length

  useEffect(() => {
    const currentOrderIds = new Set(orders.map((order) => order.id))
    const previousOrderIds = seenOrderIds.current
    seenOrderIds.current = currentOrderIds

    const currentMessageIds = new Set(messages.map((message) => message.id))
    const previousMessageIds = seenMessageIds.current
    seenMessageIds.current = currentMessageIds

    const addedOrder =
      previousOrderIds &&
      orders.find((order) => !previousOrderIds.has(order.id))
    const addedMessage =
      previousMessageIds &&
      messages.find((message) => !previousMessageIds.has(message.id))
    if (addedMessage) setNotification({ type: "whatsapp", item: addedMessage })
    else if (addedOrder) setNotification({ type: "order", item: addedOrder })
  }, [orders, messages])

  useEffect(() => {
    if (!notification) return
    const timeout = window.setTimeout(() => setNotification(null), 8000)
    return () => window.clearTimeout(timeout)
  }, [notification])

  useEffect(() => {
    if (!admin?.loggedIn) return
    let active = true
    let isInitialSnapshot = true

    const pollActivity = async () => {
      try {
        const [ordersResponse, messagesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/orders`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/api/admin/messages`, {
            credentials: "include",
          }),
        ])
        if (!active || !ordersResponse.ok || !messagesResponse.ok) return

        const serverOrders: Order[] = await ordersResponse.json()
        const serverMessages: Message[] = await messagesResponse.json()

        if (isInitialSnapshot) {
          isInitialSnapshot = false
        } else {
          const addedMessage = serverMessages.find(
            (message) => !seenMessageIds.current?.has(message.id),
          )
          const addedOrder = serverOrders.find(
            (order) => !seenOrderIds.current?.has(order.id),
          )
          if (addedMessage)
            setNotification({ type: "whatsapp", item: addedMessage })
          else if (addedOrder)
            setNotification({ type: "order", item: addedOrder })
        }

        serverOrders.forEach((order) => seenOrderIds.current?.add(order.id))
        serverMessages.forEach((message) =>
          seenMessageIds.current?.add(message.id),
        )
        syncAdminActivity(serverOrders, serverMessages)
      } catch {
        // Retry on the next poll if the backend is temporarily unavailable.
      }
    }

    void pollActivity()
    const interval = window.setInterval(pollActivity, 5000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [admin?.loggedIn])

  if (!admin?.loggedIn) {
    return <Navigate to="/admin" replace />
  }

  const handleLogout = () => {
    void fetch(`${API_BASE_URL}/api/admin/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {})
    logout()
    navigate("/admin")
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-ink text-cream">
      <div className="px-6 py-6 border-b border-ink-soft">
        <div className="flex items-center gap-3">
          <img
            src="/panda-closet-logo.png"
            alt="Panda Closet logo"
            className="h-9 w-auto object-contain"
          />
          <p className="font-serif text-lg tracking-[0.08em]">PANDA CLOSET</p>
        </div>
        <p className="text-muted text-xs mt-1">Admin Portal</p>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV.map((item) => {
          const active = location.pathname.startsWith(item.to)
          const badge =
            item.to === "/admin/messages"
              ? unreadMessages
              : item.to === "/admin/orders"
                ? newOrders
                : 0
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded text-sm transition-colors mb-1 ${
                active
                  ? "bg-brown text-white"
                  : "text-muted hover:text-cream hover:bg-ink-soft"
              }`}
            >
              <item.icon size={16} />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="bg-brown text-white text-xs px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-ink-soft">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 rounded text-sm text-muted hover:text-cream hover:bg-ink-soft transition-colors w-full"
        >
          <LogoutIcon size={16} />
          Logout
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex bg-cream">
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 top-4 z-[60] w-[min(24rem,calc(100vw-2rem))] border border-brown/30 bg-white p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brown" />
            <div className="min-w-0 flex-1">
              {notification.type === "order" ? (
                <>
                  <p className="text-sm font-semibold text-ink">
                    New order received
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {notification.item.orderNumber}
                  </p>
                  <p className="mt-1 truncate text-sm text-ink">
                    {notification.item.productName} -{" "}
                    {notification.item.customerName}
                  </p>
                  <Link
                    to={`/admin/orders/${notification.item.id}`}
                    onClick={() => setNotification(null)}
                    className="mt-3 inline-block text-xs font-medium text-brown underline underline-offset-2"
                  >
                    View order
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-ink">
                    WhatsApp enquiry initiated
                  </p>
                  <p className="mt-1 truncate text-sm text-ink">
                    {notification.item.message}
                  </p>
                  <Link
                    to="/admin/messages"
                    onClick={() => setNotification(null)}
                    className="mt-3 inline-block text-xs font-medium text-brown underline underline-offset-2"
                  >
                    View enquiries
                  </Link>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-xs text-muted hover:text-ink"
              aria-label="Dismiss notification"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-56 shrink-0 fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-56 flex flex-col z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-ink text-cream border-b border-ink-soft sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          </button>
          <img
            src="/panda-closet-logo.png"
            alt="Panda Closet logo"
            className="h-7 w-auto object-contain"
          />
          <span className="font-serif text-base tracking-wider flex-1">
            PANDA CLOSET
          </span>
        </div>

        <div className="flex-1 p-4 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function DashIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
function ProductIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}
function OrderIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}
function MessageIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}
function CategoryIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
function SettingsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}
function LogoutIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

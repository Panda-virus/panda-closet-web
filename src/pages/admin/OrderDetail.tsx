/*
 * Purpose: Detailed admin view for an individual order including customer info, status actions, and WhatsApp follow-up.
 * Linked to: src/pages/admin/Orders.tsx, src/components/layout/Navbar.tsx, and the order management flow.
 * Note: This file handles the operational heart of customer order processing.
 */
import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router"
import { useStore } from "../../context/store"
import {
  formatDate,
  buildWhatsAppUrl,
  orderFollowUpMessage,
  ORDER_STATUS_LABELS,
} from "../../lib/utils"
import type { OrderStatus } from "../../types"
import { WhatsAppIcon } from "../../components/layout/Navbar"

const STATUS_NEXT: Record<OrderStatus, {
  action: string
  next: OrderStatus
} | null> = {
  new: { action: "Mark Contacted", next: "contacted" },
  contacted: { action: "Mark Confirmed", next: "confirmed" },
  confirmed: { action: "Mark Completed", next: "completed" },
  completed: null,
  cancelled: null,
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
}

export default function OrderDetail() {
  const { id } = useParams()
  const { orders, products, updateOrderStatus, settings } = useStore()
  const navigate = useNavigate()
  const [actionError, setActionError] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const order = orders.find((o) => o.id === id)
  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="font-serif text-3xl text-ink/30 mb-3">Order not found</p>
        <Link
          to="/admin/orders"
          className="text-xs text-muted hover:text-ink border border-light px-4 py-2 transition-colors"
        >
          ← Back to Orders
        </Link>
      </div>
    )
  }

  const orderedProduct = products.find(
    (product) => product.id === order.productId,
  )

  const waContact = order.whatsapp || order.phone
  const waMsg = orderFollowUpMessage(order.orderNumber)
  const waUrl = buildWhatsAppUrl(settings.whatsappNumber, waMsg)
  const waCustomer = buildWhatsAppUrl(
    waContact,
    `Hello ${order.customerName}, this is Panda Closet regarding your order ${order.orderNumber}.`,
  )

  const changeOrderStatus = async (status: OrderStatus) => {
    setUpdatingStatus(true)
    setActionError("")
    try {
      await updateOrderStatus(order.id, status)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update this order.",
      )
    } finally {
      setUpdatingStatus(false)
    }
  }

  const nextStep = STATUS_NEXT[order.status]

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-muted hover:text-ink transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M19 12H5" />
            <polyline points="12,19 5,12 12,5" />
          </svg>
        </button>
        <div>
          <h1 className="font-serif text-3xl text-ink">{order.orderNumber}</h1>
          <p className="text-muted text-sm">
            Submitted {formatDate(order.createdAt)}
          </p>
        </div>
        <span
          className={`ml-auto text-xs font-medium px-3 py-1.5 border rounded ${STATUS_COLORS[order.status]}`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Customer */}
        <Section title="Customer">
          <Row label="Name" value={order.customerName} />
          <Row label="Phone" value={order.phone} />
          {order.location && <Row label="Location" value={order.location} />}
          {order.whatsapp && order.whatsapp !== order.phone && (
            <Row label="WhatsApp" value={order.whatsapp} />
          )}
          <Row
            label="Contact via"
            value={
              order.contactPreference === "whatsapp" ? "WhatsApp" : "Phone Call"
            }
          />
        </Section>

        {/* Order details */}
        <Section title="Order">
          <div className="flex items-center gap-4">
            {orderedProduct?.images[0] && (
              <img
                src={orderedProduct.images[0]}
                alt={order.productName}
                className="h-24 w-20 shrink-0 border border-light object-cover"
              />
            )}
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider">
                Product
              </p>
              <p className="text-ink text-sm font-medium">
                {order.productName}
              </p>
            </div>
          </div>
          {order.size && <Row label="Size" value={order.size} />}
          {order.colour && <Row label="Colour" value={order.colour} />}
          <Row label="Quantity" value={String(order.quantity)} />
        </Section>
      </div>

      {order.notes && (
        <div className="bg-cream border border-light p-4 mb-8">
          <p className="text-xs font-medium tracking-[0.12em] uppercase text-muted mb-2">
            Notes from customer
          </p>
          <p className="text-ink text-sm leading-relaxed italic">
            "{order.notes}"
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white border border-light p-6">
        <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-4">
          Actions
        </p>
        {actionError && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {actionError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {nextStep && (
            <button
              onClick={() => void changeOrderStatus(nextStep.next)}
              disabled={updatingStatus}
              className="bg-ink text-cream text-xs font-medium tracking-[0.15em] uppercase px-5 py-3 hover:bg-ink-soft transition-colors disabled:opacity-50"
            >
              {nextStep.action}
            </button>
          )}
          <a
            href={waCustomer}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-whatsapp text-white text-xs font-medium tracking-[0.15em] uppercase px-5 py-3 hover:opacity-90 transition-opacity"
          >
            <WhatsAppIcon size={14} />
            WhatsApp Customer
          </a>
          {order.status !== "cancelled" && order.status !== "completed" && (
            <button
              onClick={() => void changeOrderStatus("cancelled")}
              disabled={updatingStatus}
              className="border border-red-200 text-red-500 text-xs font-medium tracking-[0.15em] uppercase px-5 py-3 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Status history / info */}
      <div className="mt-4 text-muted text-xs">
        Last updated: {formatDate(order.updatedAt)}
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-light p-5">
      <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-4">
        {title}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
      <p className="text-ink text-sm font-medium">{value}</p>
    </div>
  )
}

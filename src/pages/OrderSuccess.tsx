/*
 * Purpose: Confirmation page shown after a successful order request submission.
 * Linked to: src/pages/OrderModal.tsx and the WhatsApp follow-up flow.
 * Note: This page closes the customer order flow and keeps the experience consistent.
 */
import { useSearchParams, Link } from "react-router"
import { useStore } from "../context/store"
import { buildWhatsAppUrl, customizeWhatsAppMessage } from "../lib/utils"
import { WhatsAppIcon } from "../components/layout/Navbar"

export default function OrderSuccess() {
  const [params] = useSearchParams()
  const orderNumber = params.get("order") ?? ""
  const { settings } = useStore()
  const waMsg = customizeWhatsAppMessage(settings.defaultWhatsappMessage, {
    orderNumber,
    enquiryType: "I would like to follow up on my order.",
  })
  const waUrl = buildWhatsAppUrl(settings.whatsappNumber, waMsg)

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center pt-20 px-6">
      <div className="max-w-md w-full text-center">
        {/* Check icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-8">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#059669"
            strokeWidth="2"
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl font-light text-ink mb-4">
          Order Request
          <br />
          Received
        </h1>
        <p className="text-muted text-base leading-relaxed mb-6">
          Thank you. We have received your request and Panda Closet will contact
          you shortly to confirm the details.
        </p>

        {orderNumber && (
          <div className="bg-white border border-light px-6 py-4 mb-8 inline-block">
            <p className="text-xs text-muted tracking-[0.15em] uppercase mb-1">
              Order Number
            </p>
            <p className="font-serif text-2xl text-ink">{orderNumber}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            to="/shop"
            className="bg-ink text-cream text-xs font-medium tracking-[0.2em] uppercase px-8 py-4 hover:bg-ink-soft transition-colors"
          >
            Continue Shopping
          </Link>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-light text-ink text-xs font-medium tracking-[0.2em] uppercase px-8 py-4 hover:border-ink transition-colors flex items-center justify-center gap-2"
          >
            <WhatsAppIcon size={14} />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

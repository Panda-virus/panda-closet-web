/*
 * Purpose: Message inbox for customer enquiries and contact-form submissions.
 * Linked to: src/pages/Contact.tsx, src/context/store.tsx, and the admin communication workflow.
 * Note: This file manages the customer support and enquiry queue.
 */
import { useState } from "react"
import { useStore } from "../../context/store"
import { buildWhatsAppUrl, formatDate } from "../../lib/utils"
import type { MessageStatus } from "../../types"

const STATUS_COLORS: Record<MessageStatus, string> = {
  unread: "bg-blue-50 text-blue-700",
  read: "bg-gray-100 text-muted",
  responded: "bg-emerald-50 text-emerald-700",
}

export default function AdminMessages() {
  const { messages, updateMessageStatus } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [actionError, setActionError] = useState("")

  const handleOpen = async (id: string) => {
    setSelected(id)
    const msg = messages.find((m) => m.id === id)
    if (msg && msg.status === "unread") {
      try {
        await updateMessageStatus(id, "read")
        setActionError("")
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Unable to update this message.",
        )
      }
    }
  }

  const markResponded = async (id: string) => {
    try {
      await updateMessageStatus(id, "responded")
      setActionError("")
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update this message.",
      )
    }
  }

  const selectedMsg = messages.find((m) => m.id === selected)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-ink">Messages</h1>
        <p className="text-muted text-sm mt-1">
          {messages.filter((m) => m.status === "unread").length} unread
        </p>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* List */}
        <div className="lg:col-span-2 bg-white border border-light divide-y divide-light">
          {messages.length === 0 ? (
            <div className="px-5 py-12 text-center text-muted">
              <p className="font-serif text-2xl text-ink/30 mb-2">
                No Messages
              </p>
              <p className="text-sm">
                Contact form submissions will appear here.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => handleOpen(msg.id)}
                className={`w-full text-left px-5 py-4 hover:bg-cream/50 transition-colors ${
                  selected === msg.id ? "bg-cream" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p
                    className={`text-sm font-medium ${
                      msg.status === "unread" ? "text-ink" : "text-muted"
                    }`}
                  >
                    {msg.name}
                    {msg.status === "unread" && (
                      <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-brown align-middle" />
                    )}
                  </p>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLORS[msg.status]}`}
                  >
                    {msg.status}
                  </span>
                </div>
                <p className="text-muted text-xs truncate">{msg.message}</p>
                <p className="text-muted text-[10px] mt-1">
                  {formatDate(msg.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {!selectedMsg ? (
            <div className="bg-white border border-light flex items-center justify-center h-48 text-muted text-sm">
              Select a message to view it.
            </div>
          ) : (
            <div className="bg-white border border-light p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-serif text-2xl text-ink">
                    {selectedMsg.name}
                  </h2>
                  <p className="text-muted text-sm mt-0.5">
                    {formatDate(selectedMsg.createdAt)}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[selectedMsg.status]}`}
                >
                  {selectedMsg.status}
                </span>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                {selectedMsg.email && (
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider">
                      Email
                    </p>
                    <a
                      href={`mailto:${selectedMsg.email}`}
                      className="text-ink text-sm hover:text-brown transition-colors"
                    >
                      {selectedMsg.email}
                    </a>
                  </div>
                )}
                {selectedMsg.phone && (
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider">
                      Phone
                    </p>
                    <a
                      href={`tel:${selectedMsg.phone}`}
                      className="text-ink text-sm hover:text-brown transition-colors"
                    >
                      {selectedMsg.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="bg-cream border border-light p-4 mb-6">
                <p className="text-ink text-sm leading-relaxed">
                  {selectedMsg.message}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedMsg.status !== "responded" && (
                  <button
                    onClick={() => void markResponded(selectedMsg.id)}
                    className="bg-ink text-cream text-xs font-medium tracking-[0.15em] uppercase px-5 py-3 hover:bg-ink-soft transition-colors"
                  >
                    Mark Responded
                  </button>
                )}
                {selectedMsg.email && (
                  <a
                    href={`mailto:${selectedMsg.email}`}
                    className="border border-light text-ink text-xs font-medium tracking-[0.15em] uppercase px-5 py-3 hover:border-ink transition-colors"
                  >
                    Reply by Email
                  </a>
                )}
                {selectedMsg.phone && (
                  <a
                    href={buildWhatsAppUrl(
                      selectedMsg.phone,
                      "Hello, this is Panda Closet responding to your enquiry.",
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-light text-ink text-xs font-medium tracking-[0.15em] uppercase px-5 py-3 hover:border-ink transition-colors"
                  >
                    WhatsApp Reply
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

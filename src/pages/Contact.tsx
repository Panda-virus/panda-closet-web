/*
 * Purpose: Contact page and form for customer enquiries and support requests.
 * Linked to: src/context/store.tsx, src/lib/utils.ts, and the message endpoints for submission.
 * Note: This page is central to the public contact and WhatsApp workflow.
 */
import { useState } from "react"
import { useStore } from "../context/store"
import { buildWhatsAppUrl } from "../lib/utils"
import { WhatsAppIcon } from "../components/layout/Navbar"

export default function Contact() {
  const { settings, addMessage } = useStore()
  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    settings.defaultWhatsappMessage,
  )

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: "" }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Please enter your name."
    if (!form.message.trim()) e.message = "Please enter a message."
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    setSubmitError("")
    try {
      await addMessage({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        message: form.message,
        status: "unread",
      })
      setSent(true)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to send your message. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream pt-16 lg:pt-20">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-3">
            Get in Touch
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl font-light text-ink">
            Let's Talk
          </h1>
          <p className="text-muted text-base mt-3 max-w-md leading-relaxed">
            Have a question about an item, sizing, custom tailoring or an order?
            We'd love to hear from you.
          </p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Contact options */}
          <div className="flex flex-col gap-8">
            {/* WhatsApp */}
            <div className="bg-white border border-light p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-whatsapp/10 rounded flex items-center justify-center shrink-0 text-whatsapp">
                  <WhatsAppIcon size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-ink mb-2">WhatsApp</h3>
                  <p className="text-muted text-sm mb-4 leading-relaxed">
                    Chat directly with our team. We usually respond quickly.
                  </p>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium tracking-[0.15em] uppercase text-whatsapp border border-whatsapp px-4 py-2 hover:bg-whatsapp hover:text-white transition-colors inline-block"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Phone */}
            {settings.phoneNumber && (
              <div className="bg-white border border-light p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-light rounded flex items-center justify-center shrink-0 text-muted">
                    <PhoneIcon />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-ink mb-2">Phone</h3>
                    <p className="text-muted text-sm mb-4">
                      {settings.phoneNumber}
                    </p>
                    <a
                      href={`tel:${settings.phoneNumber}`}
                      className="text-xs font-medium tracking-[0.15em] uppercase border border-ink text-ink px-4 py-2 hover:bg-ink hover:text-white transition-colors inline-block"
                    >
                      Call Us
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            {settings.email && (
              <div className="bg-white border border-light p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-light rounded flex items-center justify-center shrink-0 text-muted">
                    <EmailIcon />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-ink mb-2">Email</h3>
                    <p className="text-muted text-sm mb-4">{settings.email}</p>
                    <a
                      href={`mailto:${settings.email}`}
                      className="text-xs font-medium tracking-[0.15em] uppercase border border-ink text-ink px-4 py-2 hover:bg-ink hover:text-white transition-colors inline-block"
                    >
                      Email Us
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            {settings.location && (
              <div className="bg-white border border-light p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-light rounded flex items-center justify-center shrink-0 text-muted">
                    <LocationIcon />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-ink mb-2">
                      Visit Us
                    </h3>
                    <p className="text-muted text-sm leading-relaxed">
                      {settings.location}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact form */}
          <div>
            <h2 className="font-serif text-3xl text-ink mb-6">
              Send a Message
            </h2>
            {sent ? (
              <div className="bg-emerald-50 border border-emerald-200 px-6 py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2"
                  >
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </div>
                <h3 className="font-serif text-2xl text-ink mb-2">
                  Message Sent
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  Thank you for contacting Panda Closet. We'll get back to you
                  shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
                    Name <span className="text-brown">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Your name"
                    className={`w-full bg-white border text-ink text-sm px-4 py-3 focus:outline-none transition-colors placeholder:text-muted ${
                      errors.name
                        ? "border-red-400"
                        : "border-light focus:border-brown"
                    }`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+265 000 000 000"
                    className="w-full bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown transition-colors placeholder:text-muted"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown transition-colors placeholder:text-muted"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
                    Message <span className="text-brown">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="How can we help?"
                    rows={5}
                    className={`w-full bg-white border text-ink text-sm px-4 py-3 focus:outline-none transition-colors placeholder:text-muted resize-none ${
                      errors.message
                        ? "border-red-400"
                        : "border-light focus:border-brown"
                    }`}
                  />
                  {errors.message && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.message}
                    </p>
                  )}
                </div>
                {submitError && (
                  <p role="alert" className="text-red-600 text-sm">
                    {submitError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-ink text-cream text-xs font-medium tracking-[0.2em] uppercase py-4 hover:bg-ink-soft transition-colors disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  )
}
function EmailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}
function LocationIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

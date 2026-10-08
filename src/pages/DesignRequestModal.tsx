import { useState } from "react"
import { useNavigate } from "react-router"
import { useStore } from "../context/store"
import { apiUrl } from "../lib/api"
import {
  generateId,
  isValidLocalPhone,
  MAX_DESIGN_IMAGE_BYTES,
  normalizeLocalPhone,
} from "../lib/utils"

interface Props {
  onClose: () => void
}

export default function DesignRequestModal({ onClose }: Props) {
  const { addOrder } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "",
    phone: "",
    garment: "",
    size: "",
    colour: "",
    details: "",
    designImage: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setError("")
  }

  const readDesignFile = (file?: File) => {
    setError("")
    if (!file) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPG, or WEBP image.")
      return
    }
    if (file.size > MAX_DESIGN_IMAGE_BYTES) {
      setError("That image is too large. Please choose an image under 1.4 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () =>
      setForm((current) => ({
        ...current,
        designImage: String(reader.result || ""),
      }))
    reader.onerror = () => setError("Unable to read that image. Try another one.")
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const phone = normalizeLocalPhone(form.phone)
    if (!form.name.trim() || !form.garment.trim() || !form.details.trim()) {
      setError("Please complete your name, garment type, and design details.")
      return
    }
    if (!phone || !isValidLocalPhone(phone)) {
      setError("Enter a valid 10-digit Malawi phone number starting with 0.")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch(apiUrl("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "design",
          id: generateId(),
          productId: "custom-design-request",
          productSlug: "custom-design-request",
          productName: "Custom Design Request",
          customerName: form.name.trim(),
          phone,
          whatsapp: phone,
          size: form.size.trim() || undefined,
          colour: form.colour.trim() || undefined,
          quantity: 1,
          notes: [
            `Garment: ${form.garment.trim()}`,
            `Design details: ${form.details.trim()}`,
          ].join("\n"),
          designImage: form.designImage || undefined,
          contactPreference: "whatsapp",
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.order) {
        throw new Error(result.message || "Unable to send your request.")
      }
      addOrder(result.order)
      onClose()
      navigate(`/order-success?order=${encodeURIComponent(result.order.orderNumber)}`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send your request. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Close design request form"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-request-title"
        className="relative bg-cream w-full sm:max-w-xl max-h-[92vh] overflow-y-auto sm:mx-4"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 bg-cream border-b border-light px-5 sm:px-7 py-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted mb-1">
              Custom tailoring
            </p>
            <h2 id="design-request-title" className="font-serif text-2xl text-ink">
              Request a Design
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink text-2xl leading-none p-1"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-5 sm:px-7 py-5 grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-xs font-medium text-ink">
                Full name <span className="text-brown">*</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="Your name"
                  className="mt-1.5 w-full border border-light bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:border-brown"
                />
              </label>
              <label className="text-xs font-medium text-ink">
                Phone number <span className="text-brown">*</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(event) => set("phone", normalizeLocalPhone(event.target.value))}
                  placeholder="0990000000"
                  className="mt-1.5 w-full border border-light bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:border-brown"
                />
              </label>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="text-xs font-medium text-ink sm:col-span-1">
                Garment type <span className="text-brown">*</span>
                <input
                  required
                  value={form.garment}
                  onChange={(event) => set("garment", event.target.value)}
                  placeholder="Dress, suit..."
                  className="mt-1.5 w-full border border-light bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:border-brown"
                />
              </label>
              <label className="text-xs font-medium text-ink">
                Size
                <input
                  value={form.size}
                  onChange={(event) => set("size", event.target.value)}
                  placeholder="Your size"
                  className="mt-1.5 w-full border border-light bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:border-brown"
                />
              </label>
              <label className="text-xs font-medium text-ink">
                Preferred colour
                <input
                  value={form.colour}
                  onChange={(event) => set("colour", event.target.value)}
                  placeholder="Colour or fabric"
                  className="mt-1.5 w-full border border-light bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:border-brown"
                />
              </label>
            </div>
            <label className="text-xs font-medium text-ink">
              Design details <span className="text-brown">*</span>
              <textarea
                required
                rows={3}
                value={form.details}
                onChange={(event) => set("details", event.target.value)}
                placeholder="Describe the style, fabric, measurements, or anything else we should know."
                className="mt-1.5 w-full resize-y border border-light bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:border-brown"
              />
            </label>
            <div>
              <label htmlFor="request-design-image" className="text-xs font-medium text-ink block mb-1.5">
                Reference image <span className="text-muted font-normal">(optional)</span>
              </label>
              {form.designImage ? (
                <div className="flex items-center gap-3 border border-light bg-white p-2.5">
                  <img
                    src={form.designImage}
                    alt="Selected design reference"
                    className="h-14 w-12 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => set("designImage", "")}
                    className="text-xs text-red-600 underline"
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <input
                  id="request-design-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => readDesignFile(event.target.files?.[0])}
                  className="block w-full text-sm text-muted file:mr-3 file:border-0 file:bg-white file:px-4 file:py-2.5 file:text-xs file:font-medium file:text-ink hover:file:bg-light"
                />
              )}
              <p className="text-[11px] text-muted mt-1">PNG, JPG, or WEBP · max 1.4 MB</p>
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-cream text-xs font-medium tracking-[0.15em] uppercase py-3.5 hover:bg-ink-soft disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Design Request"}
            </button>
        </form>
      </section>
    </div>
  )
}
/*
 * Purpose: Business configuration page for shop identity, contact details, and WhatsApp setup.
 * Linked to: src/context/store.tsx, src/lib/utils.ts, and the storefront branding/contact data.
 * Note: This page holds the business settings used across the public website.
 */
import { useEffect, useState } from "react"
import { useStore } from "../../context/store"
import type { Settings } from "../../types"

export default function AdminSettings() {
  const { settings, settingsLoading, updateSettings } = useStore()
  const [form, setForm] = useState<Settings>({ ...settings })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!settingsLoading) setForm({ ...settings })
  }, [settings, settingsLoading])

  const set = (k: keyof Settings, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setSaved(false)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await updateSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save settings.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl text-ink">Settings</h1>
        <p className="text-muted text-sm mt-1">
          Configure your business details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Business info */}
        <Section title="Business Information">
          <Field label="Business Name">
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              className={inp()}
            />
          </Field>
          <Field label="Business Description">
            <textarea
              value={form.businessDescription}
              onChange={(e) => set("businessDescription", e.target.value)}
              rows={3}
              className={`${inp()} resize-none`}
            />
          </Field>
        </Section>

        {/* Contact */}
        <Section title="Contact Details">
          <Field
            label="WhatsApp Number"
            note="Use 10 digits starting with 0 (e.g. 0987414840)"
          >
            <input
              type="text"
              value={form.whatsappNumber}
              onChange={(e) =>
                set("whatsappNumber", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="0888131243"
              className={inp()}
            />
          </Field>
          <Field label="Phone Number">
            <input
              type="text"
              value={form.phoneNumber}
              onChange={(e) =>
                set("phoneNumber", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="+265888131243"
              className={inp()}
            />
          </Field>
          <Field label="Email Address">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="pandacloset02@gmail.com"
              className={inp()}
            />
          </Field>
          <Field label="Admin Email" note="Receives order notifications">
            <input
              type="email"
              value={form.adminEmail}
              onChange={(e) => set("adminEmail", e.target.value)}
              placeholder="admin@pandacloset.mw"
              className={inp()}
            />
          </Field>
          <Field label="Physical Location" note="Optional">
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Blantyre, Malawi"
              className={inp()}
            />
          </Field>
        </Section>

        {/* WhatsApp */}
        <Section title="WhatsApp">
          <Field label="Default WhatsApp Message">
            <textarea
              value={form.defaultWhatsappMessage}
              onChange={(e) => set("defaultWhatsappMessage", e.target.value)}
              rows={2}
              className={`${inp()} resize-none`}
            />
            <p className="text-xs text-muted mt-2">
              Use {`{productName}`}, {`{size}`}, {`{colour}`}, {`{orderNumber}`}
              , {`{customerName}`}, or {`{enquiryType}`} to insert details into
              customer messages.
            </p>
          </Field>
        </Section>

        {/* Social */}
        <Section title="Social Media">
          <Field label="Instagram URL">
            <input
              type="url"
              value={form.instagramUrl}
              onChange={(e) => set("instagramUrl", e.target.value)}
              placeholder="https://instagram.com/pandacloset"
              className={inp()}
            />
          </Field>
          <Field label="Facebook URL">
            <input
              type="url"
              value={form.facebookUrl}
              onChange={(e) => set("facebookUrl", e.target.value)}
              placeholder="https://facebook.com/pandacloset"
              className={inp()}
            />
          </Field>
          <Field label="TikTok URL">
            <input
              type="url"
              value={form.tiktokUrl}
              onChange={(e) => set("tiktokUrl", e.target.value)}
              placeholder="https://tiktok.com/@pandacloset"
              className={inp()}
            />
          </Field>
        </Section>

        {/* Currency */}
        <Section title="Currency">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Currency Code">
              <input
                type="text"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                placeholder="MWK"
                className={inp()}
              />
            </Field>
            <Field label="Currency Symbol">
              <input
                type="text"
                value={form.currencySymbol}
                onChange={(e) => set("currencySymbol", e.target.value)}
                placeholder="K"
                className={inp()}
              />
            </Field>
          </div>
        </Section>

        {/* Integration note */}
        <div className="bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-800 leading-relaxed">
          <strong>Email & WhatsApp Notifications</strong>
          <br />
          To enable automatic email notifications, configure{" "}
          <code className="bg-amber-100 px-1">VITE_EMAIL_SERVICE_KEY</code> and{" "}
          <code className="bg-amber-100 px-1">VITE_ADMIN_EMAIL</code>{" "}
          environment variables. For WhatsApp Business API, configure{" "}
          <code className="bg-amber-100 px-1">VITE_WHATSAPP_API_KEY</code>.
          Orders are saved regardless of notification configuration.
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={settingsLoading || saving}
            className="bg-ink text-cream text-xs font-medium tracking-[0.15em] uppercase px-8 py-4 hover:bg-ink-soft transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {error && (
            <p role="alert" className="text-red-600 text-sm">
              {error}
            </p>
          )}
          {saved && (
            <p className="text-emerald-600 text-sm flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
              Settings saved.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

const inp = () =>
  "w-full bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown transition-colors placeholder:text-muted"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-light p-6">
      <h2 className="font-serif text-xl text-ink mb-5">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  children,
  note,
}: {
  label: string
  children: React.ReactNode
  note?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
        {label}
        {note && (
          <span className="text-muted font-normal normal-case ml-2 text-[11px]">
            — {note}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

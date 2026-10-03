/*
 * Purpose: Footer content for the storefront with navigation, social links, and contact actions.
 * Linked to: src/components/layout/Navbar.tsx, src/context/store.tsx, and the public site pages.
 * Note: This component is part of the customer-facing brand shell.
 */
import { Link } from "react-router"
import { useStore } from "../../context/store"
import { buildWhatsAppUrl } from "../../lib/utils"
import { WhatsAppIcon } from "./Navbar"

export default function Footer() {
  const { settings } = useStore()
  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    settings.defaultWhatsappMessage,
  )
  const year = new Date().getFullYear()

  return (
    <footer className="bg-ink text-cream">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/panda-closet-logo.png"
                alt="Panda Closet logo"
                className="h-12 w-auto object-contain"
              />
              <p className="font-serif text-2xl tracking-[0.1em]">
                PANDA CLOSET
              </p>
            </div>
            <p className="font-serif italic text-beige text-lg mb-4">
              Tailored with intention.
            </p>
            <p className="text-muted text-sm leading-relaxed max-w-xs">
              {settings.businessDescription}
            </p>
            {/* Social */}
            {(settings.instagramUrl ||
              settings.facebookUrl ||
              settings.tiktokUrl) && (
              <div className="flex gap-4 mt-6">
                {settings.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-cream transition-colors"
                    aria-label="Instagram"
                  >
                    <InstagramIcon />
                  </a>
                )}
                {settings.facebookUrl && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-cream transition-colors"
                    aria-label="Facebook"
                  >
                    <FacebookIcon />
                  </a>
                )}
                {settings.tiktokUrl && (
                  <a
                    href={settings.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-cream transition-colors"
                    aria-label="TikTok"
                  >
                    <TikTokIcon />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-beige mb-5">
              Navigation
            </p>
            <nav className="flex flex-col gap-3">
              {[
                { to: "/", label: "Home" },
                { to: "/shop", label: "Shop" },
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-muted hover:text-cream text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-beige mb-5">
              Contact
            </p>
            <div className="flex flex-col gap-3">
              {settings.whatsappNumber && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-cream text-sm transition-colors flex items-center gap-2"
                >
                  <WhatsAppIcon size={14} />
                  WhatsApp
                </a>
              )}
              {settings.phoneNumber && (
                <a
                  href={`tel:${settings.phoneNumber}`}
                  className="text-muted hover:text-cream text-sm transition-colors"
                >
                  {settings.phoneNumber}
                </a>
              )}
              {settings.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="text-muted hover:text-cream text-sm transition-colors"
                >
                  {settings.email}
                </a>
              )}
              {settings.location && (
                <p className="text-muted text-sm">{settings.location}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-ink-soft pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-muted text-xs">
            © {year} Panda Closet. All rights reserved.
          </p>
          <p className="text-muted text-xs">Tailored with intention.</p>
        </div>
      </div>
    </footer>
  )
}

function InstagramIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34v-7a8.23 8.23 0 004.81 1.53V6.34a4.85 4.85 0 01-1.04-.35z" />
    </svg>
  )
}

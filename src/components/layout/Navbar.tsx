/*
 * Purpose: Renders the top navigation, mobile menu, and WhatsApp CTA used across the storefront.
 * Linked to: src/context/store.tsx, src/lib/utils.ts, and all public pages.
 * Note: This is a key navigation file for the customer website.
 */
import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router"
import { useStore } from "../../context/store"
import { buildWhatsAppUrl } from "../../lib/utils"

export default function Navbar() {
  const { settings } = useStore()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    settings.defaultWhatsappMessage,
  )

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream border-b border-light transition-colors duration-500">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center shrink-0 group"
            aria-label="Panda Closet home"
          >
            <img
              src="/panda-closet-logo.png"
              alt="Panda Closet logo"
              className="h-12 w-auto md:h-14 transition-opacity opacity-100"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-xs font-medium tracking-[0.15em] uppercase text-ink transition-colors hover:opacity-70 ${
                  location.pathname === link.to
                    ? "border-b border-current pb-0.5"
                    : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium tracking-[0.15em] uppercase text-ink transition-colors hover:opacity-70 flex items-center gap-2"
            >
              <WhatsAppIcon size={16} />
              WhatsApp
            </a>
          </div>

          {/* Mobile right */}
          <div className="flex lg:hidden items-center gap-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-ink transition-colors"
              aria-label="WhatsApp"
            >
              <WhatsAppIcon size={20} />
            </a>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 text-ink transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-cream border-t border-light">
          <nav className="px-6 py-8 flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium tracking-[0.15em] uppercase text-ink hover:text-brown transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium tracking-[0.15em] uppercase text-whatsapp flex items-center gap-2"
            >
              <WhatsAppIcon size={16} />
              Chat on WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

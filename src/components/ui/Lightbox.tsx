/*
 * Purpose: Fullscreen image lightbox so customers can tap a product image and
 * view it filling the whole screen. Closes on click, Esc, or the close button.
 * Linked to: src/pages/Product.tsx.
 */
import { useEffect } from "react"

interface LightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

export default function Lightbox({ src, alt = "", onClose }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Enlarged product image"}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close image"
        className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white transition-colors"
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <img
        src={src}
        alt={alt}
        className="max-h-[92vh] max-w-full w-auto h-auto object-contain rounded-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      <span className="absolute bottom-5 inset-x-0 text-center text-white/60 text-xs tracking-[0.15em] uppercase">
        Tap anywhere to close
      </span>
    </div>
  )
}
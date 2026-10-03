/*
 * Purpose: Homepage for Panda Closet featuring the brand hero, featured products, and WhatsApp CTA.
 * Linked to: src/components/product/ProductCard.tsx, src/components/layout/Navbar.tsx, and the shop flow.
 * Note: This is a core storefront page and must remain visually consistent.
 */
import { Link } from "react-router"
import { useStore } from "../context/store"
import { buildWhatsAppUrl, customizeWhatsAppMessage } from "../lib/utils"
import ProductCard from "../components/product/ProductCard"
import { WhatsAppIcon } from "../components/layout/Navbar"

export default function Home() {
  const { products, productsLoading, settings } = useStore()
  const featured = products
    .filter((p) => p.featured && p.availability !== "hidden")
    .slice(0, 6)
  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    customizeWhatsAppMessage(settings.defaultWhatsappMessage, {
      enquiryType: "I would like to enquire about your clothing collection.",
    }),
  )
  const waMadeToOrder = buildWhatsAppUrl(
    settings.whatsappNumber,
    customizeWhatsAppMessage(settings.defaultWhatsappMessage, {
      enquiryType: "I would like to enquire about made-to-order pieces.",
    }),
  )

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-ink">
        <img
          src="/panda-closet-wallpaper.jpeg"
          alt="Panda Closet wallpaper"
          className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover object-top lg:object-[center_12%] opacity-60 animate-wallpaper"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/55 to-black/60" />
        <div className="relative text-center text-white px-6 py-16 sm:py-20 max-w-3xl mx-auto w-full translate-y-5">
          <img
            src="/panda-closet-logo.png"
            alt="Panda Closet logo"
            className="mx-auto mb-4 h-12 w-auto md:h-14 max-w-[60%] object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.25)]"
          />
          <p className="text-xs font-medium tracking-[0.3em] uppercase mb-6 text-cream/80">
            Panda Closet
          </p>
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-8xl font-light leading-[1.05] mb-6">
            Tailored with
            <br />
            <em>Intention.</em>
          </h1>
          <p className="text-cream/80 text-base sm:text-lg leading-relaxed mb-10 max-w-md mx-auto">
            Discover pieces designed and tailored with care, made to be worn
            your way.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/shop"
              className="bg-white text-ink text-xs font-medium tracking-[0.2em] uppercase px-8 py-4 hover:bg-cream transition-colors min-w-[180px]"
            >
              Shop Collection
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/60 text-white text-xs font-medium tracking-[0.2em] uppercase px-8 py-4 hover:bg-white/10 transition-colors flex items-center gap-2 min-w-[180px] justify-center"
            >
              <WhatsAppIcon size={14} />
              Chat on WhatsApp
            </a>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-px h-10 bg-white/30 animate-pulse" />
        </div>
      </section>

      {/* INTRO */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 text-center">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-5">
            The Collection
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light text-ink mb-6">
            Made. Tailored. Yours.
          </h2>
          <p className="text-muted text-base leading-relaxed max-w-lg mx-auto mb-10">
            Discover pieces designed and tailored by Panda Closet. Browse our
            current collection and contact us to order or enquire about an item.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase text-ink border-b border-ink pb-1 hover:text-brown hover:border-brown transition-colors"
          >
            Explore Collection
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* FEATURED COLLECTION */}
      <section className="bg-cream py-20 lg:py-28">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-3">
                Collection
              </p>
              <h2 className="font-serif text-4xl sm:text-5xl font-light text-ink">
                Featured Collection
              </h2>
            </div>
            <Link
              to="/shop"
              className="text-xs font-medium tracking-[0.2em] uppercase text-ink border-b border-ink pb-1 hover:text-brown hover:border-brown transition-colors shrink-0"
            >
              View All →
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-serif text-3xl text-muted mb-3">
                {productsLoading
                  ? "Loading collection..."
                  : "Our collection is coming together."}
              </p>
              {!productsLoading && (
                <p className="text-muted text-sm">
                  Check back soon for new Panda Closet pieces.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 lg:gap-8">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MADE TO ORDER */}
      <section className="bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-14 lg:py-20">
          <div className="grid grid-cols-[minmax(104px,0.42fr)_minmax(0,1fr)] sm:grid-cols-[minmax(180px,0.45fr)_minmax(0,1fr)] items-center gap-4 sm:gap-8 lg:gap-14">
            <div className="relative aspect-square sm:aspect-[4/5] max-h-[360px] overflow-hidden bg-light">
              <img
                src="/sample.jpeg"
                alt="Made to order tailoring sample"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="py-6 sm:py-10 lg:py-12">
              <div>
                <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-5">
                  Tailoring
                </p>
                <h2 className="font-serif text-4xl sm:text-5xl font-light text-ink mb-6 leading-snug">
                  Made to
                  <br />
                  <em>Order</em>
                </h2>
                <p className="text-muted text-base leading-relaxed mb-8 max-w-sm">
                  Some Panda Closet pieces are created especially after you
                  place your order. Speak with our team about available fabrics,
                  colours, sizing and tailoring requirements.
                </p>
                <a
                  href={waMadeToOrder}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-whatsapp text-white text-xs font-medium tracking-[0.15em] uppercase px-6 py-3.5 hover:opacity-90 transition-opacity"
                >
                  <WhatsAppIcon size={14} />
                  Enquire on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-cream py-20 lg:py-28">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="text-center mb-14">
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-4">
              The Process
            </p>
            <h2 className="font-serif text-4xl sm:text-5xl font-light text-ink">
              How It Works
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {[
              {
                num: "01",
                title: "Browse",
                desc: "Explore pieces from the Panda Closet collection.",
              },
              {
                num: "02",
                title: "Choose",
                desc: "Select an item and review available sizes, colours and details.",
              },
              {
                num: "03",
                title: "Order",
                desc: "Submit an order request or speak directly with us on WhatsApp.",
              },
              {
                num: "04",
                title: "We Take It From There",
                desc: "Our team confirms the details and arranges the next steps with you.",
              },
            ].map((step) => (
              <div key={step.num} className="relative">
                <p className="font-serif text-6xl text-light font-light mb-3">
                  {step.num}
                </p>
                <h3 className="font-serif text-2xl text-ink mb-3">
                  {step.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT PREVIEW */}
      <section className="bg-white py-20 lg:py-24">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-5">
              About
            </p>
            <h2 className="font-serif text-4xl sm:text-5xl font-light text-ink mb-6">
              About Panda Closet
            </h2>
            <p className="text-muted text-base leading-relaxed mb-8">
              Panda Closet brings together carefully selected and locally
              tailored clothing for people who appreciate pieces that feel
              personal, stylish and well made.
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase text-ink border-b border-ink pb-1 hover:text-brown hover:border-brown transition-colors"
            >
              Our Story →
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-ink text-cream py-20 lg:py-28">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light mb-5">
            Found something
            <br />
            you love?
          </h2>
          <p className="text-muted text-base mb-10 max-w-sm mx-auto leading-relaxed">
            Browse our collection or speak directly with Panda Closet.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/shop"
              className="bg-cream text-ink text-xs font-medium tracking-[0.2em] uppercase px-8 py-4 hover:bg-light transition-colors min-w-[180px]"
            >
              Shop Collection
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-cream/30 text-cream text-xs font-medium tracking-[0.2em] uppercase px-8 py-4 hover:bg-white/10 transition-colors flex items-center gap-2 min-w-[180px] justify-center"
            >
              <WhatsAppIcon size={14} />
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

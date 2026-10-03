/*
 * Purpose: Brand story page describing Panda Closet and the tailoring story.
 * Linked to: src/pages/Contact.tsx and the shared settings data used for contact links.
 * Note: This page is part of the public storefront content and not a business logic core.
 */
import { Link } from "react-router"
import { useStore } from "../context/store"
import { buildWhatsAppUrl, customizeWhatsAppMessage } from "../lib/utils"
import { WhatsAppIcon } from "../components/layout/Navbar"

export default function About() {
  const { settings } = useStore()
  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    customizeWhatsAppMessage(settings.defaultWhatsappMessage, {
      enquiryType: "I would like to learn more about Panda Closet.",
    }),
  )

  return (
    <div className="min-h-screen bg-cream pt-16 lg:pt-20">
      <section className="relative bg-ink min-h-[50vh] flex items-end">
        <img
          src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1400&h=700&fit=crop&auto=format"
          alt="Fabric and tailoring"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative px-6 lg:px-16 pb-12 lg:pb-16 max-w-[1440px] mx-auto w-full">
          <p className="text-xs font-medium tracking-[0.3em] uppercase text-cream/70 mb-4">
            About
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-8xl font-light text-white">
            Panda Closet
          </h1>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 lg:px-16 py-16 lg:py-24">
        <div className="max-w-4xl">
          <div className="space-y-6 text-base leading-relaxed text-muted">
            <p>
              <span className="font-serif text-3xl text-ink">Panda Closet</span>{" "}
              is a clothing distribution brand offering thoughtfully selected
              and beautifully made clothing for customers who value comfort,
              style and quality.
            </p>

            <p>
              Our clothes are designed and tailored by{" "}
              <span className="font-semibold text-ink">KAYCIE T&amp;D</span>, a
              clothing design and tailoring shop dedicated to creating well-made
              pieces. Panda Closet works as the official distributor of these
              pieces, bringing the designs to customers through our collections
              and making them easier to discover and order.
            </p>

            <p>
              We focus on presenting clothing that is comfortable, stylish and
              practical — from everyday pieces to specially designed outfits.
            </p>

            <div className="pt-6">
              <h2 className="font-serif text-3xl text-ink mb-4">
                Our Relationship with KAYCIE T&amp;D
              </h2>
              <p>
                <span className="font-semibold text-ink">KAYCIE T&amp;D</span>{" "}
                is the creative and production side of the brand partnership.
                They design, tailor and produce the clothing.
              </p>
              <p className="mt-4">
                <span className="font-semibold text-ink">Panda Closet</span> is
                the distribution and customer-facing side. We showcase the
                available pieces, connect customers with the clothing they want,
                and handle orders and sales.
              </p>
              <p className="mt-4">
                Together, the two businesses allow customers to move from{" "}
                <span className="font-semibold text-ink">
                  design and tailoring → to a simple, accessible shopping
                  experience
                </span>
                .
              </p>
            </div>

            <p className="pt-6 font-semibold text-ink text-lg">
              Designed by KAYCIE T&amp;D.
              <br />
              Distributed by Panda Closet.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase border border-ink text-ink px-6 py-3 hover:bg-ink hover:text-white transition-colors"
            >
              Get in Touch
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-whatsapp text-white text-xs font-medium tracking-[0.15em] uppercase px-6 py-3.5 hover:opacity-90 transition-opacity"
            >
              <WhatsAppIcon size={14} />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="aspect-[4/5] bg-light overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=700&h=900&fit=crop&auto=format"
                alt="Clothing detail"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-4">
                Our Approach
              </p>
              <h2 className="font-serif text-4xl sm:text-5xl font-light text-ink mb-6">
                Thoughtful style, made easy.
              </h2>
              <p className="text-muted text-base leading-relaxed mb-6">
                We focus on pieces that balance style, comfort and practicality,
                making it easy for customers to discover clothing that feels
                right for everyday living and special moments alike.
              </p>
              <p className="text-muted text-base leading-relaxed mb-8">
                Panda Closet makes the experience simple: customers browse the
                collection, choose what they love, and connect with the order
                process through a direct and personal customer experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink text-cream py-16 lg:py-20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <h2 className="font-serif text-4xl sm:text-5xl font-light mb-3">
              Ready to browse?
            </h2>
            <p className="text-muted text-base">
              Explore what's currently available from Panda Closet.
            </p>
          </div>
          <Link
            to="/shop"
            className="shrink-0 bg-cream text-ink text-xs font-medium tracking-[0.2em] uppercase px-8 py-4 hover:bg-light transition-colors"
          >
            Shop Collection
          </Link>
        </div>
      </section>
    </div>
  )
}

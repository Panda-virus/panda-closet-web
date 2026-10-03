/*
 * Purpose: Wraps the public storefront layout with shared navigation, footer, and WhatsApp CTA.
 * Linked to: src/components/layout/Navbar.tsx, src/components/layout/Footer.tsx, and all public pages.
 * Note: This file is the main shell used by the customer-facing site.
 */
import { Outlet } from "react-router"
import Navbar from "./Navbar"
import Footer from "./Footer"
import WhatsAppFAB from "../ui/WhatsAppFAB"

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFAB />
    </div>
  )
}

/*
 * Purpose: Defines the storefront and admin route tree for the application.
 * Linked to: src/components/layout/* and all page files in src/pages/*.
 * Note: This is the central navigation map for the website and admin portal.
 */
import { createBrowserRouter } from "react-router"

import Layout from "./components/layout/Layout"
import AdminLayout from "./components/layout/AdminLayout"

import Home from "./pages/Home"
import Shop from "./pages/Shop"
import Product from "./pages/Product"
import About from "./pages/About"
import Contact from "./pages/Contact"
import OrderSuccess from "./pages/OrderSuccess"

import AdminLogin from "./pages/admin/Login"
import Dashboard from "./pages/admin/Dashboard"
import AdminProducts from "./pages/admin/Products"
import ProductForm from "./pages/admin/ProductForm"
import AdminOrders from "./pages/admin/Orders"
import OrderDetail from "./pages/admin/OrderDetail"
import AdminMessages from "./pages/admin/Messages"
import AdminCategories from "./pages/admin/Categories"
import AdminSettings from "./pages/admin/Settings"

function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-serif text-8xl text-ink/10">404</p>
      <h1 className="font-serif text-4xl text-ink">Page Not Found</h1>
      <p className="text-muted">The page you're looking for doesn't exist.</p>
      <a
        href="/"
        className="text-xs font-medium tracking-[0.2em] uppercase border border-ink text-ink px-6 py-3 hover:bg-ink hover:text-white transition-colors"
      >
        Return Home
      </a>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "shop", Component: Shop },
      { path: "shop/:slug", Component: Product },
      { path: "about", Component: About },
      { path: "contact", Component: Contact },
      { path: "order-success", Component: OrderSuccess },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "/admin",
    children: [
      { index: true, Component: AdminLogin },
      {
        Component: AdminLayout,
        children: [
          { path: "dashboard", Component: Dashboard },
          { path: "products", Component: AdminProducts },
          { path: "products/new", Component: ProductForm },
          { path: "products/:id/edit", Component: ProductForm },
          { path: "orders", Component: AdminOrders },
          { path: "orders/:id", Component: OrderDetail },
          { path: "messages", Component: AdminMessages },
          { path: "categories", Component: AdminCategories },
          { path: "settings", Component: AdminSettings },
        ],
      },
    ],
  },
])

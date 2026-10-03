/*
 * Purpose: Global application state for products, orders, categories, settings, and admin auth.
 * Linked to: src/App.tsx, src/lib/api.ts, product pages, admin pages, and the storefront workflow.
 * Note: This is the central source of business data for the site and dashboard.
 */
import React, { createContext, useContext, useEffect, useState } from "react"
import type {
  Product,
  Order,
  Message,
  Category,
  Settings,
  AdminUser,
} from "../types"
import { DEFAULT_SETTINGS } from "../data/mock"
import { generateId } from "../lib/utils"
import { apiUrl, createProductFormData, resolveApiImage } from "../lib/api"
import { BUSINESS_WHATSAPP_NUMBER } from "../lib/utils"

const STORAGE_KEYS = {
  admin: "panda_admin",
}

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

async function readProducts(includeHidden: boolean) {
  const response = await fetch(
    apiUrl(includeHidden ? "/api/admin/products" : "/api/products"),
    {
      credentials: "include",
    },
  )
  const result = await response.json()
  if (!response.ok) {
    throw new Error(
      result.message || result.error || "Unable to load products.",
    )
  }
  if (!Array.isArray(result))
    throw new Error("The product API returned an invalid catalog.")
  return result.map((product) => ({
    ...product,
    images: Array.isArray(product.images)
      ? product.images.map(resolveApiImage)
      : [],
  })) as Product[]
}

async function readCategories(includeHidden: boolean) {
  const response = await fetch(
    apiUrl(includeHidden ? "/api/admin/categories" : "/api/categories"),
    {
      credentials: "include",
    },
  )
  const result = await response.json()
  if (!response.ok)
    throw new Error(
      result.message || result.error || "Unable to load categories.",
    )
  if (!Array.isArray(result))
    throw new Error("The category API returned an invalid list.")
  return result as Category[]
}

async function ensureApiSuccess(response: Response) {
  const result = await response.json()
  if (!response.ok) {
    throw new Error(
      result.message ||
        result.error ||
        "The product change could not be saved.",
    )
  }
  return result
}

interface StoreCtx {
  // Data
  products: Product[]
  productsLoading: boolean
  categoriesLoading: boolean
  orders: Order[]
  messages: Message[]
  categories: Category[]
  settings: Settings
  admin: AdminUser | null

  // Product actions
  addProduct: (
    p: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>

  // Order actions
  addOrder: (o: Order) => Order
  syncAdminActivity: (serverOrders: Order[], serverMessages: Message[]) => void
  updateOrderStatus: (id: string, status: Order["status"]) => Promise<void>

  // Message actions
  addMessage: (m: Omit<Message, "id" | "createdAt">) => Promise<void>
  updateMessageStatus: (id: string, status: Message["status"]) => Promise<void>

  // Category actions
  addCategory: (name: string, parentId?: string | null) => Promise<void>
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  // Settings
  settingsLoading: boolean
  updateSettings: (s: Partial<Settings>) => Promise<void>

  // Auth
  setAdminSession: (email: string) => void
  logout: () => void
}

const StoreContext = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [admin, setAdmin] = useState<AdminUser | null>(() =>
    load(STORAGE_KEYS.admin, null),
  )

  useEffect(() => {
    let cancelled = false
    setProductsLoading(true)
    readProducts(Boolean(admin?.loggedIn))
      .catch((error) => {
        if (!admin?.loggedIn) throw error
        return readProducts(false)
      })
      .then((nextProducts) => {
        if (!cancelled) setProducts(nextProducts)
      })
      .catch((error) => {
        console.error("Unable to load product catalog:", error)
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [admin?.loggedIn])

  useEffect(() => {
    let cancelled = false
    setCategoriesLoading(true)
    readCategories(Boolean(admin?.loggedIn))
      .catch((error) => {
        if (!admin?.loggedIn) throw error
        return readCategories(false)
      })
      .then((nextCategories) => {
        if (!cancelled) setCategories(nextCategories)
      })
      .catch((error) => {
        console.error("Unable to load categories:", error)
        if (!cancelled) setCategories([])
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [admin?.loggedIn])

  const refreshSettings = async () => {
    setSettingsLoading(true)
    try {
      const response = await fetch(apiUrl("/api/settings/public"))
      if (!response.ok) throw new Error("Unable to load business settings.")
      const remoteSettings: Partial<Settings> = await response.json()
      setSettings({
        ...DEFAULT_SETTINGS,
        ...remoteSettings,
        whatsappNumber: BUSINESS_WHATSAPP_NUMBER,
      })
      return remoteSettings
    } catch (error) {
      console.error("Unable to load business settings:", error)
      return null
    } finally {
      setSettingsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    refreshSettings().then(() => {
      if (cancelled) return
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!admin?.loggedIn) return
    let cancelled = false
    fetch(apiUrl("/api/admin/session"), { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401) {
          if (!cancelled) {
            setAdmin(null)
            localStorage.removeItem(STORAGE_KEYS.admin)
          }
          return null
        }
        if (!response.ok) return null
        return response.json()
      })
      .then((result) => {
        if (!cancelled && result?.admin?.email) {
          const current = { email: result.admin.email, loggedIn: true }
          setAdmin(current)
          save(STORAGE_KEYS.admin, current)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [admin?.loggedIn])

  useEffect(() => {
    const trackWhatsAppEnquiry = (event: MouseEvent) => {
      if (
        window.location.pathname.startsWith("/admin") ||
        !(event.target instanceof Element)
      )
        return
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]")
      if (!anchor) return

      let whatsappUrl: URL
      try {
        whatsappUrl = new URL(anchor.href)
      } catch {
        return
      }
      if (
        whatsappUrl.hostname !== "wa.me" &&
        !whatsappUrl.hostname.endsWith("whatsapp.com")
      )
        return

      const enquiry: Message = {
        id: generateId(),
        name: "Website WhatsApp enquiry",
        message:
          whatsappUrl.searchParams.get("text") ||
          "Customer opened a WhatsApp contact link from the website.",
        status: "unread",
        createdAt: new Date().toISOString(),
      }

      void fetch(apiUrl("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enquiry),
        keepalive: true,
      })
        .then(async (response) => {
          if (!response.ok) return
          const result = await response.json()
          const savedEnquiry = { ...enquiry, id: result.id || enquiry.id }
          setMessages((currentMessages) => [
            savedEnquiry,
            ...currentMessages.filter(
              (message) => message.id !== savedEnquiry.id,
            ),
          ])
        })
        .catch(() => {})
    }

    document.addEventListener("click", trackWhatsAppEnquiry, true)
    return () =>
      document.removeEventListener("click", trackWhatsAppEnquiry, true)
  }, [])

  const persist = (
    key: string,
    setter: React.Dispatch<React.SetStateAction<any>>,
    value: any,
  ) => {
    setter(value)
    save(key, value)
  }

  const refreshProducts = async () => {
    const nextProducts = await readProducts(Boolean(admin?.loggedIn))
    setProducts(nextProducts)
  }

  const addProduct = async (
    data: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ) => {
    const formData = await createProductFormData(data)
    const response = await fetch(apiUrl("/api/admin/products"), {
      method: "POST",
      credentials: "include",
      body: formData,
    })
    await ensureApiSuccess(response)
    await refreshProducts()
  }

  const updateProduct = async (id: string, data: Partial<Product>) => {
    const current = products.find((product) => product.id === id)
    if (!current)
      throw new Error("Product not found. Refresh the catalog and try again.")
    const formData = await createProductFormData({
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    })
    const response = await fetch(
      apiUrl(`/api/admin/products/${encodeURIComponent(id)}`),
      {
        method: "PUT",
        credentials: "include",
        body: formData,
      },
    )
    await ensureApiSuccess(response)
    await refreshProducts()
  }

  const deleteProduct = async (id: string) => {
    const response = await fetch(
      apiUrl(`/api/admin/products/${encodeURIComponent(id)}`),
      {
        method: "DELETE",
        credentials: "include",
      },
    )
    await ensureApiSuccess(response)
    await refreshProducts()
  }

  const addOrder = (order: Order): Order => {
    setOrders((current) => [
      order,
      ...current.filter((item) => item.id !== order.id),
    ])
    return order
  }

  const updateOrderStatus = async (id: string, status: Order["status"]) => {
    const response = await fetch(
      apiUrl(`/api/admin/orders/${encodeURIComponent(id)}`),
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    )
    await ensureApiSuccess(response)
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? { ...order, status, updatedAt: new Date().toISOString() }
          : order,
      ),
    )
  }

  const syncAdminActivity = (
    serverOrders: Order[],
    serverMessages: Message[],
  ) => {
    setOrders((current) => {
      const merged = new Map(current.map((order) => [order.id, order]))
      serverOrders.forEach((order) =>
        merged.set(order.id, { ...merged.get(order.id), ...order }),
      )
      return [...merged.values()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )
    })
    setMessages((current) => {
      const merged = new Map(current.map((message) => [message.id, message]))
      serverMessages.forEach((message) =>
        merged.set(message.id, { ...merged.get(message.id), ...message }),
      )
      return [...merged.values()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )
    })
  }

  const addMessage = async (data: Omit<Message, "id" | "createdAt">) => {
    const response = await fetch(apiUrl("/api/messages"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const result = await ensureApiSuccess(response)
    const message: Message = {
      ...data,
      id: result.id || generateId(),
      createdAt: new Date().toISOString(),
    }
    setMessages((current) => [
      message,
      ...current.filter((item) => item.id !== message.id),
    ])
  }

  const updateMessageStatus = async (id: string, status: Message["status"]) => {
    const response = await fetch(
      apiUrl(`/api/admin/messages/${encodeURIComponent(id)}`),
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    )
    await ensureApiSuccess(response)
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, status } : message,
      ),
    )
  }

  const refreshCategories = async () => {
    setCategories(await readCategories(Boolean(admin?.loggedIn)))
  }

  const addCategory = async (name: string, parentId?: string | null) => {
    const response = await fetch(apiUrl("/api/admin/categories"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId: parentId ?? null }),
    })
    await ensureApiSuccess(response)
    await refreshCategories()
  }

  const updateCategory = async (id: string, data: Partial<Category>) => {
    const response = await fetch(
      apiUrl(`/api/admin/categories/${encodeURIComponent(id)}`),
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    )
    await ensureApiSuccess(response)
    await refreshCategories()
  }

  const deleteCategory = async (id: string) => {
    const response = await fetch(
      apiUrl(`/api/admin/categories/${encodeURIComponent(id)}`),
      {
        method: "DELETE",
        credentials: "include",
      },
    )
    await ensureApiSuccess(response)
    await refreshCategories()
  }

  const updateSettings = async (s: Partial<Settings>) => {
    const next = { ...settings, ...s }
    const response = await fetch(apiUrl("/api/admin/settings"), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
    await ensureApiSuccess(response)
    await refreshSettings()
  }

  const setAdminSession = (email: string) => {
    const user = { email, loggedIn: true }
    setAdmin(user)
    save(STORAGE_KEYS.admin, user)
  }

  const logout = () => {
    setAdmin(null)
    localStorage.removeItem(STORAGE_KEYS.admin)
  }

  return (
    <StoreContext.Provider
      value={{
        products,
        productsLoading,
        orders,
        messages,
        categories,
        categoriesLoading,
        settings,
        settingsLoading,
        admin,
        addProduct,
        updateProduct,
        deleteProduct,
        addOrder,
        updateOrderStatus,
        addMessage,
        updateMessageStatus,
        addCategory,
        updateCategory,
        deleteCategory,
        updateSettings,
        setAdminSession,
        logout,
        syncAdminActivity,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}

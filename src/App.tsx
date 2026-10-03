/*
 * Purpose: Wraps the application in the global store and router provider.
 * Linked to: src/context/store.tsx, src/routes.tsx, and all frontend pages.
 * Note: This file defines the top-level shell used by the website and admin dashboard.
 */
import { RouterProvider } from "react-router"
import { StoreProvider } from "./context/store"
import { router } from "./routes"

export default function App() {
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  )
}

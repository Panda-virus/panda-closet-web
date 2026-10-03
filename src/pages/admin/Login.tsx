/*
 * Purpose: Admin sign-in page for the private Panda Closet dashboard.
 * Linked to: src/context/store.tsx, src/lib/api.ts, and the protected admin API routes.
 * Note: This file enforces private access to the backend dashboard.
 */
import { useState } from "react"
import { Navigate, useNavigate } from "react-router"
import { useStore } from "../../context/store"
import { API_BASE_URL } from "../../lib/api"

export default function AdminLogin() {
  const { setAdminSession, admin } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (admin?.loggedIn) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()
      if (!response.ok)
        throw new Error(result.message || "Invalid email or password.")
      setAdminSession(result.admin?.email || email)
      navigate("/admin/dashboard")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img
            src="/panda-closet-logo.png"
            alt="Panda Closet logo"
            className="h-14 w-auto object-contain mx-auto mb-3"
          />
          <p className="font-serif text-3xl text-cream tracking-[0.08em] mb-2">
            PANDA CLOSET
          </p>
          <p className="text-muted text-sm tracking-[0.2em] uppercase">
            Admin Portal
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-ink-soft border border-ink-soft rounded p-8 flex flex-col gap-5"
        >
          <div>
            <label className="text-xs font-medium tracking-[0.12em] uppercase text-muted block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@pandacloset.com"
              autoComplete="email"
              className={`w-full bg-ink border text-cream text-sm px-4 py-3 focus:outline-none transition-colors placeholder:text-muted/50 ${
                error ? "border-red-500" : "border-ink-soft focus:border-brown"
              }`}
            />
          </div>
          <div>
            <label className="text-xs font-medium tracking-[0.12em] uppercase text-muted block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`w-full bg-ink border text-cream text-sm px-4 py-3 focus:outline-none transition-colors placeholder:text-muted/50 ${
                error ? "border-red-500" : "border-ink-soft focus:border-brown"
              }`}
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brown text-white text-xs font-medium tracking-[0.2em] uppercase py-4 hover:bg-brown-light transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

      </div>
    </div>
  )
}

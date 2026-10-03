/*
 * Purpose: Category management page for creating, editing, and deleting storefront product groups.
 * Linked to: src/pages/admin/Products.tsx, src/context/store.tsx, and the catalog organization model.
 * Note: This file supports the product taxonomy used across the storefront.
 */
import { useState } from "react"
import { useStore } from "../../context/store"

export default function AdminCategories() {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore()
  const [newName, setNewName] = useState("")
  const [newParent, setNewParent] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [actionError, setActionError] = useState("")
  const [saving, setSaving] = useState(false)

  const mainCategories = categories.filter((c) => !c.parentId)
  const subCategories = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    setActionError("")
    try {
      await addCategory(newName.trim(), newParent || null)
      setNewName("")
      setNewParent("")
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to add this category.",
      )
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (id: string) => {
    setSaving(true)
    setActionError("")
    try {
      await updateCategory(id, { name: editName.trim() })
      setEditing(null)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update this category.",
      )
    } finally {
      setSaving(false)
    }
  }

  const handleToggleVisibility = async (id: string, status: string) => {
    setActionError("")
    try {
      await updateCategory(id, {
        status: status === "hidden" ? "active" : "hidden",
      })
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update this category.",
      )
    }
  }

  const handleDelete = async (id: string) => {
    setActionError("")
    try {
      await deleteCategory(id)
      setDeleteConfirm(null)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to delete this category.",
      )
    }
  }

  const renderRow = (
    cat: { id: string; name: string; status: string },
    indent = false,
  ) => (
    <div
      key={cat.id}
      className={`flex items-center gap-3 px-5 py-3 ${
        cat.status === "hidden" ? "opacity-50" : ""
      } ${indent ? "bg-cream/40" : ""}`}
    >
      {editing === cat.id ? (
        <input
          id={`category-edit-${cat.id}`}
          autoFocus
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleEdit(cat.id)
            if (e.key === "Escape") setEditing(null)
          }}
          className="flex-1 bg-white border border-brown text-ink text-sm px-3 py-1.5 focus:outline-none"
        />
      ) : (
        <div className="flex-1">
          <span
            className={`text-ink text-sm ${
              indent ? "font-normal" : "font-medium"
            }`}
          >
            {cat.name}
          </span>
          {indent && (
            <span className="ml-2 text-[10px] text-muted uppercase">
              Subcategory
            </span>
          )}
          {cat.status === "hidden" && (
            <span className="ml-2 text-[10px] text-muted">(hidden)</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0">
        {editing === cat.id ? (
          <>
            <button
              onClick={() => void handleEdit(cat.id)}
              disabled={saving}
              className="text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-200 px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(null)}
              className="text-xs text-muted hover:text-ink border border-light px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setEditing(cat.id)
                setEditName(cat.name)
              }}
              className="text-xs text-muted hover:text-ink border border-light px-3 py-1.5 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => void handleToggleVisibility(cat.id, cat.status)}
              className="text-xs text-muted hover:text-ink border border-light px-3 py-1.5 transition-colors"
            >
              {cat.status === "hidden" ? "Show" : "Hide"}
            </button>
            <button
              onClick={() => setDeleteConfirm(cat.id)}
              className="text-xs text-red-400 hover:text-red-600 border border-red-100 px-3 py-1.5 transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl text-ink">Categories</h1>
        <p className="text-muted text-sm mt-1">
          Top-level categories with subcategories
        </p>
      </div>

      {/* Add category */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-3 mb-8"
      >
        <input
          id="category-name-input"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Category or subcategory name..."
          className="flex-1 bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown transition-colors"
        />
        <select
          id="category-parent-select"
          value={newParent}
          onChange={(e) => setNewParent(e.target.value)}
          className="bg-white border border-light text-ink text-sm px-4 py-3 focus:outline-none focus:border-brown cursor-pointer sm:w-56"
        >
          <option value="">Top-level category</option>
          {mainCategories.map((c) => (
            <option key={c.id} value={c.id}>
              Subcategory of {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!newName.trim() || saving}
          className="bg-ink text-cream text-xs font-medium tracking-[0.15em] uppercase px-6 py-3 hover:bg-ink-soft transition-colors disabled:opacity-40"
        >
          {saving ? "Saving..." : "Add"}
        </button>
      </form>

      {actionError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {/* Categories list */}
      <div className="bg-white border border-light divide-y divide-light">
        {categories.length === 0 ? (
          <p className="px-5 py-8 text-muted text-sm text-center">
            No categories yet.
          </p>
        ) : (
          mainCategories.map((main) => (
            <div key={main.id}>
              {renderRow(main)}
              {subCategories(main.id).length > 0 && (
                <div className="divide-y divide-light/70">
                  {subCategories(main.id).map((sub) => renderRow(sub, true))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white border border-light p-8 max-w-sm w-full text-center">
            <h3 className="font-serif text-2xl text-ink mb-3">
              Delete Category?
            </h3>
            <p className="text-muted text-sm mb-6">
              This will remove the category and its subcategories. Products in
              this category will not be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-light text-ink text-sm py-3 hover:border-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete(deleteConfirm)}
                disabled={saving}
                className="flex-1 bg-red-500 text-white text-sm py-3 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

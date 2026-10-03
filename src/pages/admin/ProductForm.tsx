/*
 * Purpose: Create and edit form for admin product entries, including images, pricing, stock states, and metadata.
 * Linked to: src/pages/admin/Products.tsx, src/context/store.tsx, and the product schema.
 * Note: This file drives the admin product creation and edit workflow.
 */
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { useStore } from "../../context/store"
import { slugify } from "../../lib/utils"
import type { Availability } from "../../types"

const SIZES_DEFAULT = ["XS", "S", "M", "L", "XL", "XXL", "Custom"]
const PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_D1_IMAGE_SIZE = 1_400_000

// A broad tailoring/fabric colour catalogue grouped by family. Admins click the
// colours their pieces are available in, and can still type any extra custom
// colour in the box below.
const COLOUR_FAMILIES: { label: string; colours: string[] }[] = [
  {
    label: "Neutrals",
    colours: [
      "Black",
      "Jet Black",
      "Charcoal",
      "Anthracite",
      "Dark Grey",
      "Grey",
      "Silver",
      "Stone",
      "Pewter",
      "Taupe",
      "Beige",
      "Sand",
      "Oat",
      "Camel",
      "Khaki",
      "Navy",
      "Midnight",
    ],
  },
  {
    label: "Whites & Creams",
    colours: [
      "White",
      "Off White",
      "Ivory",
      "Cream",
      "Pearl",
      "Bone",
      "Ecru",
      "Eggshell",
      "Linen",
      "Champagne",
    ],
  },
  {
    label: "Browns & Tans",
    colours: [
      "Brown",
      "Chocolate",
      "Coffee",
      "Mocha",
      "Walnut",
      "Chestnut",
      "Caramel",
      "Tan",
      "Cognac",
      "Rust",
      "Ochre",
      "Clay",
      "Umber",
      "Hazel",
      "Bronze",
      "Copper",
    ],
  },
  {
    label: "Reds & Pinks",
    colours: [
      "Red",
      "Scarlet",
      "Crimson",
      "Burgundy",
      "Maroon",
      "Wine",
      "Brick",
      "Tomato",
      "Coral",
      "Salmon",
      "Rose",
      "Pink",
      "Blush",
      "Hot Pink",
      "Magenta",
      "Fuchsia",
      "Cerise",
      "Raspberry",
    ],
  },
  {
    label: "Oranges & Yellows",
    colours: [
      "Orange",
      "Tangerine",
      "Apricot",
      "Peach",
      "Mango",
      "Amber",
      "Mustard",
      "Golden Yellow",
      "Yellow",
      "Lemon",
      "Daffodil",
      "Saffron",
      "Buttercup",
      "Rose Gold",
    ],
  },
  {
    label: "Greens",
    colours: [
      "Green",
      "Sage",
      "Olive",
      "Moss",
      "Forest Green",
      "Emerald",
      "Hunter Green",
      "Teal",
      "Seafoam",
      "Mint",
      "Jade",
      "Pistachio",
      "Lime",
      "Chartreuse",
      "Pine",
      "Fern",
    ],
  },
  {
    label: "Blues",
    colours: [
      "Blue",
      "Sky Blue",
      "Baby Blue",
      "Powder Blue",
      "Steel Blue",
      "Royal Blue",
      "Cobalt",
      "Navy Blue",
      "Denim",
      "Indigo",
      "Periwinkle",
      "Turquoise",
      "Cornflower",
      "Tiffany",
    ],
  },
  {
    label: "Purples",
    colours: [
      "Purple",
      "Violet",
      "Lilac",
      "Lavender",
      "Orchid",
      "Mauve",
      "Plum",
      "Grape",
      "Amethyst",
      "Wisteria",
      "Deep Purple",
      "Lilac Mist",
    ],
  },
  {
    label: "Prints & Specials",
    colours: [
      "Ankara",
      "Chitenge",
      "Kitenge",
      "Kente",
      "Kikoy",
      "Tye-dye",
      "Tartan",
      "Plaid",
      "Gingham",
      "Stripes",
      "Floral",
      "Paisley",
      "Cheetah",
      "Zebra",
      "Camouflage",
      "Sequins",
      "Velvet",
      "Satin",
      "Silk",
    ],
  },
]

const ALL_PALETTE_COLOURS = new Set(
  COLOUR_FAMILIES.flatMap((family) => family.colours.map((c) => c.toLowerCase())),
)

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Unable to read image data."))
    reader.readAsDataURL(blob)
  })

const compressImageForD1 = async (file: File) => {
  const bitmap = await createImageBitmap(file)

  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    let width = Math.max(1, Math.round(bitmap.width * scale))
    let height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    if (!context) throw new Error("Unable to process this image.")

    for (let attempt = 0; attempt < 8; attempt += 1) {
      canvas.width = width
      canvas.height = height
      context.drawImage(bitmap, 0, 0, width, height)

      const quality = attempt < 3 ? 0.82 - attempt * 0.1 : 0.72
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("Unable to compress this image.")),
          "image/webp",
          quality,
        )
      })

      if (blob.size <= MAX_D1_IMAGE_SIZE) return readBlobAsDataUrl(blob)

      if (attempt >= 2) {
        width = Math.max(1, Math.round(width * 0.8))
        height = Math.max(1, Math.round(height * 0.8))
      }
    }

    throw new Error("Image is too large to store in D1. Choose a smaller image.")
  } finally {
    bitmap.close()
  }
}

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { products, productsLoading, categories, addProduct, updateProduct } =
    useStore()
  const navigate = useNavigate()

  const existing = isEdit ? products.find((p) => p.id === id) : null

  const [form, setForm] = useState({
    name: existing?.name ?? "",
    description: existing?.description ?? "",
    category: existing?.category ?? "",
    price: existing?.price?.toString() ?? "",
    salePrice: existing?.salePrice?.toString() ?? "",
    availability: (existing?.availability ?? "available") as Availability,
    featured: existing?.featured ?? false,
    sizes: existing?.sizes ?? [],
    colours: existing?.colours ?? [],
    images: existing?.images ?? [],
    notes: existing?.notes ?? "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!existing) return
    setForm({
      name: existing.name,
      description: existing.description,
      category: existing.category,
      price: existing.price.toString(),
      salePrice: existing.salePrice?.toString() ?? "",
      availability: existing.availability,
      featured: existing.featured,
      sizes: existing.sizes,
      colours: existing.colours,
      images: existing.images,
      notes: existing.notes ?? "",
    })
  }, [existing])

  const set = (k: string, v: any) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: "" }))
  }

  const toggleSize = (s: string) => {
    set(
      "sizes",
      form.sizes.includes(s)
        ? form.sizes.filter((x) => x !== s)
        : [...form.sizes, s],
    )
  }

  const toggleColour = (c: string) => {
    set(
      "colours",
      form.colours.includes(c)
        ? form.colours.filter((x) => x !== c)
        : [...form.colours, c],
    )
  }

  const customColours = form.colours.filter(
    (c) => !ALL_PALETTE_COLOURS.has(c.toLowerCase()),
  )

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Product name is required."
    if (!form.category) e.category = "Category is required."
    if (!form.price || isNaN(Number(form.price)))
      e.price = "Valid price is required."
    return e
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const error =
      form.images.length + files.length > 10
        ? "A product can have up to 10 images."
        : files.some((file) => !PRODUCT_IMAGE_TYPES.has(file.type))
          ? "Use JPG, PNG, or WEBP images."
          : files.some((file) => file.size > MAX_PRODUCT_IMAGE_SIZE)
            ? "Each image must be 5 MB or smaller."
            : ""

    if (error) {
      setErrors((prev) => ({ ...prev, images: error }))
      event.target.value = ""
      return
    }

    try {
      const nextImages = await Promise.all(
        files.map(compressImageForD1),
      )
      set("images", [...form.images, ...nextImages])
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        images:
          error instanceof Error
            ? error.message
            : "Unable to read the selected image.",
      }))
    }

    event.target.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setSaving(true)
    const images = form.images.filter(Boolean)
    const data = {
      name: form.name,
      slug: slugify(form.name),
      description: form.description,
      category: form.category,
      price: Number(form.price),
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      availability: form.availability,
      featured: form.featured,
      sizes: form.sizes,
      colours: form.colours,
      images,
      notes: form.notes || undefined,
    }
    try {
      if (isEdit && existing) {
        await updateProduct(existing.id, data)
      } else if (!isEdit) {
        await addProduct(data)
      }
      navigate("/admin/products")
    } catch (error) {
      setErrors((current) => ({
        ...current,
        submit:
          error instanceof Error
            ? error.message
            : "Unable to save this product.",
      }))
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && productsLoading) {
    return <p className="py-12 text-center text-muted">Loading product...</p>
  }

  if (isEdit && !existing) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted mb-4">This product could not be found.</p>
        <button
          onClick={() => navigate("/admin/products")}
          className="text-xs uppercase tracking-wider border-b border-ink pb-1"
        >
          Back to Products
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-muted hover:text-ink transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M19 12H5" />
            <polyline points="12,19 5,12 12,5" />
          </svg>
        </button>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink">
          {isEdit ? "Edit Product" : "Add Product"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-7">
        {errors.submit && (
          <p role="alert" className="text-red-600 text-sm">
            {errors.submit}
          </p>
        )}
        {/* Name */}
        <Field label="Product Name" error={errors.name} required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Linen Two-Piece Set"
            className={input(errors.name)}
          />
        </Field>

        {/* Category */}
        <Field label="Category" error={errors.category} required>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={input(errors.category)}
          >
            <option value="">Select category...</option>
            {categories
              .filter((c) => !c.parentId && c.status === "active")
              .map((main) => (
                <optgroup key={main.id} label={main.name}>
                  <option key={main.id} value={main.name}>
                    {main.name}
                  </option>
                  {categories
                    .filter(
                      (c) => c.parentId === main.id && c.status === "active",
                    )
                    .map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            placeholder="Describe the piece..."
            className={`${input()} resize-none`}
          />
        </Field>

        {/* Price row */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (K)" error={errors.price} required>
            <input
              type="number"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="45000"
              className={input(errors.price)}
            />
          </Field>
          <Field label="Sale Price (K)" note="Optional">
            <input
              type="number"
              value={form.salePrice}
              onChange={(e) => set("salePrice", e.target.value)}
              placeholder="—"
              className={input()}
            />
          </Field>
        </div>

        {/* Availability */}
        <Field label="Availability">
          <div className="flex flex-wrap gap-2">
            {([
              "available",
              "made-to-order",
              "sold-out",
              "hidden",
            ] as Availability[]).map((av) => (
              <button
                type="button"
                key={av}
                onClick={() => set("availability", av)}
                className={`px-4 py-2 text-sm border capitalize transition-colors ${
                  form.availability === av
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink border-light hover:border-ink"
                }`}
              >
                {av.replace("-", " ")}
              </button>
            ))}
          </div>
        </Field>

        {/* Featured */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => set("featured", !form.featured)}
            className={`w-10 h-6 rounded-full transition-colors relative ${
              form.featured ? "bg-brown" : "bg-light"
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${
                form.featured ? "left-5" : "left-1"
              }`}
            />
          </button>
          <label className="text-sm text-ink">Featured on homepage</label>
        </div>

        {/* Sizes */}
        <Field label="Sizes">
          <div className="flex flex-wrap gap-2">
            {SIZES_DEFAULT.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => toggleSize(s)}
                className={`px-3 py-1.5 text-sm border transition-colors ${
                  form.sizes.includes(s)
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink border-light hover:border-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Custom size (press Enter)"
            className={`${input()} mt-2 text-sm`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                const val = (e.target as HTMLInputElement).value.trim()
                if (val && !form.sizes.includes(val)) {
                  toggleSize(val)
                  ;(e.target as HTMLInputElement).value = ""
                }
              }
            }}
          />
        </Field>

        {/* Colours */}
        <Field
          label="Colours"
          note="Choose from the ready-made palette, or add any colour you like"
        >
          <div className="space-y-4">
            {COLOUR_FAMILIES.map((family) => (
              <div key={family.label}>
                <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted mb-2">
                  {family.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {family.colours.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleColour(c)}
                      className={`px-3 py-1.5 text-sm border transition-colors ${
                        form.colours.includes(c)
                          ? "bg-ink text-white border-ink"
                          : "bg-white text-ink border-light hover:border-ink"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {customColours.length > 0 && (
              <div>
                <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted mb-2">
                  Custom colours
                </p>
                <div className="flex flex-wrap gap-2">
                  {customColours.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleColour(c)}
                      className={`px-3 py-1.5 text-sm border transition-colors ${
                        form.colours.includes(c)
                          ? "bg-ink text-white border-ink"
                          : "bg-white text-ink border-light hover:border-ink"
                      }`}
                    >
                      {c} ×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Type any other colour and press Enter"
              className={`${input()} text-sm`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val && !form.colours.includes(val)) {
                    toggleColour(val)
                    ;(e.target as HTMLInputElement).value = ""
                  }
                }
              }}
            />
          </div>
          <p className="text-xs text-muted mt-1.5">
            Selections here are shown to customers as suggested colours on the
            storefront — customers can also type any other colour they want.
          </p>
        </Field>

        {/* Images */}
        <Field
          label="Product Images"
          note="JPG, PNG, or WEBP, up to 5 MB each; 10 images maximum"
          error={errors.images}
        >
          <div className="space-y-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageUpload}
              className="block w-full text-sm text-ink file:mr-4 file:py-2.5 file:px-4 file:border-0 file:text-xs file:font-medium file:tracking-[0.12em] file:uppercase file:bg-ink file:text-cream hover:file:bg-ink/90"
            />

            {form.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {form.images.map((image, index) => (
                  <div key={`${image}-${index}`} className="relative group">
                    <img
                      src={image}
                      alt={`Product preview ${index + 1}`}
                      className="h-28 w-full object-cover rounded border border-light"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "images",
                          form.images.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Field>

        {/* Notes */}
        <Field
          label="Additional Notes"
          note="Shown with the standard notes below, which always appear on the order form"
        >
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Any additional information... (added on top of the standard notes)"
            className={`${input()} resize-none`}
          />
          <p className="text-xs text-muted mt-1.5">
            Standard, always-on notes: "Price may be adjusted if you bring your
            own materials." and "Custom sizes can be ordered. Custom-made pieces
            may attract different pricing."
          </p>
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-ink text-cream text-xs font-medium tracking-[0.15em] uppercase px-8 py-4 hover:bg-ink-soft transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Product"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="border border-light text-ink text-xs font-medium tracking-[0.15em] uppercase px-8 py-4 hover:border-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

const input = (error?: string) =>
  `w-full bg-white border text-ink text-sm px-4 py-3 focus:outline-none transition-colors ${
    error ? "border-red-400" : "border-light focus:border-brown"
  }`

function Field({
  label,
  children,
  error,
  note,
  required,
}: {
  label: string
  children: React.ReactNode
  error?: string
  note?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-medium tracking-[0.12em] uppercase text-ink block mb-2">
        {label}
        {required && <span className="text-brown ml-1">*</span>}
        {note && (
          <span className="text-muted font-normal normal-case ml-2">
            ({note})
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

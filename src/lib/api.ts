const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim()

export const API_BASE_URL = (
  configuredApiBase ||
  ""
).replace(/\/+$/, "")

export const apiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`

export function resolveApiImage(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return path

  return apiUrl(path)
}

const storedImagePath = (path: string) =>
  path.startsWith(`${API_BASE_URL}/`) ? path.slice(API_BASE_URL.length) : path

// Convert data URI to Blob
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",")
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg"
  const bstr = atob(parts[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }
  return new Blob([u8arr], { type: mimeType })
}

export async function createProductFormData<T extends { images: string[] }>(
  product: T,
) {
  const formData = new FormData()

  const retainedImages: string[] = []

  let uploadIndex = 0

  for (const image of product.images) {
    if (!image.startsWith("data:")) {
      retainedImages.push(storedImagePath(image))

      continue
    }

    try {
      const blob = dataUrlToBlob(image)
      const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"

      formData.append("images", blob, `product-image-${uploadIndex}.${extension}`)

      uploadIndex += 1
    } catch (error) {
      console.error("Failed to convert image:", error)
      throw new Error("Failed to process image. Please try again.")
    }
  }

  formData.append(
    "product",
    JSON.stringify({ ...product, images: retainedImages }),
  )

  return formData
}

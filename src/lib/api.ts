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

    const blob = await (await fetch(image)).blob()

    const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"

    formData.append("images", blob, `product-image-${uploadIndex}.${extension}`)

    uploadIndex += 1
  }

  formData.append(
    "product",
    JSON.stringify({ ...product, images: retainedImages }),
  )

  return formData
}

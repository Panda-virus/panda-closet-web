/*
 * Purpose: Default business settings used as a fallback until the backend API
 *          responds with live settings.
 * Linked to: src/context/store.tsx and the settings-loaded state.
 */
import type { Settings } from "../types"
import { BUSINESS_WHATSAPP_NUMBER } from "../lib/utils"

export const DEFAULT_SETTINGS: Settings = {
  businessName: "Panda Closet",
  whatsappNumber: BUSINESS_WHATSAPP_NUMBER,
  phoneNumber: "0999000000",
  email: "hello@pandacloset.mw",
  adminEmail: "admin@pandacloset.mw",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  location: "",
  defaultWhatsappMessage:
    "Hello Panda Closet, I would like to enquire about your clothing collection.",
  currency: "MWK",
  currencySymbol: "K",
  businessDescription:
    "Panda Closet brings together carefully selected and locally tailored clothing for people who appreciate pieces that feel personal, stylish and well made.",
}

/*
 * Purpose: Default business settings used as a fallback until the backend API
 *          responds with live settings.
 * Linked to: src/context/store.tsx and the settings-loaded state.
 */
import type { Settings } from "../types"
import {
  BUSINESS_EMAIL,
  BUSINESS_LOCATION,
  BUSINESS_PHONE_NUMBER,
  BUSINESS_WHATSAPP_NUMBER,
} from "../lib/utils"

export const DEFAULT_SETTINGS: Settings = {
  businessName: "Panda Closet",
  whatsappNumber: BUSINESS_WHATSAPP_NUMBER,
  phoneNumber: BUSINESS_PHONE_NUMBER,
  email: BUSINESS_EMAIL,
  adminEmail: "admin@pandacloset.mw",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  location: BUSINESS_LOCATION,
  defaultWhatsappMessage:
    "Hello Panda Closet, I would like to see what you have available in your collection.",
  currency: "MWK",
  currencySymbol: "K",
  businessDescription:
    "Panda Closet brings together carefully selected and locally tailored clothing for people who appreciate pieces that feel personal, stylish and well made.",
}

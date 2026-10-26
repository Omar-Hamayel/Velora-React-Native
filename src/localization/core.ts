import { initReactI18next } from "react-i18next";
import { createInstance } from "i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

export type Language = "en" | "ar";
export function isLanguage(value: unknown): value is Language { return value === "en" || value === "ar"; }
export function deviceLanguage(code?: string | null): Language { return code?.split(/[-_]/)[0] === "ar" ? "ar" : "en"; }
export function direction(language: string): "rtl" | "ltr" { return language === "ar" ? "rtl" : "ltr"; }
export const resources = { en: { translation: en }, ar: { translation: ar } };
export function makeI18n(language: Language = "en") {
  const instance = createInstance().use(initReactI18next);
  void instance.init({ resources, lng: language, supportedLngs: ["en", "ar"], fallbackLng: "en", returnNull: false, returnEmptyString: false,
    initAsync: false, interpolation: { escapeValue: false } });
  return instance;
}
export const i18n = makeI18n();
export const translate = (key: string, options?: Record<string, unknown>): string => String(i18n.t(key, options ?? {}));

// Presentation only: never use the result to construct a request or identify a catalog row.
export function recommendationText(item: { recommendationCatalogId: string | null; title: string; description: string }, field: "title" | "description") {
  const key = `recommendations.${item.recommendationCatalogId}.${field}`;
  return i18n.exists(key) ? translate(key) : item[field];
}
export function reasonText(code: string): string | null {
  const key = `reasonCodes.${code}`;
  return i18n.exists(key) ? translate(key) : null;
}
export function localizedReasons(item: { reasonCodes: string[]; explanation?: string | null }) {
  const known = item.reasonCodes.map(reasonText).filter((s): s is string => s !== null);
  // Unknown or absent structured reasons retain the server snapshot as an explicit English fallback.
  const fallback = item.reasonCodes.length === 0 || known.length !== item.reasonCodes.length ? item.explanation : null;
  return { known, fallback };
}

// Accept Arabic/Persian digits and the Arabic decimal separator; never infer units or strip arbitrary letters.
export function normalizeDigits(value: string): string {
  return value.replace(/[\u0660-\u0669]/g, c => String(c.charCodeAt(0) - 0x660)).replace(/[\u06f0-\u06f9]/g, c => String(c.charCodeAt(0) - 0x6f0)).replace(/\u066b/g, ".");
}
export function medicalNumber(value: string): number {
  const normalized = normalizeDigits(value).trim();
  return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
}

/**
 * The site's language switch. Everything else — hreflang, sitemap,
 * getStaticPaths, the language toggle — derives from LOCALES. Adding
 * English is changing ONE line here.
 */

export const DEFAULT_LOCALE = "es";

/* ⬇️  THE ONE LINE THAT CHANGES THE DAY ENGLISH SHIPS  ⬇️ */
export const LOCALES = ["es"] as const;
// export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** BCP-47 tags for <html lang> and hreflang. */
export const LOCALE_TAGS: Record<string, string> = {
	es: "es-SV",
	en: "en-US",
};

/** What Open Graph expects (og:locale). */
export const OG_LOCALES: Record<string, string> = {
	es: "es_SV",
	en: "en_US",
};

export function isLocale(value: unknown): value is Locale {
	return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

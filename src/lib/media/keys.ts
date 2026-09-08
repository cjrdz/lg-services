/**
 * Naming for everything in R2. Deliberately a SHARED module.
 *
 * Imported by the browser uploader, the API routes, the zod schema, and
 * Keystatic validation. If each had its own idea of what a valid path looks
 * like, she'd eventually upload something the site can't find. One
 * definition, here.
 *
 * Key scheme:
 *
 *   media/<vertical>/<listing>/<photoId>/<width>.webp
 *   trash/<yyyy-mm-dd>/<original-key>     ← soft delete, 30-day lifecycle
 *   index/sha256/<hex>                    ← 0-byte marker for dedupe
 *
 * What she copies into Keystatic is the STEM — no width, no extension:
 *
 *   media/propiedades/casa-santa-tecla-3h/k7x2f9a1
 *
 * <R2Image> appends "/960.webp" on the fly. One string to copy, and the
 * whole srcset is derivable from it.
 */

export const VERTICALES = ["propiedades", "vehiculos", "bufete"] as const;
export type Vertical = (typeof VERTICALES)[number];

/**
 * Widths generated at upload time. The browser produces all of them from a
 * single photo; never upscales past the original.
 */
export const ANCHOS = [240, 480, 960, 1600, 2400] as const;
export type Ancho = (typeof ANCHOS)[number];

export const ANCHOS_GALERIA = [480, 960, 1600] as const;

/** A photoId is 8 base36 characters. */
const RE_FOTO_ID = /^[a-z0-9]{8}$/;
/** A listing slug: lowercase, digits, hyphens. */
const RE_SLUG = /^[a-z0-9][a-z0-9-]{1,80}$/;

/** The full stem — the only thing stored in content. */
export const RE_TALLO = new RegExp(
	`^media/(${VERTICALES.join("|")})/[a-z0-9][a-z0-9-]{1,80}/[a-z0-9]{8}$`,
);

export function esVertical(v: unknown): v is Vertical {
	return typeof v === "string" && (VERTICALES as readonly string[]).includes(v);
}

export function esSlug(v: unknown): v is string {
	return typeof v === "string" && RE_SLUG.test(v);
}

export function esFotoId(v: unknown): v is string {
	return typeof v === "string" && RE_FOTO_ID.test(v);
}

export function esTallo(v: unknown): v is string {
	return typeof v === "string" && RE_TALLO.test(v);
}

/**
 * Turns free text into a slug. Strips accents, exactly what breaks a URL
 * when someone types "Casa en Santa Tecla con jardín".
 */
export function slugificar(texto: string): string {
	return (
		texto
			.normalize("NFD")
			// Combining-diacritics range: separates the accent from the letter, then drops it.
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80)
	);
}

/**
 * Generates a photo id in the BROWSER, before upload.
 *
 * Generating it beforehand is what makes retries harmless: a second attempt
 * writes the exact same keys instead of creating a copy. Also kills the
 * two-photos-named-IMG_2847.JPG problem at the root.
 */
export function nuevoFotoId(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

export function construirTallo(
	vertical: Vertical,
	anuncio: string,
	fotoId: string,
): string {
	return `media/${vertical}/${anuncio}/${fotoId}`;
}

export function construirClave(tallo: string, ancho: number): string {
	return `${tallo}/${ancho}.webp`;
}

/** Splits a stem apart. Returns null if it doesn't have the expected shape. */
export function partirTallo(
	tallo: string,
): { vertical: Vertical; anuncio: string; fotoId: string } | null {
	if (!esTallo(tallo)) return null;
	const [, vertical, anuncio, fotoId] = tallo.split("/");
	return { vertical: vertical as Vertical, anuncio, fotoId };
}

/** Today's trash prefix, for soft delete. */
export function claveBasura(clave: string, fecha = new Date()): string {
	return `trash/${fecha.toISOString().slice(0, 10)}/${clave}`;
}

export function claveIndiceSha(sha256: string): string {
	return `index/sha256/${sha256}`;
}

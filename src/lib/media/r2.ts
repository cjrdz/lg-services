import { ANCHOS_GALERIA, esTallo } from "./keys";

/**
 * Builds URLs for photos stored in R2.
 *
 * EVERY photo URL comes from here. It's the single point of change if
 * Cloudflare image transformations ever get turned on: rewrite `r2Url` and
 * neither <R2Image> nor the pages notice.
 *
 * Deliberately NOT using those transformations today. The free tier gives
 * 5,000 unique transforms/month, and a 5-width srcset over ~1,000 photos is
 * exactly 5,000 — brushing the limit from month one, with the counter
 * resetting every time a width changes. Instead, Lisbeth's browser generates
 * the WebP files at upload time. Serving costs ~$0 since R2 egress is free.
 */

const CRUDO = (import.meta.env.PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/+$/, "");

/*
  Until the bucket exists, wrangler.jsonc carries a placeholder instead of a
  URL. Checking it's genuinely http(s) avoids generating broken paths like
  "PENDIENTE-.../media/.../960.webp", which would look like a broken photo
  with no clue why.
*/
export const MEDIA_CONFIGURADO = /^https?:\/\//i.test(CRUDO);
const BASE = MEDIA_CONFIGURADO ? CRUDO : "";

/**
 * URL for a photo at one width.
 *
 * Accepts three shapes, in this order:
 *  · http(s)://…      returned as-is (escape hatch for edge cases)
 *  · media/…          R2 stem -> BASE/stem/<width>.webp
 *  · anything else    treated as a site path (public/)
 */
export function r2Url(tallo: string, ancho: number): string {
	const limpio = tallo.trim().replace(/^\/+/, "");
	if (!limpio) return "";
	if (/^https?:\/\//i.test(limpio)) return limpio;
	if (!limpio.startsWith("media/")) return `/${limpio}`;
	// No bucket configured -> return "" so <R2Image> draws nothing, instead
	// of an <img> pointing at a made-up address.
	if (!MEDIA_CONFIGURADO) return "";
	return `${BASE}/${limpio}/${ancho}.webp`;
}

export function r2Srcset(tallo: string, anchos: readonly number[]): string {
	if (!MEDIA_CONFIGURADO) return "";
	return anchos.map((a) => `${r2Url(tallo, a)} ${a}w`).join(", ");
}

export { ANCHOS_GALERIA, esTallo };

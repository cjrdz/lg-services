import type { ImageMetadata } from "astro";

/**
 * Bridge between the paths Keystatic stores and `astro:assets`.
 *
 * Keystatic stores the image as TEXT ("/src/assets/images/perfil.jpg"), but
 * <Image> needs an imported ImageMetadata. This glob imports all of
 * src/assets/images at build time and resolves one from the other.
 *
 * Why not leave them in public/: Astro doesn't touch anything there.
 * lg-blog's originals weighed 5-9 MB each and were served raw — 34 MB of
 * unoptimized JPEG. From src/assets, Astro generates WebP/AVIF at several sizes.
 *
 * Note: this is ONLY for repo images (portrait, office, blog covers).
 * Listing photos go to R2 and use a different component.
 */

/*
  `eager: true` pulls everything matching into the build graph, and Astro
  emits every imported file — even one no page uses. That's why folders
  starting with "_" are excluded: already-optimized photos that don't have a
  page yet live there (src/assets/images/_reserva/). When one is needed, it
  moves up one level and becomes available on its own.

  Same convention as the `[^_]*` templates pattern in src/content.config.ts.
*/
const IMAGENES = import.meta.glob<{ default: ImageMetadata }>(
	[
		"/src/assets/images/**/*.{jpeg,jpg,png,webp,avif}",
		// The negative pattern has to live in the glob itself: filtering the
		// object afterward is pointless, since Vite has already resolved the
		// imports and will emit the files regardless.
		"!/src/assets/images/_*/**",
	],
	{ eager: true },
);

/** Available paths, for useful error messages. */
export const rutasDisponibles = Object.keys(IMAGENES).sort();

/**
 * Resolves the stored path to ImageMetadata.
 * Returns undefined if it doesn't exist — the caller decides if that's fatal.
 */
export function resolverImagen(ruta: string | undefined): ImageMetadata | undefined {
	if (!ruta) return undefined;

	// Tolerates a missing leading slash or a relative "src/assets/..." path.
	const normalizada = ruta.startsWith("/") ? ruta : `/${ruta}`;
	return IMAGENES[normalizada]?.default;
}

/**
 * Same as resolverImagen but fails the build if it's missing.
 * Used where the image is mandatory (the hero, for example) — better to
 * break the build than publish a gap, which is exactly what used to happen.
 */
export function requerirImagen(ruta: string, contexto: string): ImageMetadata {
	const img = resolverImagen(ruta);
	if (!img) {
		throw new Error(
			`No encuentro la imagen "${ruta}" (${contexto}).\n` +
				`Disponibles:\n${rutasDisponibles.map((r) => `  - ${r}`).join("\n")}`,
		);
	}
	return img;
}

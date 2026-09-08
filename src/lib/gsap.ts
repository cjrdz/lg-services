import { POLITICA_MOVIMIENTO } from "./motion";

/**
 * GSAP setup for the site.
 *
 * GSAP and its plugins are loaded ONLY on the client via dynamic imports.
 * Importing them at the top level breaks Cloudflare's prerender worker,
 * which forbids async I/O / timeouts in global scope.
 *
 * Easing curves mirror the CSS custom properties in src/styles/global.css
 * so GSAP motion feels like the same system as the CSS transitions.
 */

/** Mirror of --duracion-rapida (120ms). */
export const DURACION_RAPIDA = 0.12;
/** Mirror of --duracion-normal (220ms). */
export const DURACION_NORMAL = 0.22;
/** Mirror of --duracion-lenta (380ms). */
export const DURACION_LENTA = 0.38;
/** Slower entrance for GSAP-driven hero sequences. */
export const DURACION_ENTRADA = 0.85;
/** Scroll-triggered reveals: slower than click feedback so it feels intentional. */
export const DURACION_SCROLL = 0.65;

/** True when the user (or the site's policy) asks for reduced motion. */
export function prefiereMovimientoReducido(): boolean {
	if (POLITICA_MOVIMIENTO === "siempre") return false;
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type GsapModulo = {
	gsap: typeof import("gsap").gsap;
	Flip: typeof import("gsap/Flip").Flip;
	ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
};

let cache: Promise<GsapModulo | null> | null = null;

/**
 * Loads GSAP and the plugins this site uses. Safe to call from any island:
 * on the server it returns null immediately, and on the client it caches the
 * first load so multiple islands share one instance.
 */
export function cargarGsap(): Promise<GsapModulo | null> {
	if (prefiereMovimientoReducido()) return Promise.resolve(null);
	if (typeof window === "undefined") return Promise.resolve(null);
	if (cache) return cache;

	cache = (async () => {
		const [{ gsap }, { Flip }, { ScrollTrigger }, { CustomEase }] =
			await Promise.all([
				import("gsap"),
				import("gsap/Flip"),
				import("gsap/ScrollTrigger"),
				import("gsap/CustomEase"),
			]);

		gsap.registerPlugin(Flip, ScrollTrigger, CustomEase);
		CustomEase.create("salida", "0.16, 1, 0.3, 1");
		CustomEase.create("suave", "0.4, 0, 0.2, 1");

		return { gsap, Flip, ScrollTrigger };
	})();

	return cache;
}

type FlipPlugin = NonNullable<GsapModulo["Flip"]>;

/**
 * Records a Flip state for a set of elements, skipping the snapshot when
 * reduced motion is preferred or when not in a browser. Returns undefined in
 * those cases so callers can bail out without extra branching.
 */
export function capturarFlipState(
	Flip: FlipPlugin,
	elements: Parameters<FlipPlugin["getState"]>[0],
): ReturnType<FlipPlugin["getState"]> | undefined {
	if (prefiereMovimientoReducido()) return undefined;
	return Flip.getState(elements);
}

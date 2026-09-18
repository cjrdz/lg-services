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
 *
 * PLUGINS ARE LOADED ONE AT A TIME, on purpose. There used to be a single
 * `cargarGsap()` that pulled gsap + Flip + ScrollTrigger + CustomEase
 * together, so a listing page — which only ever uses Flip — downloaded
 * ScrollTrigger too: 17 KB gzipped of a plugin nothing on that page calls.
 * The core (gsap + CustomEase) is shared; each plugin has its own entry point
 * and its own cached promise.
 */

/** Mirror of --duracion-rapida (120ms). */
export const DURACION_RAPIDA = 0.12;
/** Mirror of --duracion-normal (220ms). */
export const DURACION_NORMAL = 0.22;
/** Mirror of --duracion-lenta (380ms). */
export const DURACION_LENTA = 0.38;
/** Mirror of --duracion-entrada (850ms): slower entrances, hero and steps. */
export const DURACION_ENTRADA = 0.85;
/** Scroll-triggered reveals: slower than click feedback so it feels intentional. */
export const DURACION_SCROLL = 0.65;

/** True when the user (or the site's policy) asks for reduced motion. */
export function prefiereMovimientoReducido(): boolean {
	if (POLITICA_MOVIMIENTO === "siempre") return false;
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type GsapNucleo = { gsap: typeof import("gsap").gsap };
export type ModuloFlip = GsapNucleo & { Flip: typeof import("gsap/Flip").Flip };
export type ModuloScrollTrigger = GsapNucleo & {
	ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
};

/** Every entry point bails out the same way: no browser, or no motion wanted. */
function noCorresponde(): boolean {
	return typeof window === "undefined" || prefiereMovimientoReducido();
}

let nucleo: Promise<GsapNucleo> | null = null;

/**
 * gsap core + CustomEase, with the site's two curves registered.
 *
 * CustomEase always comes along (3.3 KB gzipped): "salida" and "suave" ARE
 * the design tokens from global.css, and a tween that doesn't use them is
 * moving by a rule nothing else on the site follows.
 */
export function cargarGsap(): Promise<GsapNucleo | null> {
	if (noCorresponde()) return Promise.resolve(null);
	if (nucleo) return nucleo;

	nucleo = (async () => {
		const [{ gsap }, { CustomEase }] = await Promise.all([
			import("gsap"),
			import("gsap/CustomEase"),
		]);

		gsap.registerPlugin(CustomEase);
		CustomEase.create("salida", "0.16, 1, 0.3, 1");
		CustomEase.create("suave", "0.4, 0, 0.2, 1");

		return { gsap };
	})();

	return nucleo;
}

let conFlip: Promise<ModuloFlip> | null = null;

/** Core + Flip. For layout changes: the filtered listing grid. */
export function cargarFlip(): Promise<ModuloFlip | null> {
	if (noCorresponde()) return Promise.resolve(null);
	if (conFlip) return conFlip;

	conFlip = (async () => {
		const [base, { Flip }] = await Promise.all([
			cargarGsap() as Promise<GsapNucleo>,
			import("gsap/Flip"),
		]);
		base.gsap.registerPlugin(Flip);
		return { ...base, Flip };
	})();

	return conFlip;
}

let conScrollTrigger: Promise<ModuloScrollTrigger> | null = null;

/**
 * Core + ScrollTrigger. ONE caller: the scroll-reveal fallback in
 * src/lib/revelar.ts, for browsers without `animation-timeline: view()`.
 * In Chrome, Edge and Safari this never downloads.
 */
export function cargarScrollTrigger(): Promise<ModuloScrollTrigger | null> {
	if (noCorresponde()) return Promise.resolve(null);
	if (conScrollTrigger) return conScrollTrigger;

	conScrollTrigger = (async () => {
		const [base, { ScrollTrigger }] = await Promise.all([
			cargarGsap() as Promise<GsapNucleo>,
			import("gsap/ScrollTrigger"),
		]);
		base.gsap.registerPlugin(ScrollTrigger);
		return { ...base, ScrollTrigger };
	})();

	return conScrollTrigger;
}

type FlipPlugin = ModuloFlip["Flip"];

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

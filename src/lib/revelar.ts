import { cargarScrollTrigger, DURACION_ENTRADA, DURACION_SCROLL } from "./gsap";

/**
 * Scroll reveals in browsers that don't have scroll-driven animations.
 *
 * `.revelar` / `.revelar-grupo` in global.css run on `animation-timeline:
 * view()`, which is the right way to do this: the browser advances the
 * animation from the scroll position, on the compositor, with no observer and
 * no island. But that feature is Chrome/Edge 115+ and Safari 18.4+ only.
 * FIREFOX HAS NONE OF IT — and because the whole rule sits inside
 * `@supports (animation-timeline: view())`, every `.revelar` on the site was
 * a no-op there: content visible, correct, and completely motionless.
 *
 * This is the fallback, and it is deliberately the ONLY place GSAP touches
 * scroll. It costs nothing where CSS already works: the feature check runs
 * first and returns, so Chrome and Safari never fetch a byte of GSAP.
 *
 * Three things it refuses to do, each one a failure mode this project has
 * already been bitten by:
 *
 *  1. It never hides anything the person can already see. Only elements that
 *     START below the fold get an opacity of 0 — so there is no
 *     visible-then-vanishing flash, which is exactly why the old
 *     `.js .scroll-animable { opacity: 0 }` approach was thrown out.
 *  2. It hides nothing until it is sure it can animate: if the GSAP chunk
 *     fails, or reduced motion is on, everything is restored immediately.
 *  3. It has a rescue timer. If the chunk simply never resolves, the content
 *     comes back anyway — a blank page with no console error is the worst
 *     possible outcome and it is the one this used to produce.
 *
 * Animates `transform` (GSAP's `y`), NOT `translate`: `.elevable` owns
 * `translate` for its hover lift.
 */

/*
  Los grupos que hay que replicar, cada uno con su punto de partida.

  No es una lista de selectores por gusto: `.revelar` entra desde ABAJO y los
  pasos del proceso entran DE COSTADO (son una secuencia, no una grilla — ver
  `.proceso-paso` en global.css). Si acá se animara todo en el mismo eje,
  Firefox vería una animación distinta de la que diseñó el CSS.

  El ordinal va como grupo aparte y no anidado dentro del paso: necesita su
  propio desplazamiento, más corto, que es lo que le da profundidad a la fila.
*/
const GRUPOS = [
	{
		selector: ".revelar, .revelar-grupo > *",
		desde: "translateY(1.25rem)",
		hasta: { y: 0 },
		duracion: DURACION_SCROLL,
		stagger: 0.08,
	},
	/*
	  Los tres pasos van más lentos y más separados que el resto.

	  En CSS son una animación de scroll que ocupa ~300 px de recorrido cada
	  una; acá el reloj es un reloj de verdad, así que para que se lean igual
	  —una secuencia, no tres cosas a la vez— hace falta la duración larga
	  (`--duracion-entrada`) y un stagger que se note.

	  El paso solo aparece: la regla de arriba es suya y tiene que quedarse
	  quieta. Sin `desde`, no se le toca el transform.
	*/
	{
		selector: ".proceso-paso",
		desde: "",
		hasta: {},
		duracion: DURACION_ENTRADA,
		stagger: 0.2,
	},
	{
		selector: ".proceso-cuerpo",
		desde: "translateX(2rem)",
		hasta: { x: 0 },
		duracion: DURACION_ENTRADA,
		stagger: 0.2,
	},
	{
		selector: ".proceso-ordinal",
		desde: "translateX(0.85rem)",
		hasta: { x: 0 },
		duracion: DURACION_ENTRADA,
		stagger: 0.2,
	},
] as const;

/** Anything starting past this fraction of the viewport counts as below the fold. */
const FRACCION_FUERA_DE_PANTALLA = 0.92;

/** If GSAP hasn't answered by now, show everything and give up. */
const RESCATE_MS = 2500;

function soportaLineaDeTiempo(): boolean {
	return (
		typeof CSS !== "undefined" &&
		typeof CSS.supports === "function" &&
		CSS.supports("animation-timeline: view()")
	);
}

function mostrar(elementos: HTMLElement[]): void {
	for (const el of elementos) {
		el.style.removeProperty("opacity");
		el.style.removeProperty("transform");
	}
}

/** Undoes whatever the current page set up. Replaced on every page load. */
let desmontar: (() => void) | null = null;

function preparar(): void {
	desmontar?.();
	desmontar = null;

	const umbral = window.innerHeight * FRACCION_FUERA_DE_PANTALLA;

	const lotes = GRUPOS.map((grupo) => ({
		grupo,
		elementos: Array.from(
			document.querySelectorAll<HTMLElement>(grupo.selector),
		).filter((el) => el.getBoundingClientRect().top > umbral),
	})).filter((l) => l.elementos.length > 0);

	if (lotes.length === 0) return;

	const todos = lotes.flatMap((l) => l.elementos);

	for (const { grupo, elementos } of lotes) {
		for (const el of elementos) {
			el.style.opacity = "0";
			if (grupo.desde) el.style.transform = grupo.desde;
		}
	}

	let cancelado = false;
	const rescate = window.setTimeout(() => {
		cancelado = true;
		mostrar(todos);
	}, RESCATE_MS);

	desmontar = () => {
		cancelado = true;
		window.clearTimeout(rescate);
		mostrar(todos);
	};

	cargarScrollTrigger()
		.then((g) => {
			window.clearTimeout(rescate);
			if (cancelado) return;

			// null = reduced motion, or the import failed. Either way the
			// content has to end up visible.
			if (!g) return mostrar(todos);

			const { gsap, ScrollTrigger } = g;

			// `batch` groups elements that cross the line in the same frame, so a
			// grid row enters as a row instead of as N independent tweens — the
			// closest thing to the diagonal stagger the CSS version does with
			// `--revelar-retraso`.
			const disparadores = lotes.flatMap(({ grupo, elementos }) =>
				ScrollTrigger.batch(elementos, {
					start: `top ${FRACCION_FUERA_DE_PANTALLA * 100}%`,
					once: true,
					onEnter: (lote) =>
						gsap.to(lote, {
							opacity: 1,
							...grupo.hasta,
							duration: grupo.duracion,
							ease: "salida",
							stagger: grupo.stagger,
							overwrite: true,
							// Hand the element back to the stylesheet once it has
							// arrived: an inline transform left behind would beat
							// anything CSS tries to do with it later.
							clearProps: "opacity,transform",
						}),
				}),
			);

			desmontar = () => {
				for (const d of disparadores) d.kill();
				gsap.killTweensOf(todos);
				mostrar(todos);
			};
		})
		.catch(() => {
			window.clearTimeout(rescate);
			mostrar(todos);
		});
}

/*
  Identity of the document this ran against.

  A <ClientRouter /> swap replaces <body> with the incoming one, so the node
  itself is the cheapest "is this still the same page?" check. It exists
  because the two ways in are not mutually exclusive: this module is a
  deferred <script>, so on a cold load it may run either before or after
  `astro:page-load` fires, depending on how fast the document parses. Both
  paths call the same function and the first one to arrive wins.
*/
let documentoPreparado: HTMLElement | null = null;

function prepararUnaVez(): void {
	if (documentoPreparado === document.body) return;
	documentoPreparado = document.body;
	preparar();
}

/**
 * Called once per document from BaseLayout.
 */
export function activarRevelarFallback(): void {
	if (soportaLineaDeTiempo()) return;

	document.addEventListener("astro:page-load", prepararUnaVez);
	document.addEventListener("astro:before-swap", () => {
		desmontar?.();
		desmontar = null;
		documentoPreparado = null;
	});

	if (document.readyState !== "loading") prepararUnaVez();
	else document.addEventListener("DOMContentLoaded", prepararUnaVez);
}

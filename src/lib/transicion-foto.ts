/**
 * Foto de un anuncio que crece hasta la portada de su ficha (y vuelve).
 *
 * El `view-transition-name` se pone en UN solo elemento por documento y por
 * navegación, no en todas las tarjetas. La diferencia importa: un nombre es
 * un snapshot, y una grilla de cien anuncios con nombre en cada foto le pide
 * al navegador cien capas cada vez que alguien sale de la página — aunque vaya
 * a /contacto/ y ninguna de esas fotos exista del otro lado. Peor: una foto
 * con nombre y sin pareja en el destino no se queda quieta, se anima sola.
 *
 * Por eso el nombre se asigna sabiendo a dónde va la navegación:
 *
 *  · `astro:before-preparation` conoce el destino y el documento que se va
 *    sigue en pie, así que se marca la tarjeta que apunta ahí — justo antes
 *    de que el navegador capture el estado viejo.
 *  · `astro:after-swap` corre con el documento nuevo puesto y todavía antes
 *    del paint, así que ahí se marca la tarjeta que apunta de vuelta a de
 *    dónde veníamos. Eso es lo que hace que el regreso también se vea.
 *
 * La portada de la ficha lleva su nombre desde el servidor (ver la prop
 * `transicion` de R2Image): es una sola y no hace falta buscarla.
 *
 * No hay limpieza en `astro:page-load`, y no es un olvido: ese evento llega
 * con la animación de entrada todavía corriendo, así que quitar el nombre ahí
 * la abortaría a media transición. Lo que sobre lo borra `marcar()` al empezar
 * la navegación siguiente, que es el único momento en que estorba.
 *
 * Al no depender de un clic, funciona igual con el botón "atrás" del
 * navegador, que es como se sale de una ficha la mitad de las veces.
 */

const SELECTOR = "[data-foto-transicion]";

function comparable(ruta: string): string {
	return ruta.endsWith("/") ? ruta : `${ruta}/`;
}

/** Limpia lo que haya marcado la navegación anterior en este documento. */
function limpiar(): void {
	for (const el of document.querySelectorAll<HTMLElement>(SELECTOR)) {
		el.style.removeProperty("view-transition-name");
	}
}

/**
 * Marca la foto de la tarjeta cuyo enlace lleva a `ruta`.
 *
 * Recorre las tarjetas en vez de armar un selector con el href porque el
 * enlace de una tarjeta puede ser relativo, absoluto o llevar la barra final
 * puesta o no — comparar `pathname` ya resuelto evita las tres dudas.
 */
function marcar(ruta: string | null): void {
	limpiar();
	if (!ruta) return;

	const objetivo = comparable(ruta);

	for (const foto of document.querySelectorAll<HTMLElement>(SELECTOR)) {
		const enlace = foto.closest("article")?.querySelector<HTMLAnchorElement>("a[href]");
		if (!enlace) continue;
		if (comparable(new URL(enlace.href, location.href).pathname) !== objetivo) continue;

		const nombre = foto.dataset.fotoTransicion;
		if (nombre) foto.style.setProperty("view-transition-name", nombre);
		return;
	}
}

export function activarMorphDeFotos(): void {
	let origen: string | null = null;

	document.addEventListener("astro:before-preparation", (evento) => {
		const { from, to } = evento as Event & { from?: URL; to?: URL };
		origen = from?.pathname ?? location.pathname;
		marcar(to?.pathname ?? null);
	});

	document.addEventListener("astro:after-swap", () => marcar(origen));
}

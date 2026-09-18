import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

/**
 * Pure formatting and slug utilities.
 *
 * Deliberately separate from contenido.ts: that one imports `astro:content`,
 * a virtual module that only exists inside Astro's build and that Vitest
 * can't resolve. Not depending on it means everything here can be tested directly.
 */

/** The glob's id includes the locale ("es/derecho-laboral"); this strips it. */
export function slugDe(id: string): string {
	return id.replace(/^[a-z]{2}\//, "");
}

/**
 * Nombre de view transition del ícono de una entrada.
 *
 * Va por publicación y no por área a propósito: en una grilla puede haber
 * dos publicaciones de la misma área, y dos elementos con el mismo nombre en
 * una página anulan la transición entera. Las barras del slug se cambian por
 * guiones porque el nombre es un <custom-ident> y "/" no es válido ahí.
 */
export function transicionEntrada(id: string): string {
	return `entrada-icono-${slugDe(id).replace(/\//g, "-")}`;
}

/**
 * El área que la DIRECCIÓN de una entrada dice que tiene.
 *
 * El área de una publicación está escrita dos veces: en el prefijo del slug
 * ("derecho-laboral/despido-injustificado") y en el campo `area` del panel.
 * La URL sale del prefijo (ver getStaticPaths en blog/[area]/[...slug].astro)
 * y la miga de pan, la insignia y el índice de área salen del campo. Si no
 * coinciden, el artículo queda publicado en una dirección que su propio
 * índice de área no lista — o peor, bajo un área que no existe, con la ficha
 * viva y el índice de arriba en 404.
 *
 * `verificarAreaDeEntrada()` en contenido.ts es quien lo hace fallar; esto
 * es solo la parte que se puede probar sin `astro:content`.
 */
export function areaDelSlug(id: string): string {
	return slugDe(id).split("/")[0] ?? "";
}

/**
 * Nombre de view transition de la foto de un anuncio.
 *
 * Es la CUARTA cadena de nombres del sitio (las otras tres están en AGENTS.md)
 * y, como las demás, no se cruza con ninguna: lleva la sección adelante porque
 * una propiedad y un vehículo pueden compartir correlativo, y en la home se
 * muestran las dos listas en la misma página. Un nombre repetido no degrada la
 * transición: la anula entera.
 *
 * El id se limpia porque el nombre es un `<custom-ident>` — nada de barras,
 * puntos ni espacios.
 */
export function transicionFoto(seccion: "propiedad" | "vehiculo", id: string): string {
	return `foto-${seccion}-${id.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

/** Date in Salvadoran format: "12 de marzo de 2025". */
export function formatearFecha(fecha: Date, locale: Locale = DEFAULT_LOCALE): string {
	return new Intl.DateTimeFormat(locale === "es" ? "es-SV" : "en-US", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(fecha);
}

/** Reading time at 200 words/minute, minimum 1. */
export function tiempoLectura(texto: string): number {
	const palabras = texto.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(palabras / 200));
}

/** Price in dollars, no decimals: "US$125,000". */
export function formatearPrecio(
	monto: number,
	locale: Locale = DEFAULT_LOCALE,
): string {
	return new Intl.NumberFormat(locale === "es" ? "es-SV" : "en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(monto);
}

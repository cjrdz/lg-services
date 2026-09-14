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

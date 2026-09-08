import { getCollection, type CollectionEntry } from "astro:content";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import type { AreaId } from "./taxonomia";

// Re-exported so pages keep importing everything from one place.
export { slugDe, formatearFecha, tiempoLectura, formatearPrecio } from "./formato";

/**
 * Reads collections with the site's rules applied in ONE place: filtering
 * drafts and keeping the right locale.
 *
 * If every page repeated that filter, one would eventually forget it and
 * publish a draft. Here there's no way to forget it.
 */

export type Servicio = CollectionEntry<"servicios">;
export type Entrada = CollectionEntry<"blog">;

/** Drafts are hidden in production; visible in dev, for review. */
const mostrarBorradores = import.meta.env.DEV;

function publicado(data: { borrador: boolean }): boolean {
	return mostrarBorradores || !data.borrador;
}

export async function getServicios(locale: Locale = DEFAULT_LOCALE) {
	const todos = await getCollection("servicios", ({ data }) => publicado(data));
	return todos
		.filter((s) => s.data.locale === locale)
		.sort((a, b) => a.data.orden - b.data.orden);
}

export async function getServicioPorArea(
	area: AreaId,
	locale: Locale = DEFAULT_LOCALE,
) {
	const todos = await getCollection("servicios", ({ data }) => publicado(data));
	return (
		todos.find((s) => s.data.area === area && s.data.locale === locale) ??
		// Graceful degradation: if the translation is missing, show the
		// original instead of returning a 404.
		todos.find((s) => s.data.area === area && s.data.locale === DEFAULT_LOCALE)
	);
}

export async function getEntradas(locale: Locale = DEFAULT_LOCALE) {
	const todas = await getCollection("blog", ({ data }) => publicado(data));
	return todas
		.filter((e) => e.data.locale === locale)
		.sort((a, b) => b.data.publicado.valueOf() - a.data.publicado.valueOf());
}

export async function getEntradasPorArea(
	area: AreaId,
	locale: Locale = DEFAULT_LOCALE,
) {
	return (await getEntradas(locale)).filter((e) => e.data.area === area);
}

/** How many posts exist per area, for the blog index's counters. */
export async function conteoPorArea(
	locale: Locale = DEFAULT_LOCALE,
): Promise<Record<string, number>> {
	const entradas = await getEntradas(locale);
	const conteo: Record<string, number> = {};
	for (const e of entradas) {
		conteo[e.data.area] = (conteo[e.data.area] ?? 0) + 1;
	}
	return conteo;
}

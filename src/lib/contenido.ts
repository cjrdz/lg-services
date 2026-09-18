import { getCollection, type CollectionEntry } from "astro:content";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import type { AreaId } from "./taxonomia";
import { areaDelSlug } from "./formato";

// Re-exported so pages keep importing everything from one place.
export {
	slugDe,
	areaDelSlug,
	transicionEntrada,
	transicionFoto,
	formatearFecha,
	tiempoLectura,
	formatearPrecio,
} from "./formato";

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

/**
 * Rompe el build si la direccion de una entrada no coincide con su area.
 *
 * Es la unica validacion del blog que zod NO puede hacer: el `schema` de una
 * coleccion recibe el frontmatter y nunca el id del archivo, asi que la
 * comparacion tiene que pasar por aca, donde se leen las entradas.
 *
 * Y tiene que existir, porque el panel le pide a Lisbeth la misma cosa dos
 * veces: escribir "area/nombre-del-articulo" en la direccion Y elegir el area
 * de una lista. Si no coinciden, el articulo sale publicado en una direccion
 * que su indice de area no lista. El build es la red de seguridad: falla, y
 * el despliegue anterior se queda en vivo.
 *
 * Mensaje en ASCII a proposito: viaja por una cabecera de error del
 * prerender de Cloudflare que no acepta acentos y los deja ilegibles.
 */
function verificarAreaDeEntrada(id: string, area: string): void {
	const prefijo = areaDelSlug(id);
	if (prefijo === area) return;

	throw new Error(
		`Entrada de blog "${id}": la direccion empieza con "${prefijo}/" pero el ` +
			`campo "Area de practica" dice "${area}". Tienen que ser el mismo. ` +
			`En /keystatic, o corregi la direccion web o cambia el area.`,
	);
}

export async function getEntradas(locale: Locale = DEFAULT_LOCALE) {
	const todas = await getCollection("blog", ({ data }) => publicado(data));
	for (const e of todas) verificarAreaDeEntrada(e.id, e.data.area);
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

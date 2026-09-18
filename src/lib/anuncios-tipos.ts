/**
 * Types and descriptors for listings. NO Astro dependencies.
 *
 * Deliberately separate from anuncios.ts: that one imports `astro:content`,
 * a virtual module that only exists inside Astro's build and that Vitest
 * can't resolve. Not depending on it means the contract between both
 * sections can be tested directly.
 */

/**
 * Common "listing" model for both properties and vehicles.
 *
 * Both sections show the same card — photo, price, title, location or spec
 * sheet, and three or four loose data points — and filter the same way.
 * Instead of duplicating the filter island and the card, each vertical
 * projects to this shape and they share the component.
 *
 * `facetas` and `numeros` are the generic part: the island doesn't know what
 * "habitaciones" or "pasajeros" mean, only that there are keys to filter by.
 */
export interface TarjetaAnuncio {
	slug: string;
	ref: string;
	href: string;
	/**
	 * `view-transition-name` de la foto, compartido con la ficha del anuncio:
	 * la foto de la tarjeta crece hasta la portada en vez de cortar a negro.
	 * Lo arma `transicionFoto()` en src/lib/formato.ts.
	 */
	transicion: string;
	titulo: string;
	subtitulo: string;
	foto: string;
	alt: string;
	precio: number;
	/** Text stuck to the price: "/ mes", "por día", or empty. */
	periodoTexto: string;
	ocultarPrecio: boolean;
	/** Status label once no longer available ("Vendido", "Alquilado"). */
	insignia?: string;
	disponible: boolean;
	/** Loose data points on the card: "3 hab", "220 m²", "5 pasajeros". */
	datos: string[];
	ts: number;
	destacado: boolean;
	orden: number;
	/** Normalized text (no accents, lowercase) for search. */
	q: string;
	/** Values filtered with a select. */
	facetas: Record<string, string>;
	/** Values filtered with a number. */
	numeros: Record<string, number>;
}

/** One sidebar filter. The island renders these with no idea which section they're from. */
export interface DescriptorFiltro {
	clave: string;
	etiqueta: string;
	tipo: "select" | "max" | "min";
	/** Which entry in `facetas` or `numeros` this looks at. */
	campo: string;
	opciones?: Array<{ value: string; label: string }>;
	placeholder?: string;
}

export interface DescriptorOrden {
	clave: string;
	etiqueta: string;
	campo?: string;
	direccion: "asc" | "desc";
}

/* ---------------------------------------------------------------- */
/* Filter descriptors                                                */
/* ---------------------------------------------------------------- */

/**
 * Each section's filters. Live here rather than on the page so the island
 * stays domain-agnostic: it only receives a list of what to look at.
 */
export function filtrosPropiedades(
	t: (k: string) => string,
	opciones: {
		operacion: Array<{ value: string; label: string }>;
		tipo: Array<{ value: string; label: string }>;
		departamento: Array<{ value: string; label: string }>;
	},
): DescriptorFiltro[] {
	return [
		{
			clave: "op",
			campo: "op",
			etiqueta: t("operacion"),
			tipo: "select",
			opciones: opciones.operacion,
		},
		{
			clave: "tipo",
			campo: "tipo",
			etiqueta: t("tipo"),
			tipo: "select",
			opciones: opciones.tipo,
		},
		{
			clave: "dep",
			campo: "dep",
			etiqueta: t("departamento"),
			tipo: "select",
			opciones: opciones.departamento,
		},
		{
			clave: "max",
			campo: "precio",
			etiqueta: t("precioMax"),
			tipo: "max",
			placeholder: "US$",
		},
		{ clave: "hab", campo: "hab", etiqueta: t("habitacionesMin"), tipo: "min" },
	];
}

export function filtrosVehiculos(
	t: (k: string) => string,
	opciones: {
		categoria: Array<{ value: string; label: string }>;
		transmision: Array<{ value: string; label: string }>;
		combustible: Array<{ value: string; label: string }>;
	},
): DescriptorFiltro[] {
	return [
		{
			clave: "cat",
			campo: "categoria",
			etiqueta: t("categoria"),
			tipo: "select",
			opciones: opciones.categoria,
		},
		{
			clave: "trans",
			campo: "transmision",
			etiqueta: t("transmision"),
			tipo: "select",
			opciones: opciones.transmision,
		},
		{
			clave: "comb",
			campo: "combustible",
			etiqueta: t("combustible"),
			tipo: "select",
			opciones: opciones.combustible,
		},
		{
			clave: "max",
			campo: "precio",
			etiqueta: t("tarifaMax"),
			tipo: "max",
			placeholder: "US$ / día",
		},
		{ clave: "pax", campo: "pasajeros", etiqueta: t("pasajerosMin"), tipo: "min" },
	];
}

export function ordenesPropiedades(t: (k: string) => string): DescriptorOrden[] {
	return [
		{ clave: "recientes", etiqueta: t("recientes"), direccion: "desc" },
		{ clave: "precioAsc", etiqueta: t("precioAsc"), campo: "precio", direccion: "asc" },
		{
			clave: "precioDesc",
			etiqueta: t("precioDesc"),
			campo: "precio",
			direccion: "desc",
		},
		{ clave: "areaDesc", etiqueta: t("areaDesc"), campo: "area", direccion: "desc" },
	];
}

export function ordenesVehiculos(t: (k: string) => string): DescriptorOrden[] {
	return [
		{ clave: "recientes", etiqueta: t("recientes"), direccion: "desc" },
		{ clave: "precioAsc", etiqueta: t("precioAsc"), campo: "precio", direccion: "asc" },
		{
			clave: "precioDesc",
			etiqueta: t("precioDesc"),
			campo: "precio",
			direccion: "desc",
		},
		{ clave: "anioDesc", etiqueta: t("anioDesc"), campo: "anio", direccion: "desc" },
	];
}

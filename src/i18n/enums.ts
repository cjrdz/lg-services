import { DEFAULT_LOCALE, type Locale } from "./config";

/**
 * The site's closed vocabularies.
 *
 * RULE: content stores the ID (`"derecho-laboral"`), never the display
 * label (`"Derecho Laboral"`). lg-blog's frontmatter stored the display
 * text, so translating it would have meant rewriting every file — on top of
 * generated URLs coming out as `/blog/category/Derecho Civil`.
 *
 * Each group feeds THREE things at once:
 *   - zod's `enum` in src/content.config.ts   (via `ids()`)
 *   - Keystatic's `select`s                   (via `opciones()`)
 *   - what the visitor sees                   (via `etiqueta()`)
 *
 * The day English ships, uncomment the `en:` values and nothing else changes.
 */

type Etiquetas = Record<string, Partial<Record<Locale | "en", string>>>;

export const ETIQUETAS = {
	operacion: {
		venta: { es: "Venta" /* en: "For sale" */ },
		alquiler: { es: "Alquiler" /* en: "For rent" */ },
	},

	tipoPropiedad: {
		casa: { es: "Casa" /* en: "House" */ },
		apartamento: { es: "Apartamento" /* en: "Apartment" */ },
		terreno: { es: "Terreno" /* en: "Land" */ },
		"local-comercial": { es: "Local comercial" /* en: "Retail space" */ },
		oficina: { es: "Oficina" /* en: "Office" */ },
		bodega: { es: "Bodega" /* en: "Warehouse" */ },
	},

	estadoPropiedad: {
		disponible: { es: "Disponible" /* en: "Available" */ },
		reservado: { es: "Reservado" /* en: "Reserved" */ },
		vendido: { es: "Vendido" /* en: "Sold" */ },
		alquilado: { es: "Alquilado" /* en: "Rented" */ },
	},

	unidadSuperficie: {
		m2: { es: "m²" },
		varas2: { es: "varas²" },
		manzanas: { es: "manzanas" /* en: "manzanas" */ },
	},

	amenidad: {
		piscina: { es: "Piscina" /* en: "Pool" */ },
		jardin: { es: "Jardín" /* en: "Garden" */ },
		garita: { es: "Seguridad 24/7" /* en: "24/7 security" */ },
		amueblado: { es: "Amueblado" /* en: "Furnished" */ },
		"aire-acondicionado": { es: "Aire acondicionado" /* en: "Air conditioning" */ },
		"agua-potable": { es: "Agua potable" /* en: "Running water" */ },
		"energia-electrica": { es: "Energía eléctrica" /* en: "Electricity" */ },
		"escritura-lista": { es: "Escritura lista" /* en: "Clear title" */ },
		"acceso-vehicular": { es: "Acceso vehicular" /* en: "Vehicle access" */ },
		"cerca-de-escuelas": { es: "Cerca de escuelas" /* en: "Near schools" */ },
	},

	categoriaVehiculo: {
		sedan: { es: "Sedán" /* en: "Sedan" */ },
		suv: { es: "SUV" },
		pickup: { es: "Pick-up" },
		hatchback: { es: "Hatchback" },
		van: { es: "Van" },
		microbus: { es: "Microbús" /* en: "Minibus" */ },
	},

	transmision: {
		automatica: { es: "Automática" /* en: "Automatic" */ },
		manual: { es: "Manual" },
	},

	combustible: {
		gasolina: { es: "Gasolina" /* en: "Gasoline" */ },
		diesel: { es: "Diésel" /* en: "Diesel" */ },
		hibrido: { es: "Híbrido" /* en: "Hybrid" */ },
		electrico: { es: "Eléctrico" /* en: "Electric" */ },
	},

	traccion: {
		"4x2": { es: "4x2" },
		"4x4": { es: "4x4" },
		awd: { es: "AWD" },
	},

	disponibilidadVehiculo: {
		disponible: { es: "Disponible" /* en: "Available" */ },
		alquilado: { es: "Alquilado" /* en: "Rented out" */ },
		mantenimiento: { es: "En mantenimiento" /* en: "In maintenance" */ },
	},
} as const satisfies Record<string, Etiquetas>;

export type GrupoEtiquetas = keyof typeof ETIQUETAS;

/** An ID's display label. Falls back to Spanish if the translation is missing. */
export function etiqueta(
	grupo: GrupoEtiquetas,
	id: string,
	locale: Locale = DEFAULT_LOCALE,
): string {
	const entrada = (ETIQUETAS[grupo] as Etiquetas)[id];
	return entrada?.[locale] ?? entrada?.[DEFAULT_LOCALE] ?? id;
}

/** {label, value} options for Keystatic's `select`s. */
export function opciones(
	grupo: GrupoEtiquetas,
	locale: Locale = DEFAULT_LOCALE,
): Array<{ label: string; value: string }> {
	return Object.keys(ETIQUETAS[grupo]).map((value) => ({
		label: etiqueta(grupo, value, locale),
		value,
	}));
}

/** The group's IDs, typed the way z.enum() requires. */
export function ids(grupo: GrupoEtiquetas): [string, ...string[]] {
	return Object.keys(ETIQUETAS[grupo]) as [string, ...string[]];
}

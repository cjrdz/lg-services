import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

/**
 * The 7 practice areas. Ported from lg-blog/src/utils/categoryConfig.ts.
 *
 * Three deliberate changes from the original:
 *
 *  1. Keys are kebab-case IDs. The original Map mixed `"asesoria"` (an id)
 *     with `"Derecho Civil"` (display text), so looking up a service by its
 *     real name — "Derecho Civil y Mercantil" — always fell through to the
 *     generic fallback silently.
 *  2. `colorClass` / `bgColorClass` dropped. Both were Tailwind literals
 *     baked to one theme, and `bgColorClass` was the same light red on all
 *     7 anyway — a per-area color defined but never applied.
 *  3. **DIAN → DGII / Ministerio de Hacienda.** DIAN is COLOMBIA's tax
 *     authority. El Salvador's is the Dirección General de Impuestos
 *     Internos. Publishing that wrong on a Salvadoran lawyer's site is
 *     both an SEO miss and a credibility hit.
 *
 * Icons are Iconify names, not components — so they work the same in
 * `.astro` and inside Svelte islands.
 */

export const AREA_IDS = [
	"derecho-civil-mercantil",
	"derecho-laboral",
	"derecho-familia",
	"derecho-penal",
	"derecho-tributario",
	"inmobiliario",
	"asesoria-academica",
] as const;

export type AreaId = (typeof AREA_IDS)[number];

export interface AreaCopy {
	titulo: string;
	resumen: string;
	seoDescripcion: string;
	palabrasClave: string[];
}

export interface Area {
	icono: string;
	orden: number;
	i18n: Partial<Record<Locale | "en", AreaCopy>> & { es: AreaCopy };
}

export const AREAS: Record<AreaId, Area> = {
	"derecho-civil-mercantil": {
		icono: "lucide:scale",
		orden: 1,
		i18n: {
			es: {
				titulo: "Derecho Civil y Mercantil",
				resumen: "Asesoría legal especializada en derecho civil y mercantil",
				seoDescripcion:
					"Asesoría en derecho civil y mercantil en El Salvador: contratos, obligaciones, derechos reales, responsabilidad civil y sociedades.",
				palabrasClave: [
					"derecho civil El Salvador",
					"contratos",
					"obligaciones",
					"responsabilidad civil",
					"derechos reales",
					"derecho mercantil",
				],
			},
		},
	},

	"derecho-laboral": {
		icono: "lucide:briefcase",
		orden: 2,
		i18n: {
			es: {
				titulo: "Derecho Laboral",
				resumen: "Protección integral de tus derechos laborales",
				seoDescripcion:
					"Asesoría en derecho laboral en El Salvador: despidos, indemnizaciones, contratos de trabajo, acoso laboral y derechos de los trabajadores.",
				palabrasClave: [
					"derecho laboral El Salvador",
					"despido injustificado",
					"contratos de trabajo",
					"indemnización laboral",
					"derechos del trabajador",
					"acoso laboral",
				],
			},
		},
	},

	"derecho-familia": {
		icono: "lucide:users",
		orden: 3,
		i18n: {
			es: {
				titulo: "Derecho de Familia",
				resumen: "Asesoría especializada en asuntos familiares y matrimoniales",
				seoDescripcion:
					"Consulta en derecho de familia en El Salvador: divorcios, cuota alimenticia, custodia y cuidado personal, separación de bienes y adopciones.",
				palabrasClave: [
					"derecho de familia El Salvador",
					"divorcio",
					"cuota alimenticia",
					"custodia de menores",
					"separación de bienes",
					"adopción",
				],
			},
		},
	},

	"derecho-penal": {
		icono: "lucide:shield-check",
		orden: 4,
		i18n: {
			es: {
				titulo: "Derecho Penal",
				resumen: "Defensa penal especializada y representación legal",
				seoDescripcion:
					"Defensa penal profesional en El Salvador. Asesoría en procesos penales, delitos, recursos, derechos del imputado y representación judicial.",
				palabrasClave: [
					"derecho penal El Salvador",
					"defensa penal",
					"delitos",
					"procesos penales",
					"derechos del imputado",
					"abogada penalista",
				],
			},
		},
	},

	"derecho-tributario": {
		icono: "lucide:receipt-text",
		orden: 5,
		i18n: {
			es: {
				titulo: "Derecho Tributario",
				resumen: "Asesoría fiscal y tributaria especializada",
				// Original said "recursos ante la DIAN" — that's Colombia's authority.
				seoDescripcion:
					"Asesoría tributaria y fiscal en El Salvador: impuestos, declaraciones, sanciones, recursos ante la DGII y planificación fiscal.",
				palabrasClave: [
					"derecho tributario El Salvador",
					"impuestos",
					"DGII",
					"Ministerio de Hacienda",
					"sanciones tributarias",
					"planificación fiscal",
				],
			},
		},
	},

	inmobiliario: {
		icono: "lucide:home",
		orden: 6,
		i18n: {
			es: {
				titulo: "Derecho Inmobiliario",
				resumen: "Especialistas en transacciones y derecho inmobiliario",
				seoDescripcion:
					"Asesoría en derecho inmobiliario en El Salvador. Compraventa, arrendamientos, propiedad horizontal, titulación de inmuebles y trámites notariales.",
				palabrasClave: [
					"derecho inmobiliario El Salvador",
					"compraventa de inmuebles",
					"arrendamientos",
					"propiedad horizontal",
					"titulación",
					"trámites notariales",
				],
			},
		},
	},

	"asesoria-academica": {
		icono: "lucide:graduation-cap",
		orden: 7,
		i18n: {
			es: {
				titulo: "Asesoría Académica",
				resumen: "Guía especializada para tesis y proyectos académicos",
				seoDescripcion:
					"Asesoría profesional para tesis y trabajos de graduación en ciencias jurídicas. Metodología de investigación, estructura y acompañamiento paso a paso.",
				palabrasClave: [
					"asesoría académica",
					"tesis en ciencias jurídicas",
					"trabajo de graduación",
					"metodología de investigación",
					"tutorías",
					"universidad",
				],
			},
		},
	},
};

/**
 * Subtopics per area. Ported from the `subcategory` enum in
 * lg-blog/src/content/config.ts, now grouped by area — there it was a flat
 * list with comments, which let a subtopic get assigned to the wrong area
 * (and two entries actually were mislabeled).
 */
export const SUBTEMAS: Record<AreaId, readonly string[]> = {
	"derecho-civil-mercantil": [
		"Contratos",
		"Obligaciones",
		"Derechos reales",
		"Responsabilidad civil",
		"Sociedades mercantiles",
	],
	"derecho-laboral": [
		"Despidos y terminación laboral",
		"Contratos de trabajo",
		"Indemnizaciones y prestaciones",
		"Acoso laboral",
		"Seguridad social",
	],
	"derecho-familia": [
		"Divorcio",
		"Custodia y cuidado personal",
		"Cuota alimenticia",
		"Régimen patrimonial",
		"Adopción",
	],
	"derecho-penal": [
		"Delitos contra las personas",
		"Delitos patrimoniales",
		"Proceso penal",
		"Recursos y apelaciones",
		"Derechos del imputado",
	],
	"derecho-tributario": [
		"Impuestos y declaraciones",
		"Sanciones tributarias",
		"Recursos ante la DGII",
		"Planificación fiscal",
	],
	inmobiliario: [
		"Compraventa",
		"Arrendamientos",
		"Propiedad horizontal",
		"Titulación",
		"Trámites notariales",
	],
	"asesoria-academica": ["Tesis", "Tutorías", "Metodología"],
};

export function esAreaId(value: unknown): value is AreaId {
	return typeof value === "string" && (AREA_IDS as readonly string[]).includes(value);
}

function copy(id: AreaId, locale: Locale): AreaCopy {
	return AREAS[id].i18n[locale] ?? AREAS[id].i18n[DEFAULT_LOCALE];
}

export function areaTitulo(id: AreaId, locale: Locale = DEFAULT_LOCALE): string {
	return copy(id, locale).titulo;
}

export function areaCopy(id: AreaId, locale: Locale = DEFAULT_LOCALE): AreaCopy {
	return copy(id, locale);
}

/** The 7 areas, sorted, with their copy resolved — for listings and menus. */
export function areasOrdenadas(locale: Locale = DEFAULT_LOCALE) {
	return AREA_IDS.map((id) => ({
		id,
		icono: AREAS[id].icono,
		orden: AREAS[id].orden,
		...copy(id, locale),
	})).sort((a, b) => a.orden - b.orden);
}

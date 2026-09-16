import { AREA_IDS, AREAS, SUBTEMAS } from "../../lib/taxonomia";

/**
 * Practice areas as Keystatic select options.
 *
 * Content stores the ID (`"derecho-laboral"`), never the display text, so
 * translations never require rewriting files.
 */
export const opcionesAreas = AREA_IDS.map((id) => ({
	label: AREAS[id].i18n.es.titulo,
	value: id,
}));

/**
 * Subtopics across all areas, deduplicated, for the blog's select.
 *
 * Grouped by area in the source, but offered as one flat list in the panel
 * because a blog article picks ONE subtema and the area is validated
 * separately.
 */
export const opcionesSubtemas = [
	{ label: "— Ninguno —", value: "" },
	...[...new Set(AREA_IDS.flatMap((id) => SUBTEMAS[id]))]
		.sort((a, b) => a.localeCompare(b, "es"))
		.map((s) => ({ label: s, value: s })),
];

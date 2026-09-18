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
 * Subtopics for the blog's select, QUALIFIED BY AREA.
 *
 * They used to be one flat alphabetical list — "Adopción, Contratos,
 * Divorcio, Impuestos…" — with nothing on screen saying which area each one
 * belonged to. Lisbeth picks the area in the field right above, and then has
 * to guess from a list of 32 which ones are hers; picking "Divorcio" for a
 * tax article was a click away and the build accepted it.
 *
 * Keystatic can't filter one select by another's value without turning the
 * field into a `conditional`, and that changes the SHAPE of what's written to
 * the file (`{ discriminant, value }`), which would mean migrating every
 * existing entry. So the options stay flat and the LABEL does the work: the
 * list is grouped by area, in the same order as the field above, and every
 * label is prefixed with its area. The stored value is unchanged.
 *
 * The real guard is still in src/content.config.ts, which rejects a subtopic
 * that doesn't belong to the chosen area at build time. This just means she
 * shouldn't hit it.
 */
export const opcionesSubtemas = [
	{ label: "— Ninguno —", value: "" },
	...AREA_IDS.flatMap((id) =>
		SUBTEMAS[id].map((s) => ({
			label: `${AREAS[id].i18n.es.titulo} › ${s}`,
			value: s,
		})),
	),
];

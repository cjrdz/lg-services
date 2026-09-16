import { fields } from "@keystatic/core";

import { DEPARTAMENTOS, DISTRITOS } from "../../lib/geo/el-salvador";

/**
 * Reusable field groups for Keystatic collections and singletons.
 *
 * RULE: every closed set is a `select`, never free text. Every field has a
 * Spanish `description` with a concrete example. That is what makes the panel
 * usable for a non-technical editor.
 *
 * IMPORTANT: these helpers preserve the EXACT on-disk shape expected by
 * src/content.config.ts. Do not wrap independent top-level fields into new
 * `fields.object` groups unless the collection already stores them that way.
 */

/**
 * Departamento + distrito, chained.
 *
 * The conditional's discriminant IS the departamento select — not a separate
 * one. Done naively you get TWO departamento dropdowns the editor would have
 * to keep in sync by hand, which is a guaranteed support call.
 */
export const campoUbicacion = fields.conditional(
	fields.select({
		label: "Departamento",
		description: "Uno de los 14 departamentos de El Salvador.",
		options: DEPARTAMENTOS.map((d) => ({ label: d.nombre, value: d.id })),
		defaultValue: "san-salvador",
	}),
	Object.fromEntries(
		DEPARTAMENTOS.map((d) => [
			d.id,
			fields.object({
				distrito: fields.select({
					label: "Distrito",
					description: `Distritos de ${d.nombre}.`,
					options: DISTRITOS[d.id].map((x) => ({ label: x.nombre, value: x.id })),
					defaultValue: DISTRITOS[d.id][0].id,
				}),
				zona: fields.text({
					label: "Colonia, residencial o zona (opcional)",
					description: 'Ejemplo: "Col. Escalón" o "Res. Las Cumbres".',
					validation: { isRequired: false },
				}),
				mapaUrl: fields.url({
					label: "Enlace de Google Maps (opcional)",
					description: "Pegá el enlace de «Compartir» de Google Maps.",
					validation: { isRequired: false },
				}),
			}),
		]),
	) as never,
);

/**
 * Photo gallery hosted on R2.
 *
 * `ruta` and `alt` live in one object, NOT two parallel arrays — so
 * reordering the gallery can't desync a description from its photo.
 *
 * The regex catches the most likely mistake: pasting the full URL
 * (https://cdn…/960.webp) instead of the stem. Rejected here, in the panel
 * and in Spanish, instead of leaving a broken photo on the live site.
 */
export const campoFotos = (carpeta: "propiedades" | "vehiculos") =>
	fields.array(
		fields.object({
			ruta: fields.text({
				label: "Ruta de la foto",
				description: `Pegá la ruta que copiaste en /estudio. Se ve así: media/${carpeta}/nombre-del-anuncio/a1b2c3d4`,
				validation: {
					isRequired: true,
					pattern: {
						regex: new RegExp(`^media/${carpeta}/[a-z0-9][a-z0-9-]{1,80}/[a-z0-9]{8}$`),
						message:
							'Ruta inválida. Copiala con el botón "Copiar" de /estudio — no pegues la dirección completa del navegador.',
					},
				},
			}),
			alt: fields.text({
				label: "¿Qué se ve en la foto?",
				description:
					'Para Google y para quien use lector de pantalla. Ejemplo: "Fachada frontal con jardín".',
				validation: { isRequired: true, length: { min: 5, max: 140 } },
			}),
		}),
		{
			label: "Galería de fotos",
			description:
				"Arrastrá para reordenar. Subí las fotos primero en /estudio y pegá acá cada ruta.",
			itemLabel: (p) => p.fields.alt.value || p.fields.ruta.value || "Foto",
			validation: { length: { min: 1, max: 30 } },
		},
	);

/** Optional metadata overriding what's sent to search engines. */
export const campoSeo = fields.object(
	{
		titulo: fields.text({
			label: "Título para Google (opcional)",
			description: "Si lo dejás vacío usamos el título normal. Máximo 60 caracteres.",
			validation: { isRequired: false, length: { max: 60 } },
		}),
		descripcion: fields.text({
			label: "Descripción para Google (opcional)",
			multiline: true,
			description:
				"El texto gris que sale debajo del título en Google. Máximo 160 caracteres.",
			validation: { isRequired: false, length: { max: 160 } },
		}),
		noindex: fields.checkbox({
			label: "Ocultar de Google",
			defaultValue: false,
			description: "Marcalo solo si NO querés que esta página salga en buscadores.",
		}),
	},
	{ label: "SEO (avanzado)" },
);

/** A Markdown body with the project's standard image directory. */
export const campoCuerpoMdx = (label = "Contenido") =>
	fields.mdx({
		label,
		extension: "mdx",
		options: {
			image: {
				directory: "src/assets/images",
				publicPath: "/src/assets/images/",
			},
		},
	});

/** A required Markdown body for legal pages and services. */
export const campoCuerpo = (label = "Contenido") =>
	fields.mdx({ label, extension: "mdx" });

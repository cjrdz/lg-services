import { collection, fields } from "@keystatic/core";

import { opcionesAreas } from "../shared/options";
import { campoCuerpoMdx, campoSeo } from "../shared/fields";

/**
 * Legal services collection.
 *
 * Each service is tied to one practice area. The content is prose, so the
 * editor uses a content layout with an MDX body.
 */
export const servicios = collection({
	label: "Servicios legales",
	path: "src/content/servicios/es/*",
	slugField: "titulo",
	entryLayout: "content",
	previewUrl: "/servicios/{slug}/",
	columns: ["titulo", "orden", "destacado", "borrador"],
	format: { contentField: "cuerpo" },
	schema: {
		titulo: fields.slug({
			name: {
				label: "Título del servicio",
				description: 'Ejemplo: "Derecho Laboral".',
				validation: { isRequired: true, length: { min: 5, max: 80 } },
			},
			slug: {
				label: "Dirección web",
				description:
					"Se genera sola del título. Cambiarla rompe los enlaces que ya circulan, así que tocala solo si sabés lo que hacés.",
			},
		}),
		area: fields.select({
			label: "Área de práctica",
			description: "Cada área puede tener un solo servicio.",
			options: opcionesAreas,
			defaultValue: "derecho-civil-mercantil",
		}),
		locale: fields.select({
			label: "Idioma",
			options: [{ label: "Español", value: "es" }],
			defaultValue: "es",
		}),
		resumen: fields.text({
			label: "Resumen corto",
			multiline: true,
			description:
				"Una o dos frases. Es lo que se ve en la tarjeta del listado. Entre 40 y 200 caracteres.",
			validation: { isRequired: true, length: { min: 40, max: 200 } },
		}),
		descripcionSeo: fields.text({
			label: "Descripción para Google",
			multiline: true,
			description:
				"El texto gris bajo el título en Google. Entre 70 y 160 caracteres: fuera de ese rango Google la recorta o la ignora.",
			validation: { isRequired: true, length: { min: 70, max: 160 } },
		}),
		palabrasClave: fields.array(fields.text({ label: "Palabra clave" }), {
			label: "Palabras clave",
			description:
				'Términos que la gente buscaría. Ejemplo: "despido injustificado El Salvador". Entre 3 y 12.',
			itemLabel: (p) => p.value || "Palabra clave",
			validation: { length: { min: 3, max: 12 } },
		}),
		subservicios: fields.array(
			fields.object({
				titulo: fields.text({
					label: "Trámite o gestión",
					validation: { isRequired: true, length: { min: 3 } },
				}),
				descripcion: fields.text({
					label: "En qué consiste",
					multiline: true,
					validation: { isRequired: true, length: { min: 20 } },
				}),
			}),
			{
				label: "¿Qué incluye este servicio?",
				itemLabel: (p) => p.fields.titulo.value || "Trámite",
			},
		),
		faq: fields.array(
			fields.object({
				pregunta: fields.text({
					label: "Pregunta",
					validation: { isRequired: true, length: { min: 10 } },
				}),
				respuesta: fields.text({
					label: "Respuesta",
					multiline: true,
					validation: { isRequired: true, length: { min: 20 } },
				}),
			}),
			{
				label: "Preguntas frecuentes",
				description:
					"Estas preguntas también se le envían a Google, que a veces las muestra directo en los resultados.",
				itemLabel: (p) => p.fields.pregunta.value || "Pregunta",
			},
		),
		orden: fields.integer({
			label: "Orden en el listado",
			description: "Menor número = aparece primero.",
			defaultValue: 0,
			validation: { isRequired: true, min: 0 },
		}),
		destacado: fields.checkbox({
			label: "Destacar en la página de inicio",
			defaultValue: false,
		}),
		publicado: fields.date({
			label: "Fecha de publicación",
			validation: { isRequired: true },
		}),
		actualizado: fields.date({
			label: "Última actualización",
			validation: { isRequired: false },
		}),
		borrador: fields.checkbox({
			label: "Borrador (no se publica)",
			defaultValue: false,
		}),
		seo: campoSeo,
		cuerpo: campoCuerpoMdx("Contenido de la página"),
	},
});

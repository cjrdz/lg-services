import { collection, fields } from "@keystatic/core";

import { campoCuerpoMdx, campoSeo } from "../shared/fields";
import { opcionesAreas, opcionesSubtemas } from "../shared/options";

/**
 * Blog articles collection.
 *
 * Articles are organized by practice area. The slug must be shaped like
 * area/nombre-del-articulo so the URL and the area field always match.
 */
export const blog = collection({
	label: "Blog",
	path: "src/content/blog/es/**",
	slugField: "titulo",
	entryLayout: "content",
	previewUrl: "/blog/{slug}/",
	columns: ["titulo", "publicado", "borrador"],
	format: { contentField: "cuerpo" },
	schema: {
		titulo: fields.slug({
			name: {
				label: "Título",
				description: "Entre 10 y 90 caracteres.",
				validation: { isRequired: true, length: { min: 10, max: 90 } },
			},
			slug: {
				label: "Dirección web (área/nombre)",
				description:
					"Formato: area/nombre-del-articulo — por ejemplo derecho-laboral/despido-injustificado. La primera parte tiene que coincidir con el área de abajo.",
				validation: {
					pattern: {
						regex: /^[a-z0-9-]+\/[a-z0-9-]+$/,
						message: "Usá area/nombre-del-articulo, todo en minúsculas.",
					},
				},
			},
		}),
		area: fields.select({
			label: "Área de práctica",
			description: "Debe coincidir con la primera parte de la dirección web.",
			options: opcionesAreas,
			defaultValue: "derecho-civil-mercantil",
		}),
		subtema: fields.select({
			label: "Subtema (opcional)",
			options: opcionesSubtemas,
			defaultValue: "",
		}),
		locale: fields.select({
			label: "Idioma",
			options: [{ label: "Español", value: "es" }],
			defaultValue: "es",
		}),
		descripcion: fields.text({
			label: "Resumen / descripción para Google",
			multiline: true,
			description: "Entre 70 y 160 caracteres.",
			validation: { isRequired: true, length: { min: 70, max: 160 } },
		}),
		autor: fields.text({
			label: "Autora",
			defaultValue: "Lisbeth Gutiérrez",
			validation: { isRequired: true },
		}),
		publicado: fields.date({
			label: "Fecha de publicación",
			validation: { isRequired: true },
		}),
		actualizado: fields.date({
			label: "Última actualización",
			validation: { isRequired: false },
		}),
		etiquetas: fields.array(fields.text({ label: "Etiqueta" }), {
			label: "Etiquetas",
			itemLabel: (p) => p.value || "Etiqueta",
			validation: { length: { max: 8 } },
		}),
		portada: fields.image({
			label: "Imagen de portada (opcional)",
			directory: "src/assets/images",
			publicPath: "/src/assets/images/",
			validation: { isRequired: false },
		}),
		portadaAlt: fields.text({
			label: "Descripción de la portada",
			description: "Obligatoria si subiste una imagen.",
			validation: { isRequired: false },
		}),
		destacado: fields.checkbox({ label: "Destacar", defaultValue: false }),
		borrador: fields.checkbox({
			label: "Borrador (no se publica)",
			defaultValue: true,
			description: "Empezá en borrador y desmarcalo cuando el artículo esté listo.",
		}),
		seo: campoSeo,
		cuerpo: campoCuerpoMdx("Contenido"),
	},
});

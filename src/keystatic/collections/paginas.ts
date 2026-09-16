import { collection, fields } from "@keystatic/core";

import { campoSeo } from "../shared/fields";

/**
 * Legal pages collection (privacy notice, terms, etc.).
 *
 * These pages start as drafts so the contact form never links to a document
 * that doesn't exist yet.
 */
export const paginas = collection({
	label: "Páginas legales",
	path: "src/content/paginas/*",
	slugField: "titulo",
	entryLayout: "content",
	previewUrl: "/legal/{slug}/",
	columns: ["titulo", "actualizado", "borrador"],
	format: { contentField: "cuerpo" },
	schema: {
		titulo: fields.slug({
			name: {
				label: "Título",
				validation: { isRequired: true, length: { min: 5, max: 80 } },
			},
			slug: {
				label: "Dirección web",
				description:
					"Cambiarla rompe los enlaces existentes: tocala solo si sabés lo que hacés.",
			},
		}),
		descripcion: fields.text({
			label: "Descripción para Google",
			multiline: true,
			description: "Entre 70 y 160 caracteres.",
			validation: { isRequired: true, length: { min: 70, max: 160 } },
		}),
		actualizado: fields.date({
			label: "Última actualización",
			validation: { isRequired: true },
		}),
		borrador: fields.checkbox({
			label: "Borrador (no se publica)",
			defaultValue: true,
			description:
				"Mientras esté marcado, la página no existe en el sitio y el formulario de contacto no la enlaza.",
		}),
		seo: campoSeo,
		cuerpo: fields.mdx({ label: "Contenido", extension: "mdx" }),
	},
});

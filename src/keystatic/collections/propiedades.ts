import { collection, fields } from "@keystatic/core";

import { opciones } from "../../i18n/enums";
import { campoFotos, campoSeo, campoUbicacion } from "../shared/fields";

/**
 * Real-estate listings collection.
 *
 * A property is data, not prose, so the editor uses a form layout. Lisbeth
 * creates the photos first in /estudio, then pastes each R2 path here.
 */
export const propiedades = collection({
	label: "Propiedades",
	path: "src/content/propiedades/*",
	slugField: "referencia",
	entryLayout: "form",
	format: { data: "json" },
	previewUrl: "/propiedades/inmueble/{slug}/",
	columns: ["referencia", "operacion", "tipo", "estado", "precio", "borrador"],
	schema: {
		referencia: fields.slug({
			name: {
				label: "Código de la propiedad",
				description:
					"Formato P-0001. Sirve para que un cliente te la mencione por teléfono o WhatsApp.",
				validation: {
					isRequired: true,
					pattern: { regex: /^P-\d{4}$/, message: "Usá el formato P-0001" },
				},
			},
			slug: {
				label: "Dirección web",
				description:
					'Se genera del código, pero conviene poner algo descriptivo: "casa-santa-tecla-3h".',
				validation: {
					pattern: {
						regex: /^[a-z0-9-]+$/,
						message: "Solo minúsculas, números y guiones.",
					},
				},
			},
		}),

		operacion: fields.select({
			label: "¿Se vende o se alquila?",
			options: [
				{ label: "En venta", value: "venta" },
				{ label: "En alquiler", value: "alquiler" },
			],
			defaultValue: "venta",
		}),
		tipo: fields.select({
			label: "Tipo de propiedad",
			description: 'Si elegís "Terreno" no se te van a pedir habitaciones ni baños.',
			options: opciones("tipoPropiedad"),
			defaultValue: "casa",
		}),
		estado: fields.select({
			label: "Estado",
			description:
				'Marcala como "Vendida" o "Alquilada" cuando pase: deja de aparecer en el listado pero conserva su dirección web.',
			options: opciones("estadoPropiedad"),
			defaultValue: "disponible",
		}),

		precio: fields.number({
			label: "Precio (US$)",
			description:
				"Solo el número, sin signos ni comas. Ejemplo: 125000. Si es alquiler, poné la renta mensual.",
			validation: { isRequired: true, min: 1 },
		}),
		periodoPrecio: fields.select({
			label: "El precio es…",
			description:
				'Venta → "Precio total". Alquiler → "Renta mensual". Si no coincide con la operación, el sitio no publica.',
			options: [
				{ label: "Precio total (venta)", value: "total" },
				{ label: "Renta mensual (alquiler)", value: "mensual" },
			],
			defaultValue: "total",
		}),
		precioNegociable: fields.checkbox({
			label: "Precio negociable",
			defaultValue: false,
		}),
		ocultarPrecio: fields.checkbox({
			label: 'Mostrar "consultar precio" en vez del monto',
			defaultValue: false,
		}),
		deposito: fields.number({
			label: "Depósito (US$, solo alquiler)",
			validation: { isRequired: false, min: 0 },
		}),

		superficie: fields.object(
			{
				valor: fields.number({
					label: "Superficie del terreno",
					validation: { isRequired: true, min: 1 },
				}),
				unidad: fields.select({
					label: "Unidad",
					options: opciones("unidadSuperficie"),
					defaultValue: "m2",
				}),
			},
			{ label: "Terreno" },
		),
		superficieConstruidaM2: fields.number({
			label: "Área construida (m²)",
			description: "Dejalo vacío si es un terreno.",
			validation: { isRequired: false, min: 1 },
		}),
		habitaciones: fields.number({
			label: "Habitaciones",
			description: "Dejalo vacío solo si es un terreno.",
			validation: { isRequired: false, min: 0, max: 20 },
		}),
		banos: fields.number({
			label: "Baños",
			description: "Se acepta medio baño: 2.5",
			validation: { isRequired: false, min: 0, max: 20 },
		}),
		parqueos: fields.integer({
			label: "Parqueos",
			defaultValue: 0,
			validation: { isRequired: true, min: 0, max: 20 },
		}),
		niveles: fields.integer({
			label: "Niveles / pisos",
			validation: { isRequired: false, min: 1, max: 10 },
		}),
		anioConstruccion: fields.integer({
			label: "Año de construcción",
			validation: { isRequired: false, min: 1900, max: 2100 },
		}),
		amenidades: fields.multiselect({
			label: "Amenidades",
			description: "Marcá todo lo que aplique.",
			options: opciones("amenidad"),
			defaultValue: [],
		}),

		ubicacion: campoUbicacion,

		fotos: campoFotos("propiedades"),
		portada: fields.integer({
			label: "¿Cuál es la foto principal?",
			description:
				"0 = la primera de la galería, 1 = la segunda, y así. Es la que se ve en el listado.",
			defaultValue: 0,
			validation: { isRequired: true, min: 0 },
		}),
		videoUrl: fields.url({
			label: "Video de YouTube (opcional)",
			validation: { isRequired: false },
		}),

		titulo: fields.text({
			label: "Título del anuncio",
			description:
				'Ejemplo: "Casa de 3 habitaciones en Santa Tecla con jardín". Entre 10 y 90 caracteres.',
			validation: { isRequired: true, length: { min: 10, max: 90 } },
		}),
		descripcionCorta: fields.text({
			label: "Resumen (se ve en el listado)",
			multiline: true,
			description: "Una o dos frases. Entre 40 y 200 caracteres.",
			validation: { isRequired: true, length: { min: 40, max: 200 } },
		}),
		descripcion: fields.text({
			label: "Descripción completa",
			multiline: true,
			description:
				"Contá los detalles: distribución, estado, qué hay cerca, condiciones de pago. Dejá una línea en blanco entre párrafos.",
			validation: { isRequired: true, length: { min: 80 } },
		}),

		destacada: fields.checkbox({
			label: "Destacar en la página de inicio",
			defaultValue: false,
		}),
		orden: fields.integer({
			label: "Orden manual",
			description: "Menor número = aparece primero.",
			defaultValue: 0,
			validation: { isRequired: true },
		}),
		publicada: fields.date({
			label: "Fecha de publicación",
			validation: { isRequired: true },
		}),
		actualizada: fields.date({
			label: "Última actualización",
			validation: { isRequired: false },
		}),
		borrador: fields.checkbox({
			label: "Borrador (no se publica)",
			defaultValue: true,
			description:
				"Empezá en borrador, subí las fotos, y desmarcalo cuando esté lista.",
		}),
		seo: campoSeo,
	},
});

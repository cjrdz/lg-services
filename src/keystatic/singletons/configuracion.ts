import { fields, singleton } from "@keystatic/core";

/**
 * Global site settings singleton.
 *
 * Site name, profession, modules that are visible, and the image used when the
 * site is shared on social networks.
 */
export const configuracion = singleton({
	label: "Configuración general",
	path: "src/data/sitio/",
	format: { data: "json" },
	schema: {
		nombre: fields.text({
			label: "Nombre del sitio",
			defaultValue: "Lisbeth Gutiérrez",
			validation: { isRequired: true },
		}),
		nombreLegal: fields.text({
			label: "Nombre legal completo",
			validation: { isRequired: true },
		}),
		profesion: fields.text({
			label: "Profesión",
			description: 'Aparece bajo tu nombre. Ejemplo: "Asesora y consultora legal".',
			validation: { isRequired: true },
		}),
		numeroAbogada: fields.text({
			label: "N.º de autorización (opcional)",
			validation: { isRequired: false },
		}),
		ogImagen: fields.text({
			label: "Imagen al compartir en redes",
			description:
				"Ruta de una imagen de 1200×630 px. Es lo que se ve al compartir el sitio por WhatsApp o Facebook.",
			validation: { isRequired: true },
		}),
		modulos: fields.object(
			{
				propiedades: fields.checkbox({
					label: "Mostrar la sección Propiedades",
					defaultValue: true,
				}),
				vehiculos: fields.checkbox({
					label: "Mostrar la sección Vehículos",
					defaultValue: true,
				}),
				blog: fields.checkbox({ label: "Mostrar el Blog", defaultValue: true }),
			},
			{
				label: "Secciones visibles",
				description:
					"Desmarcá una para esconderla del menú y del inicio sin borrar su contenido.",
			},
		),
	},
});

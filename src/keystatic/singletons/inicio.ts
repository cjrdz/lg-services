import { fields, singleton } from "@keystatic/core";

/**
 * Home page singleton.
 *
 * Lisbeth controls the hero, the process steps, the "about me" snippet and
 * which featured listings appear — all from one place.
 */
export const inicio = singleton({
	label: "Página de inicio",
	path: "src/data/inicio/",
	format: { data: "json" },
	previewUrl: "/",
	schema: {
		heroTitulo: fields.text({
			label: "Titular principal",
			description: "Lo primero que se lee al entrar. Entre 10 y 70 caracteres.",
			validation: { isRequired: true, length: { min: 10, max: 70 } },
		}),
		heroSubtitulo: fields.text({
			label: "Subtítulo",
			multiline: true,
			description: "Una o dos frases. Entre 20 y 180 caracteres.",
			validation: { isRequired: true, length: { min: 20, max: 180 } },
		}),
		heroEtiqueta: fields.text({
			label: "Antetítulo",
			description:
				"La línea corta en mayúsculas que va arriba del titular. Ejemplo: “Ejercicio legal en El Salvador”. Si la dejás vacía, no se dibuja.",
			validation: { isRequired: false, length: { max: 60 } },
		}),
		heroImagen: fields.image({
			label: "Imagen principal",
			description: "Se optimiza sola. Ideal: vertical, mínimo 1200 px de ancho.",
			directory: "src/assets/images",
			publicPath: "/src/assets/images/",
			validation: { isRequired: true },
		}),
		heroImagenAlt: fields.text({
			label: "Descripción de la imagen",
			description:
				"Para buscadores y lectores de pantalla. Ejemplo: “Lisbeth Gutiérrez en su oficina”.",
			validation: { isRequired: true, length: { min: 5 } },
		}),
		heroCtaTexto: fields.text({
			label: "Texto del botón",
			defaultValue: "Agendar consulta",
			validation: { isRequired: true },
		}),
		heroCtaUrl: fields.text({
			label: "Destino del botón",
			description: "Una ruta del sitio. Ejemplo: /contacto",
			defaultValue: "/contacto",
			validation: { isRequired: true },
		}),
		heroDatos: fields.array(
			fields.object({
				valor: fields.text({
					label: "Dato",
					description: "Corto y en palabras. Ejemplo: “Siete”, “Presencial y remoto”.",
					validation: { isRequired: true },
				}),
				etiqueta: fields.text({
					label: "Qué significa",
					description: "Ejemplo: “áreas de práctica”, “en todo el país”.",
					validation: { isRequired: true },
				}),
			}),
			{
				label: "Tres datos bajo el titular",
				description:
					"Máximo tres. Van en una fila debajo de los botones. Si la dejás vacía, esa fila no aparece.",
				itemLabel: (p) => `${p.fields.valor.value} — ${p.fields.etiqueta.value}`,
				validation: { length: { max: 3 } },
			},
		),

		procesoIntro: fields.text({
			label: "Cómo se trabaja un caso — introducción",
			multiline: true,
			description:
				"Una o dos frases que acompañan a los pasos. Si no hay pasos, esta sección no se dibuja.",
			validation: { isRequired: false, length: { max: 240 } },
		}),
		procesoPasos: fields.array(
			fields.object({
				titulo: fields.text({
					label: "Paso",
					description: "Ejemplo: “Primer contacto”.",
					validation: { isRequired: true, length: { min: 3 } },
				}),
				descripcion: fields.text({
					label: "En qué consiste",
					multiline: true,
					validation: { isRequired: true, length: { min: 20 } },
				}),
			}),
			{
				label: "Pasos del proceso",
				description:
					"Máximo cinco. Se numeran solos (01, 02, 03…). Si la dejás vacía, la sección completa desaparece del inicio.",
				itemLabel: (p) => p.fields.titulo.value || "Paso",
				validation: { length: { max: 5 } },
			},
		),

		sobreMiCita: fields.text({
			label: "Sobre mí — frase destacada",
			multiline: true,
			description:
				"Se muestra grande, entre comillas. Escribila sin comillas: el sitio se las pone.",
			validation: { isRequired: false, length: { max: 320 } },
		}),
		sobreMiTexto: fields.text({
			label: "Sobre mí — texto",
			multiline: true,
			description: "Dos o tres líneas debajo de la frase.",
			validation: { isRequired: false, length: { max: 400 } },
		}),
		sobreMiImagen: fields.image({
			label: "Sobre mí — fotografía",
			description:
				"Opcional. Horizontal (4:3), de tu despacho o de vos trabajando. Sin ella, la frase ocupa todo el ancho.",
			directory: "src/assets/images",
			publicPath: "/src/assets/images/",
			validation: { isRequired: false },
		}),

		mostrarPropiedadesDestacadas: fields.checkbox({
			label: "Mostrar propiedades destacadas en el inicio",
			defaultValue: true,
		}),
		mostrarVehiculosDestacados: fields.checkbox({
			label: "Mostrar vehículos destacados en el inicio",
			defaultValue: true,
		}),
		maxDestacados: fields.integer({
			label: "¿Cuántos mostrar de cada uno?",
			defaultValue: 3,
			validation: { isRequired: true, min: 2, max: 9 },
		}),
	},
});

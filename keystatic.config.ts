import { collection, config, fields, singleton } from "@keystatic/core";
import { createElement } from "react";

import { AREA_IDS, AREAS, SUBTEMAS } from "./src/lib/taxonomia";
import { opciones } from "./src/i18n/enums";
import { DEPARTAMENTOS, DISTRITOS } from "./src/lib/geo/el-salvador";

/**
 * Lisbeth's admin panel.
 *
 * DESIGN PRINCIPLE: she must never be able to save something that breaks the
 * site. In practice:
 *   · Every closed set is a `select`, never free text.
 *   · Every field has a Spanish `description` with a concrete example.
 *   · Slugs derive from the title; she's never asked to type kebab-case.
 *   · Whatever doesn't apply is hidden (fields.conditional).
 *   · Whatever still slips through is caught by zod at build time, so the
 *     previous deploy stays live. See src/content.config.ts.
 *
 * Field `label`/`description` strings below are in Spanish on purpose —
 * they're what Lisbeth reads in the panel.
 */

const esDev = process.env.NODE_ENV === "development";

const opcionesAreas = AREA_IDS.map((id) => ({
	label: AREAS[id].i18n.es.titulo,
	value: id,
}));

/** Subtopics across all 7 areas, deduplicated, for the blog's select. */
const opcionesSubtemas = [...new Set(AREA_IDS.flatMap((id) => SUBTEMAS[id]))]
	.sort((a, b) => a.localeCompare(b, "es"))
	.map((s) => ({ label: s, value: s }));

/**
 * Departamento + distrito, chained.
 *
 * The conditional's discriminant IS the departamento select — not a separate
 * one. Done naively you get TWO departamento dropdowns she'd have to keep in
 * sync by hand, which is a guaranteed support call.
 */
const campoUbicacion = fields.conditional(
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
const campoFotos = (carpeta: "propiedades" | "vehiculos") =>
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

const campoSeo = fields.object(
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

export default config({
	// Writes to disk in dev; commits to GitHub in production — that's what
	// lets her publish without ever touching git.
	storage: esDev
		? { kind: "local" }
		: { kind: "github", repo: { owner: "cjrdz", name: "lg-services" } },

	ui: {
		brand: {
			name: "Panel de Lisbeth",
			mark: () =>
				createElement("img", {
					src: "/icon.png",
					alt: "",
					// icon.png is 346×445 (not square) — fixed height, proportional
					// width, so the "G" mark doesn't get squished into a square box.
					width: 19,
					height: 24,
				}),
		},
		navigation: {
			Sitio: ["inicio", "contacto", "configuracion"],
			"Servicios legales": ["servicios"],
			Propiedades: ["propiedades"],
			Vehículos: ["vehiculos"],
			Blog: ["blog"],
			Legales: ["paginas"],
		},
	},

	singletons: {
		inicio: singleton({
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
		}),

		contacto: singleton({
			label: "Datos de contacto",
			path: "src/data/contacto/",
			format: { data: "json" },
			previewUrl: "/contacto/",
			schema: {
				telefono: fields.text({
					label: "Teléfono",
					description: "Formato exacto: +503 7777-7777",
					validation: {
						isRequired: true,
						pattern: {
							regex: /^\+503 \d{4}-\d{4}$/,
							message: "Usá el formato +503 7777-7777",
						},
					},
				}),
				whatsapp: fields.text({
					label: "WhatsApp (solo números)",
					description:
						"Código de país y número, sin espacios ni signos. Ejemplo: 50377777777",
					validation: {
						isRequired: true,
						pattern: {
							regex: /^503\d{8}$/,
							message: "Debe ser 503 seguido de 8 dígitos",
						},
					},
				}),
				correo: fields.text({
					label: "Correo electrónico",
					validation: {
						isRequired: true,
						pattern: {
							regex: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
							message: "Ingresá un correo válido",
						},
					},
				}),
				direccion: fields.text({
					label: "Dirección de la oficina",
					multiline: true,
					validation: { isRequired: true, length: { min: 10 } },
				}),
				departamento: fields.select({
					label: "Departamento",
					options: DEPARTAMENTOS.map((d) => ({ label: d.nombre, value: d.id })),
					defaultValue: "ahuachapan",
				}),
				distrito: fields.text({
					label: "Distrito",
					description:
						"Tiene que pertenecer al departamento de arriba (por ejemplo, san-pedro-puxtla en Ahuachapán).",
					defaultValue: "san-pedro-puxtla",
					validation: { isRequired: true },
				}),
				horario: fields.array(
					fields.object({
						dias: fields.text({
							label: "Días",
							description: 'Ejemplo: "Lunes a viernes"',
							validation: { isRequired: true },
						}),
						horas: fields.text({
							label: "Horas",
							description: 'Ejemplo: "8:00 a.m. – 5:00 p.m."',
							validation: { isRequired: true },
						}),
					}),
					{
						label: "Horario de atención",
						itemLabel: (p) => `${p.fields.dias.value} — ${p.fields.horas.value}`,
						validation: { length: { min: 1 } },
					},
				),
				redes: fields.object(
					{
						facebook: fields.url({
							label: "Facebook",
							validation: { isRequired: false },
						}),
						instagram: fields.url({
							label: "Instagram",
							validation: { isRequired: false },
						}),
						tiktok: fields.url({ label: "TikTok", validation: { isRequired: false } }),
						linkedin: fields.url({
							label: "LinkedIn",
							validation: { isRequired: false },
						}),
					},
					{ label: "Redes sociales" },
				),
				motivosContacto: fields.array(
					fields.object({
						id: fields.text({
							label: "Identificador",
							description: "Sin espacios ni tildes. Ejemplo: consulta-legal",
							validation: {
								isRequired: true,
								pattern: {
									regex: /^[a-z0-9-]+$/,
									message: "Solo minúsculas, números y guiones.",
								},
							},
						}),
						etiqueta: fields.text({
							label: "Texto que ve el visitante",
							validation: { isRequired: true },
						}),
					}),
					{
						label: "Opciones del formulario de contacto",
						itemLabel: (p) => p.fields.etiqueta.value || "Motivo",
						validation: { length: { min: 1 } },
					},
				),
			},
		}),

		configuracion: singleton({
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
		}),
	},

	collections: {
		paginas: collection({
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
		}),

		propiedades: collection({
			label: "Propiedades",
			path: "src/content/propiedades/*",
			slugField: "referencia",
			// "form", not "content": a listing is data, not an article — this way
			// no unnecessary rich-text editor shows up.
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
					description:
						'Si elegís "Terreno" no se te van a pedir habitaciones ni baños.',
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
		}),

		vehiculos: collection({
			label: "Vehículos",
			path: "src/content/vehiculos/*",
			slugField: "referencia",
			// "form", not "content": a listing is data, not an article.
			entryLayout: "form",
			format: { data: "json" },
			previewUrl: "/vehiculos/alquiler/{slug}/",
			columns: ["referencia", "marca", "modelo", "anio", "tarifaDiaria", "borrador"],
			schema: {
				referencia: fields.slug({
					name: {
						label: "Código del vehículo",
						description:
							"Formato V-0001. Sirve para que un cliente te lo mencione por teléfono o WhatsApp.",
						validation: {
							isRequired: true,
							pattern: { regex: /^V-\d{4}$/, message: "Usá el formato V-0001" },
						},
					},
					slug: {
						label: "Dirección web",
						description: 'Poné algo descriptivo: "toyota-rav4-2022".',
						validation: {
							pattern: {
								regex: /^[a-z0-9-]+$/,
								message: "Solo minúsculas, números y guiones.",
							},
						},
					},
				}),

				marca: fields.text({
					label: "Marca",
					description: "Ejemplo: Toyota, Nissan, Kia.",
					validation: { isRequired: true, length: { min: 2 } },
				}),
				modelo: fields.text({
					label: "Modelo",
					description: "Ejemplo: RAV4, Frontier.",
					validation: { isRequired: true },
				}),
				anio: fields.integer({
					label: "Año",
					defaultValue: new Date().getFullYear(),
					validation: {
						isRequired: true,
						min: 1990,
						max: new Date().getFullYear() + 1,
					},
				}),
				categoria: fields.select({
					label: "Tipo de vehículo",
					options: opciones("categoriaVehiculo"),
					defaultValue: "sedan",
				}),
				transmision: fields.select({
					label: "Transmisión",
					options: opciones("transmision"),
					defaultValue: "automatica",
				}),
				combustible: fields.select({
					label: "Combustible",
					options: opciones("combustible"),
					defaultValue: "gasolina",
				}),
				traccion: fields.select({
					label: "Tracción",
					options: opciones("traccion"),
					defaultValue: "4x2",
				}),
				pasajeros: fields.integer({
					label: "Pasajeros",
					defaultValue: 5,
					validation: { isRequired: true, min: 2, max: 30 },
				}),
				puertas: fields.integer({
					label: "Puertas",
					defaultValue: 4,
					validation: { isRequired: true, min: 2, max: 6 },
				}),
				maletas: fields.integer({
					label: "Maletas grandes que caben",
					defaultValue: 2,
					validation: { isRequired: true, min: 0, max: 10 },
				}),
				aireAcondicionado: fields.checkbox({
					label: "Aire acondicionado",
					defaultValue: true,
				}),

				tarifaDiaria: fields.number({
					label: "Tarifa por día (US$)",
					description: "Solo el número. Ejemplo: 45",
					validation: { isRequired: true, min: 1 },
				}),
				tarifaSemanal: fields.number({
					label: "Tarifa por semana (US$)",
					description:
						"Opcional, pero tiene que ser MENOR que 7 días sueltos — si no, el sitio no publica.",
					validation: { isRequired: false, min: 1 },
				}),
				tarifaMensual: fields.number({
					label: "Tarifa por mes (US$)",
					description: "Opcional. Menor que 30 días sueltos.",
					validation: { isRequired: false, min: 1 },
				}),
				deposito: fields.number({
					label: "Depósito de garantía (US$)",
					defaultValue: 0,
					validation: { isRequired: true, min: 0 },
				}),

				kilometraje: fields.select({
					label: "Kilometraje",
					options: [
						{ label: "Ilimitado", value: "ilimitado" },
						{ label: "Limitado por día", value: "limitado" },
					],
					defaultValue: "ilimitado",
				}),
				kmIncluidosPorDia: fields.integer({
					label: "Km incluidos por día",
					description:
						'Solo si arriba elegiste "Limitado por día". Si no, dejalo vacío.',
					validation: { isRequired: false, min: 1 },
				}),
				edadMinima: fields.integer({
					label: "Edad mínima del conductor",
					defaultValue: 23,
					validation: { isRequired: true, min: 18, max: 30 },
				}),
				requisitos: fields.array(fields.text({ label: "Requisito" }), {
					label: "Requisitos para alquilar",
					itemLabel: (p) => p.value || "Requisito",
					validation: { length: { min: 1 } },
				}),

				disponibilidad: fields.select({
					label: "Disponibilidad",
					options: opciones("disponibilidadVehiculo"),
					defaultValue: "disponible",
				}),
				entrega: fields.multiselect({
					label: "Departamentos donde lo entregás",
					options: DEPARTAMENTOS.map((d) => ({ label: d.nombre, value: d.id })),
					defaultValue: ["san-salvador"],
				}),

				fotos: campoFotos("vehiculos"),
				portada: fields.integer({
					label: "¿Cuál es la foto principal?",
					description:
						"0 = la primera de la galería, 1 = la segunda, y así. Es la que se ve en el listado.",
					defaultValue: 0,
					validation: { isRequired: true, min: 0 },
				}),

				titulo: fields.text({
					label: "Título del anuncio",
					description: 'Ejemplo: "Toyota RAV4 2022 automática, ideal para carretera".',
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
						"Estado del vehículo, equipamiento, para qué sirve mejor, condiciones. Dejá una línea en blanco entre párrafos.",
					validation: { isRequired: true, length: { min: 80 } },
				}),

				destacado: fields.checkbox({
					label: "Destacar en la página de inicio",
					defaultValue: false,
				}),
				orden: fields.integer({
					label: "Orden manual",
					description: "Menor número = aparece primero.",
					defaultValue: 0,
					validation: { isRequired: true },
				}),
				publicado: fields.date({
					label: "Fecha de publicación",
					validation: { isRequired: true },
				}),
				borrador: fields.checkbox({
					label: "Borrador (no se publica)",
					defaultValue: true,
					description:
						"Empezá en borrador, subí las fotos, y desmarcalo cuando esté listo.",
				}),
				seo: campoSeo,
			},
		}),

		servicios: collection({
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
				cuerpo: fields.mdx({
					label: "Contenido de la página",
					extension: "mdx",
					options: {
						image: {
							directory: "src/assets/images",
							publicPath: "/src/assets/images/",
						},
					},
				}),
			},
		}),

		blog: collection({
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
					options: [{ label: "— Ninguno —", value: "" }, ...opcionesSubtemas],
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
				cuerpo: fields.mdx({
					label: "Contenido",
					extension: "mdx",
					options: {
						image: {
							directory: "src/assets/images",
							publicPath: "/src/assets/images/",
						},
					},
				}),
			},
		}),
	},
});

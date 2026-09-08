import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

import { DEFAULT_LOCALE, LOCALES } from "./i18n/config";
import { ids } from "./i18n/enums";
import { AREA_IDS } from "./lib/taxonomia";
import { DEPARTAMENTO_IDS, distritoValido } from "./lib/geo/el-salvador";
import { RE_TALLO } from "./lib/media/keys";

/**
 * Content collections.
 *
 * These validations are the site's real safety net: they run at build time,
 * so an invalid Keystatic entry fails the Cloudflare build and the previous
 * deploy stays live. Don't loosen them just to get a build to pass.
 *
 * `servicios` and `blog` are long-form: one file per locale under
 * src/content/<col>/<locale>/, discriminated by a `locale` field — the
 * content IS the prose, so duplicating per locale is natural. `propiedades`
 * and `vehiculos` go the other way: one locale-neutral file with a
 * `textos.{locale}` block, because duplicating 20 photo paths and a price
 * per locale guarantees drift.
 */

const localeField = z.enum(LOCALES).default(DEFAULT_LOCALE);

/** Optional metadata overriding what's sent to search engines. */
const seo = z
	.object({
		titulo: z.string().max(60).optional(),
		descripcion: z.string().max(160).optional(),
		imagen: z.string().optional(),
		noindex: z.boolean().default(false),
	})
	.default({ noindex: false });

const servicios = defineCollection({
	// [^_] excludes src/content/_plantillas/ — Keystatic's templates for new
	// entries, which must never show up as published content.
	loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/servicios" }),
	schema: z.object({
		titulo: z.string().min(5).max(80),
		// ID, never the display text — so translating never means rewriting files.
		area: z.enum(AREA_IDS),
		locale: localeField,
		resumen: z.string().min(40).max(200),
		// The literal meta description: outside 70-160 Google truncates or ignores it.
		descripcionSeo: z.string().min(70).max(160),
		palabrasClave: z.array(z.string()).min(3).max(12).default([]),
		subservicios: z
			.array(
				z.object({
					titulo: z.string().min(3),
					descripcion: z.string().min(20),
				}),
			)
			.default([]),
		faq: z
			.array(
				z.object({
					pregunta: z.string().min(10),
					respuesta: z.string().min(20),
				}),
			)
			.default([]),
		orden: z.number().int().min(0).default(0),
		destacado: z.boolean().default(false),
		publicado: z.coerce.date(),
		actualizado: z.coerce.date().optional(),
		borrador: z.boolean().default(false),
		seo,
	}),
});

const blog = defineCollection({
	loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
	schema: z.object({
		titulo: z.string().min(10).max(90),
		descripcion: z.string().min(70).max(160),
		area: z.enum(AREA_IDS),
		subtema: z.string().optional(),
		locale: localeField,
		autor: z.string().default("Lisbeth Gutiérrez"),
		publicado: z.coerce.date(),
		actualizado: z.coerce.date().optional(),
		etiquetas: z.array(z.string()).max(8).default([]),
		portada: z.string().optional(),
		portadaAlt: z.string().optional(),
		destacado: z.boolean().default(false),
		borrador: z.boolean().default(false),
		seo,
	}),
});

/* ---------------------------------------------------------------- */
/* Legal pages                                                       */
/* ---------------------------------------------------------------- */

/**
 * Privacy notice and terms.
 *
 * The contact form requires accepting the privacy notice via a mandatory
 * checkbox, and that text didn't exist before — visitors were asked to
 * accept a document that wasn't there. On a lawyer's site collecting
 * personal data, that can't stand.
 *
 * Lisbeth writes the content; this is just the structure and routing.
 */
const paginas = defineCollection({
	loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/paginas" }),
	schema: z.object({
		titulo: z.string().min(5).max(80),
		descripcion: z.string().min(70).max(160),
		actualizado: z.coerce.date(),
		borrador: z.boolean().default(true),
		seo,
	}),
});

/* ---------------------------------------------------------------- */
/* Properties                                                        */
/* ---------------------------------------------------------------- */

/**
 * One photo: R2 path + description, ALWAYS together in one object rather
 * than two parallel arrays — so reordering the gallery can't desync a
 * description from its photo.
 */
const foto = z.object({
	ruta: z
		.string()
		.regex(
			RE_TALLO,
			'Ruta inválida. Copiala desde /estudio con el botón "Copiar" — se ve así: media/propiedades/casa-x/k7x2f9a1',
		),
	alt: z
		.string()
		.min(5, "Describí la foto: sirve para Google y para lectores de pantalla.")
		.max(140),
});

/**
 * Location as Keystatic actually WRITES it, flattened for the rest of the code.
 *
 * In the panel it's a `fields.conditional` discriminated on departamento: once
 * chosen, the distrito select only shows its own — so Lisbeth never has to
 * scan ~260 distritos or pair one with the wrong departamento.
 *
 * The cost of that convenience is the on-disk shape Keystatic enforces:
 *
 *   { "discriminant": "la-libertad", "value": { "distrito": "santa-tecla", … } }
 *
 * A flat `{ departamento, distrito }` used to be expected here, which broke
 * every property in the panel with:
 *   Field validation failed: ubicacion: Must only contain keys "discriminant"
 *   and "value", not "departamento"
 *
 * So this validates the real shape and `.transform()`s it to the flat one
 * that pages and `anuncios.ts` use — one shape in the code, no unions.
 */
const ubicacion = z
	.object({
		discriminant: z.enum(DEPARTAMENTO_IDS),
		value: z.object({
			distrito: z.string().min(1),
			zona: z.string().optional(),
			mapaUrl: z.url().optional(),
		}),
	})
	.transform((u) => ({
		departamento: u.discriminant,
		distrito: u.value.distrito,
		zona: u.value.zona,
		mapaUrl: u.value.mapaUrl,
	}))
	.refine((u) => distritoValido(u.departamento, u.distrito), {
		message: "Ese distrito no pertenece al departamento elegido.",
		path: ["distrito"],
	});

const propiedades = defineCollection({
	loader: glob({ pattern: "**/[^_]*.json", base: "./src/content/propiedades" }),
	schema: z
		.object({
			referencia: z.string().regex(/^P-\d{4}$/, "Formato: P-0001"),
			operacion: z.enum(["venta", "alquiler"]),
			tipo: z.enum(ids("tipoPropiedad")),
			estado: z.enum(ids("estadoPropiedad")).default("disponible"),

			precio: z.number().positive("El precio debe ser mayor que 0."),
			moneda: z.literal("USD").default("USD"),
			periodoPrecio: z.enum(["total", "mensual"]).default("total"),
			precioNegociable: z.boolean().default(false),
			ocultarPrecio: z.boolean().default(false),
			deposito: z.number().nonnegative().optional(),

			superficie: z.object({
				valor: z.number().positive(),
				unidad: z.enum(ids("unidadSuperficie")).default("m2"),
			}),
			superficieConstruidaM2: z.number().positive().optional(),

			habitaciones: z.number().int().min(0).max(20).optional(),
			banos: z.number().min(0).max(20).multipleOf(0.5).optional(),
			parqueos: z.number().int().min(0).max(20).default(0),
			niveles: z.number().int().min(1).max(10).optional(),
			anioConstruccion: z.number().int().min(1900).max(2100).optional(),
			amenidades: z.array(z.enum(ids("amenidad"))).default([]),

			ubicacion,
			fotos: z.array(foto).min(1, "Subí al menos una foto.").max(30),
			portada: z.number().int().min(0).default(0),
			videoUrl: z.url().optional(),

			titulo: z.string().min(10).max(90),
			descripcionCorta: z.string().min(40).max(200),
			descripcion: z.string().min(80),

			destacada: z.boolean().default(false),
			orden: z.number().int().default(0),
			publicada: z.coerce.date(),
			actualizada: z.coerce.date().optional(),
			borrador: z.boolean().default(true),
			seo,
		})
		/*
		  These cross-field checks are the whole point of the build gate: a form
		  can't prevent them alone, and they'd look bad on a real listing.
		*/
		.superRefine((d, ctx) => {
			if (d.portada >= d.fotos.length) {
				ctx.addIssue({
					code: "custom",
					path: ["portada"],
					message: `La foto de portada (${d.portada}) no existe: hay ${d.fotos.length}.`,
				});
			}

			if (d.tipo === "terreno") {
				if (d.habitaciones !== undefined) {
					ctx.addIssue({
						code: "custom",
						path: ["habitaciones"],
						message: "Un terreno no lleva habitaciones.",
					});
				}
				if (d.superficieConstruidaM2 !== undefined) {
					ctx.addIssue({
						code: "custom",
						path: ["superficieConstruidaM2"],
						message: "Un terreno no lleva área construida.",
					});
				}
			} else if (d.habitaciones === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["habitaciones"],
					message: "Indicá cuántas habitaciones tiene.",
				});
			}

			if (d.operacion === "alquiler" && d.periodoPrecio !== "mensual") {
				ctx.addIssue({
					code: "custom",
					path: ["periodoPrecio"],
					message: 'En alquiler el precio tiene que ser "mensual".',
				});
			}
			if (d.operacion === "venta" && d.periodoPrecio !== "total") {
				ctx.addIssue({
					code: "custom",
					path: ["periodoPrecio"],
					message: 'En venta el precio tiene que ser "total".',
				});
			}

			if (d.operacion === "venta" && d.estado === "alquilado") {
				ctx.addIssue({
					code: "custom",
					path: ["estado"],
					message: 'Una propiedad en venta no puede estar "alquilada".',
				});
			}
			if (d.operacion === "alquiler" && d.estado === "vendido") {
				ctx.addIssue({
					code: "custom",
					path: ["estado"],
					message: 'Una propiedad en alquiler no puede estar "vendida".',
				});
			}

			const fuera = d.fotos.find((f) => !f.ruta.startsWith("media/propiedades/"));
			if (fuera) {
				ctx.addIssue({
					code: "custom",
					path: ["fotos"],
					message: `Esta foto no es de propiedades: ${fuera.ruta}`,
				});
			}
		}),
});

/* ---------------------------------------------------------------- */
/* Vehicles                                                          */
/* ---------------------------------------------------------------- */

const fotoVehiculo = z.object({
	ruta: z
		.string()
		.regex(
			/^media\/vehiculos\/[a-z0-9][a-z0-9-]{1,80}\/[a-z0-9]{8}$/,
			'Ruta inválida. Copiala desde /estudio con el botón "Copiar" — se ve así: media/vehiculos/toyota-rav4-2022/k7x2f9a1',
		),
	alt: z
		.string()
		.min(5, "Describí la foto: sirve para Google y para lectores de pantalla.")
		.max(140),
});

const vehiculos = defineCollection({
	loader: glob({ pattern: "**/[^_]*.json", base: "./src/content/vehiculos" }),
	schema: z
		.object({
			referencia: z.string().regex(/^V-\d{4}$/, "Formato: V-0001"),
			marca: z.string().min(2),
			modelo: z.string().min(1),
			anio: z
				.number()
				.int()
				.min(1990)
				.max(new Date().getFullYear() + 1),
			categoria: z.enum(ids("categoriaVehiculo")),
			transmision: z.enum(ids("transmision")),
			combustible: z.enum(ids("combustible")),
			traccion: z.enum(ids("traccion")).default("4x2"),
			pasajeros: z.number().int().min(2).max(30),
			puertas: z.number().int().min(2).max(6).default(4),
			maletas: z.number().int().min(0).max(10).default(2),
			aireAcondicionado: z.boolean().default(true),

			tarifaDiaria: z.number().positive(),
			tarifaSemanal: z.number().positive().optional(),
			tarifaMensual: z.number().positive().optional(),
			deposito: z.number().nonnegative().default(0),
			moneda: z.literal("USD").default("USD"),

			kilometraje: z.enum(["ilimitado", "limitado"]).default("ilimitado"),
			kmIncluidosPorDia: z.number().int().positive().optional(),
			edadMinima: z.number().int().min(18).max(30).default(23),
			requisitos: z
				.array(z.string().min(3))
				.default([
					"Licencia de conducir vigente",
					"DUI o pasaporte",
					"Tarjeta de crédito para el depósito",
				]),

			disponibilidad: z.enum(ids("disponibilidadVehiculo")).default("disponible"),
			entrega: z.array(z.enum(DEPARTAMENTO_IDS)).min(1).default(["san-salvador"]),

			fotos: z.array(fotoVehiculo).min(1, "Subí al menos una foto.").max(20),
			portada: z.number().int().min(0).default(0),

			titulo: z.string().min(10).max(90),
			descripcionCorta: z.string().min(40).max(200),
			descripcion: z.string().min(80),

			destacado: z.boolean().default(false),
			orden: z.number().int().default(0),
			publicado: z.coerce.date(),
			borrador: z.boolean().default(true),
			seo,
		})
		.superRefine((d, ctx) => {
			if (d.portada >= d.fotos.length) {
				ctx.addIssue({
					code: "custom",
					path: ["portada"],
					message: `La foto de portada (${d.portada}) no existe: hay ${d.fotos.length}.`,
				});
			}

			// A weekly rate pricier than 7 separate days is never intentional —
			// almost always a misplaced zero.
			if (d.tarifaSemanal !== undefined && d.tarifaSemanal >= d.tarifaDiaria * 7) {
				ctx.addIssue({
					code: "custom",
					path: ["tarifaSemanal"],
					message: `La tarifa semanal (${d.tarifaSemanal}) debería ser MENOR que 7 días sueltos (${d.tarifaDiaria * 7}).`,
				});
			}
			if (d.tarifaMensual !== undefined && d.tarifaMensual >= d.tarifaDiaria * 30) {
				ctx.addIssue({
					code: "custom",
					path: ["tarifaMensual"],
					message: `La tarifa mensual (${d.tarifaMensual}) debería ser MENOR que 30 días sueltos (${d.tarifaDiaria * 30}).`,
				});
			}

			if (d.kilometraje === "limitado" && d.kmIncluidosPorDia === undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["kmIncluidosPorDia"],
					message:
						'Si el kilometraje es "limitado", indicá cuántos km incluye por día.',
				});
			}
			if (d.kilometraje === "ilimitado" && d.kmIncluidosPorDia !== undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["kmIncluidosPorDia"],
					message: 'Con kilometraje "ilimitado" no va un límite de km.',
				});
			}

			const fuera = d.fotos.find((f) => !f.ruta.startsWith("media/vehiculos/"));
			if (fuera) {
				ctx.addIssue({
					code: "custom",
					path: ["fotos"],
					message: `Esta foto no es de vehículos: ${fuera.ruta}`,
				});
			}
		}),
});

export const collections = { servicios, blog, propiedades, vehiculos, paginas };

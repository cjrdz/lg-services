import { z } from "astro:schema";

import rawSitio from "@/data/sitio/index.json";
import rawContacto from "@/data/contacto/index.json";
import rawInicio from "@/data/inicio/index.json";
import { DEPARTAMENTO_IDS, distritoValido } from "./geo/el-salvador";

/**
 * Global site data, written by Keystatic as JSON.
 *
 * Validated ONCE here, at module scope. Since the layout imports this file, a
 * malformed JSON breaks the BUILD and the previous deploy stays live —
 * instead of breaking the live site.
 */

const horarioSchema = z.object({
	dias: z.string().min(3),
	horas: z.string().min(3),
});

const contactoSchema = z
	.object({
		telefono: z
			.string()
			.regex(/^\+503 \d{4}-\d{4}$/, "Formato esperado: +503 7777-7777"),
		whatsapp: z
			.string()
			.regex(/^503\d{8}$/, "Solo dígitos con código de país: 50377777777"),
		correo: z.email(),
		direccion: z.string().min(10),
		departamento: z.enum(DEPARTAMENTO_IDS),
		distrito: z.string().min(1),
		horario: z.array(horarioSchema).min(1),
		redes: z
			.object({
				facebook: z.url().optional(),
				instagram: z.url().optional(),
				tiktok: z.url().optional(),
				linkedin: z.url().optional(),
			})
			.default({}),
		motivosContacto: z
			.array(z.object({ id: z.string().min(1), etiqueta: z.string().min(1) }))
			.min(1),
	})
	.refine((c) => distritoValido(c.departamento, c.distrito), {
		message: "El distrito no pertenece al departamento indicado.",
		path: ["distrito"],
	});

const sitioSchema = z.object({
	nombre: z.string().min(2),
	nombreLegal: z.string().min(2),
	profesion: z.string().min(2),
	numeroAbogada: z.string().optional(),
	ogImagen: z.string().min(1),
	/*
	  The R2 photo address does NOT live here: it's PUBLIC_MEDIA_BASE_URL, a
	  wrangler.jsonc environment variable. It used to sit in this singleton
	  and was a trap — Lisbeth could edit it in the panel and nothing would
	  happen, since it's read via import.meta.env at build time.
	*/
	modulos: z
		.object({
			propiedades: z.boolean().default(true),
			vehiculos: z.boolean().default(true),
			blog: z.boolean().default(true),
		})
		.default({ propiedades: true, vehiculos: true, blog: true }),
});

const inicioSchema = z.object({
	heroTitulo: z.string().min(10).max(70),
	heroSubtitulo: z.string().min(20).max(180),
	heroImagen: z.string().min(1),
	heroImagenAlt: z.string().min(5),
	heroCtaTexto: z.string().min(2),
	heroCtaUrl: z.string().min(1),
	mostrarPropiedadesDestacadas: z.boolean().default(true),
	mostrarVehiculosDestacados: z.boolean().default(true),
	maxDestacados: z.number().int().min(2).max(9).default(3),
});

interface ProblemaZod {
	path: PropertyKey[];
	message: string;
}

/**
 * Readable error message. Names the file and each problem field, so fixing
 * it doesn't require reading the stack trace.
 */
function fallo(archivo: string, issues: readonly ProblemaZod[]): Error {
	const detalle = issues
		.map((i) => `  · ${i.path.join(".") || "(raíz)"}: ${i.message}`)
		.join("\n");
	return new Error(`Datos inválidos en src/data/${archivo}:\n${detalle}`);
}

/*
  Each singleton is parsed separately instead of through a generic helper:
  "astro:schema"'s `z` is exported as a VALUE, not a namespace, so
  `z.infer<S>` doesn't exist as a type and a generic helper collapsed
  everything to `unknown`. This way `.data` gets inferred correctly.
*/

const resSitio = sitioSchema.safeParse(rawSitio);
if (!resSitio.success) throw fallo("sitio/index.json", resSitio.error.issues);

const resContacto = contactoSchema.safeParse(rawContacto);
if (!resContacto.success) throw fallo("contacto/index.json", resContacto.error.issues);

const resInicio = inicioSchema.safeParse(rawInicio);
if (!resInicio.success) throw fallo("inicio/index.json", resInicio.error.issues);

export const SITIO = resSitio.data;
export const CONTACTO = resContacto.data;
export const INICIO = resInicio.data;

export type Sitio = typeof SITIO;
export type Contacto = typeof CONTACTO;
export type Inicio = typeof INICIO;

/**
 * WhatsApp link with a pre-filled message.
 * In El Salvador this is the real conversion channel, not the form.
 */
export function whatsappUrl(mensaje?: string): string {
	const base = `https://wa.me/${CONTACTO.whatsapp}`;
	return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

export function telUrl(): string {
	return `tel:${CONTACTO.telefono.replace(/[^\d+]/g, "")}`;
}

export function mailtoUrl(asunto?: string): string {
	const base = `mailto:${CONTACTO.correo}`;
	return asunto ? `${base}?subject=${encodeURIComponent(asunto)}` : base;
}

/** Configured social networks, already filtered, ready to iterate in the footer. */
export function redesActivas(): Array<{ red: string; url: string; icono: string }> {
	const iconos: Record<string, string> = {
		facebook: "lucide:facebook",
		instagram: "lucide:instagram",
		tiktok: "lucide:music",
		linkedin: "lucide:linkedin",
	};
	return Object.entries(CONTACTO.redes)
		.filter((e): e is [string, string] => typeof e[1] === "string" && e[1].length > 0)
		.map(([red, url]) => ({ red, url, icono: iconos[red] ?? "lucide:link" }));
}

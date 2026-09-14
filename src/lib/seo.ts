import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { alternateUrls, localizedUrl, stripLocale } from "@/i18n/routing";
import { departamentoNombre } from "./geo/el-salvador";
import { CONTACTO, SITIO } from "./sitio";

/**
 * SEO helpers and structured data.
 *
 * Generalized from jrdz.dev/src/lib/seo.ts, which hardcoded `{en, es}` and
 * matched the prefix with a literal `/^\/es/` regex. Here everything derives
 * from LOCALES, so adding a language never requires touching this file.
 *
 * And unlike lg-blog, this DOES end up in the HTML — see the
 * `<slot name="head" />` in BaseLayout.astro.
 */

export function canonical(pathname: string, site: URL | string): string {
	return new URL(pathname, site).href;
}

export function hreflangs(pathname: string, site: URL | string) {
	const alts = alternateUrls(pathname, site);
	const xDefault = alts.find((a) => a.locale === DEFAULT_LOCALE) ?? alts[0];
	return { alts, xDefault };
}

/** The business itself. Appears once, on the home page. */
export function esquemaNegocio(site: URL | string) {
	const base = new URL("/", site).href;
	return {
		"@context": "https://schema.org",
		"@type": "LegalService",
		"@id": `${base}#negocio`,
		name: SITIO.nombre,
		legalName: SITIO.nombreLegal,
		description: SITIO.nombre,
		url: base,
		image: new URL(SITIO.ogImagen, site).href,
		telephone: CONTACTO.telefono,
		email: CONTACTO.correo,
		address: {
			"@type": "PostalAddress",
			streetAddress: CONTACTO.direccion,
			addressCountry: "SV",
			addressRegion: departamentoNombre(CONTACTO.departamento),
		},
		areaServed: { "@type": "Country", name: "El Salvador" },
		sameAs: Object.values(CONTACTO.redes).filter(Boolean),
	};
}

export function esquemaSitioWeb(site: URL | string) {
	const base = new URL("/", site).href;
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${base}#sitio`,
		name: SITIO.nombre,
		url: base,
		inLanguage: "es-SV",
		publisher: { "@id": `${base}#negocio` },
	};
}

export interface Miga {
	nombre: string;
	url?: string;
}

export function esquemaMigas(migas: Miga[], site: URL | string) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: migas.map((m, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: m.nombre,
			...(m.url ? { item: new URL(m.url, site).href } : {}),
		})),
	};
}

export interface ArticuloSeo {
	titulo: string;
	descripcion: string;
	autor: string;
	publicado: Date;
	actualizado?: Date;
	imagen?: string;
	area?: string;
}

export function esquemaArticulo(
	art: ArticuloSeo,
	pathname: string,
	site: URL | string,
) {
	return {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: art.titulo,
		description: art.descripcion,
		url: canonical(pathname, site),
		datePublished: art.publicado.toISOString(),
		...(art.actualizado ? { dateModified: art.actualizado.toISOString() } : {}),
		author: { "@type": "Person", name: art.autor },
		publisher: { "@id": `${new URL("/", site).href}#negocio` },
		...(art.imagen ? { image: new URL(art.imagen, site).href } : {}),
		...(art.area ? { articleSection: art.area } : {}),
	};
}

/** FAQPage built from a service's frequently asked questions. */
export function esquemaFaq(faq: Array<{ pregunta: string; respuesta: string }>) {
	if (!faq.length) return null;
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faq.map((f) => ({
			"@type": "Question",
			name: f.pregunta,
			acceptedAnswer: { "@type": "Answer", text: f.respuesta },
		})),
	};
}

export function esquemaServicio(
	servicio: { titulo: string; descripcion: string },
	pathname: string,
	site: URL | string,
) {
	return {
		"@context": "https://schema.org",
		"@type": "LegalService",
		name: servicio.titulo,
		description: servicio.descripcion,
		url: canonical(pathname, site),
		provider: { "@id": `${new URL("/", site).href}#negocio` },
		areaServed: { "@type": "Country", name: "El Salvador" },
	};
}

/** Standard breadcrumbs, always with URLs run through localizedUrl(). */
export function migasDe(
	locale: Locale,
	tramos: Array<{ nombre: string; path?: string }>,
): Miga[] {
	return [
		{ nombre: "Inicio", url: localizedUrl("/", locale) },
		...tramos.map((t) => ({
			nombre: t.nombre,
			url: t.path ? localizedUrl(t.path, locale) : undefined,
		})),
	];
}

/** Locale-less path — useful for comparing the active route in the menu. */
export { stripLocale };

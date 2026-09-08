import { describe, expect, it } from "vitest";
import {
	alternateUrls,
	localePaths,
	localePathsFor,
	localizedUrl,
	resolveLocale,
	stripLocale,
} from "@/i18n/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";

const SITE = "https://lisbethgutierrez.com";

describe("localizedUrl", () => {
	it("no prefija el idioma por defecto y siempre cierra con barra", () => {
		expect(localizedUrl("/propiedades/venta", "es")).toBe("/propiedades/venta/");
		expect(localizedUrl("propiedades/venta", "es")).toBe("/propiedades/venta/");
		expect(localizedUrl("/propiedades/venta/", "es")).toBe("/propiedades/venta/");
	});

	it("la raíz queda como '/' y no como '//'", () => {
		expect(localizedUrl("/", "es")).toBe("/");
		expect(localizedUrl("", "es")).toBe("/");
	});

	it("usa el idioma por defecto si no se pasa ninguno", () => {
		expect(localizedUrl("/contacto")).toBe("/contacto/");
	});
});

describe("stripLocale", () => {
	it("deja intactas las rutas del idioma por defecto", () => {
		expect(stripLocale("/propiedades/venta/")).toBe("/propiedades/venta/");
		expect(stripLocale("/")).toBe("/");
	});

	it("no confunde un segmento de dos letras que no es idioma", () => {
		// "sv" no está en LOCALES, así que no debe removerse.
		expect(stripLocale("/sv/propiedades/")).toBe("/sv/propiedades/");
	});

	it("es idempotente", () => {
		const once = stripLocale("/propiedades/venta/");
		expect(stripLocale(once)).toBe(once);
	});
});

describe("localePaths", () => {
	it("genera una entrada por idioma, con lang undefined para el idioma por defecto", () => {
		const paths = localePaths();
		expect(paths).toHaveLength(LOCALES.length);

		const def = paths.find((p) => p.props.locale === DEFAULT_LOCALE);
		expect(def).toBeDefined();
		// lang undefined es lo que hace que el segmento spread desaparezca de la URL.
		expect(def!.params.lang).toBeUndefined();
	});
});

describe("localePathsFor", () => {
	it("hace el producto cruzado de idiomas por parámetros propios", () => {
		const areas = ["derecho-laboral", "derecho-penal"].map((area) => ({
			params: { area },
			props: { area },
		}));
		const paths = localePathsFor(areas);

		expect(paths).toHaveLength(LOCALES.length * areas.length);
		expect(paths[0].params).toMatchObject({ area: "derecho-laboral" });
		expect(paths[0].props.locale).toBe(DEFAULT_LOCALE);
	});
});

describe("alternateUrls", () => {
	it("devuelve un hreflang absoluto por idioma", () => {
		const alts = alternateUrls("/propiedades/venta/", SITE);
		expect(alts).toHaveLength(LOCALES.length);
		expect(alts.find((a) => a.locale === DEFAULT_LOCALE)?.href).toBe(
			`${SITE}/propiedades/venta/`,
		);
	});

	it("normaliza una ruta que ya trae idioma antes de reconstruir", () => {
		expect(alternateUrls("/propiedades/", SITE)).toEqual(
			alternateUrls(stripLocale("/propiedades/"), SITE),
		);
	});
});

describe("resolveLocale", () => {
	it("cae al idioma por defecto ante un valor inválido", () => {
		expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
		expect(resolveLocale("")).toBe(DEFAULT_LOCALE);
		expect(resolveLocale("klingon")).toBe(DEFAULT_LOCALE);
	});
});

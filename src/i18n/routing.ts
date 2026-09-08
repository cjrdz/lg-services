import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./config";

/**
 * Shared getStaticPaths for every static page under src/pages/[...lang]/.
 *
 *   export { localePaths as getStaticPaths } from "@/i18n/routing";
 *
 * With lang: undefined, Astro generates "/contacto/"; with lang: "en",
 * "/en/contacto/". One file produces both. See the comment in astro.config.mjs.
 */
export function localePaths() {
	return LOCALES.map((locale) => ({
		params: { lang: locale === DEFAULT_LOCALE ? undefined : locale },
		props: { locale },
	}));
}

/**
 * Cross product of locales × a page's own params, for dynamic pages.
 *
 *   return localePathsFor(AREAS.map((area) => ({ params: { area }, props: { area } })));
 */
export function localePathsFor<
	P extends Record<string, string>,
	X extends Record<string, unknown>,
>(items: ReadonlyArray<{ params: P; props: X }>) {
	return LOCALES.flatMap((locale) =>
		items.map(({ params, props }) => ({
			params: {
				lang: locale === DEFAULT_LOCALE ? undefined : locale,
				...params,
			},
			props: { ...props, locale },
		})),
	);
}

export function resolveLocale(lang?: string | undefined): Locale {
	return isLocale(lang) ? lang : DEFAULT_LOCALE;
}

/**
 * Builds an internal URL. ALWAYS USE THIS — never concatenate by hand.
 *
 *   localizedUrl("/propiedades/venta", "es") -> "/propiedades/venta/"
 *   localizedUrl("/propiedades/venta", "en") -> "/en/propiedades/venta/"
 */
export function localizedUrl(path: string, locale: Locale = DEFAULT_LOCALE): string {
	const clean = `/${String(path).replace(/^\/+|\/+$/g, "")}`;
	const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
	const joined = `${prefix}${clean === "/" ? "" : clean}`;
	return joined === "" ? "/" : `${joined}/`;
}

/** "/en/propiedades/venta/" -> "/propiedades/venta/" (locale-less canonical path). */
export function stripLocale(pathname: string): string {
	const match = pathname.match(/^\/([a-z]{2})(?=\/|$)/);
	return match && isLocale(match[1]) && match[1] !== DEFAULT_LOCALE
		? pathname.slice(match[0].length) || "/"
		: pathname;
}

/** hreflang set for BaseLayout. Grows automatically as locales are added to LOCALES. */
export function alternateUrls(pathname: string, site: URL | string) {
	const base = stripLocale(pathname);
	return LOCALES.map((locale) => ({
		locale,
		href: new URL(localizedUrl(base, locale), site).href,
	}));
}

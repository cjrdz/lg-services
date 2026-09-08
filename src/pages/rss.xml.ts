import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { localizedUrl } from "@/i18n/routing";
import { getEntradas, slugDe } from "@/lib/contenido";
import { areaTitulo } from "@/lib/taxonomia";
import { SITIO } from "@/lib/sitio";
import { useTranslations } from "@/i18n";

export async function GET(context: APIContext) {
	const t = useTranslations(DEFAULT_LOCALE);
	// getEntradas already excludes drafts in production.
	const entradas = await getEntradas(DEFAULT_LOCALE);

	return rss({
		title: `${t("blog.titulo")} — ${SITIO.nombre}`,
		description: t("blog.descripcion"),
		site: context.site ?? "https://lisbethgutierrez.com",
		customData: "<language>es-SV</language>",
		items: entradas.map((e) => ({
			title: e.data.titulo,
			description: e.data.descripcion,
			pubDate: e.data.publicado,
			link: localizedUrl(`/blog/${slugDe(e.id)}`, DEFAULT_LOCALE),
			author: e.data.autor,
			categories: [areaTitulo(e.data.area, DEFAULT_LOCALE), ...e.data.etiquetas],
		})),
	});
}

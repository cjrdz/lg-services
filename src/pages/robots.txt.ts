import type { APIContext } from "astro";

export async function GET(context: APIContext) {
	const site = context.site ?? new URL("https://lisbethgutierrez.com");

	// /keystatic and /estudio are Lisbeth's tools, not public content.
	const cuerpo = `User-agent: *
Allow: /
Disallow: /keystatic
Disallow: /estudio
Disallow: /api/

Sitemap: ${new URL("sitemap-index.xml", site).href}
`;

	return new Response(cuerpo, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}

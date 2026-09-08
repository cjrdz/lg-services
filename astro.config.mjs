// @ts-check
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import svelte from "@astrojs/svelte";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap, { ChangeFreqEnum } from "@astrojs/sitemap";
import keystatic from "@keystatic/astro";
import tailwindcss from "@tailwindcss/vite";

import { noCachearEnDev } from "./src/lib/vite-no-cache-deps.ts";

import { LOCALES, DEFAULT_LOCALE } from "./src/i18n/config.ts";

/*
  The site's domain. Feeds the canonical URL, the sitemap, hreflang, and
  Open Graph images.

  Until there's a custom domain, this needs to be Cloudflare's workers.dev
  URL — otherwise those values point at someone else's domain: search
  engines index it wrong, and sharing over WhatsApp shows no preview image.

  Read from PUBLIC_SITE_URL (wrangler.jsonc) so this never needs editing.
*/
const SITE = process.env.PUBLIC_SITE_URL ?? "https://lisbethgutierrez.com";

/*
  The Cloudflare adapter runs the dev server inside workerd, where Keystatic's
  local mode doesn't work, for two reasons:
    · its handler pulls in `cookie`, which is pure CommonJS (no ESM build),
      and workerd breaks with "exports is not defined";
    · local mode reads and writes via node:fs, which workerd doesn't offer.

  Neither happens in production: there Keystatic uses github mode (which
  never touches disk) and Vite bundles `cookie` to ESM at build time —
  verified against the compiled worker.

  So the adapter only applies when building. In dev, Node's runtime runs and
  the panel works against local files.
*/
const esDev = process.argv.includes("dev");

export default defineConfig({
	site: SITE,
	output: "static",
	adapter: esDev
		? undefined
		: cloudflare({
				// R2 photos never go through astro:assets, so no runtime image
				// service is needed: "compile" keeps sharp build-only, for the
				// handful of images that live in the repo.
				imageService: "compile",
				// Since v14 the adapter uses Cloudflare's Vite plugin, which
				// already detects wrangler.jsonc and exposes locals.runtime.env.
				configPath: "./wrangler.jsonc",
			}),
	/*
	  "ignore", not "always".

	  Keystatic's client calls its routes WITHOUT a trailing slash
	  (/api/keystatic/github/login, /api/keystatic/blob/<oid>/<file>…). With
	  "always" those URLs 404 and the panel breaks in production — including
	  GitHub login, which is how Lisbeth signs in.

	  Canonicalization isn't lost: every internal URL comes from
	  localizedUrl(), which always closes with a slash, and that's what goes
	  into <link rel="canonical"> and the sitemap. Search engines follow that.
	*/
	trailingSlash: "ignore",
	devToolbar: { enabled: false },

	// Astro sessions aren't used (Keystatic manages its own cookies), so this
	// avoids the adapter requiring a "SESSION" KV binding on deploy.
	session: false,

	/*
	  Live URLs from the previous site (lg-blog). Already indexed and
	  shared, so they redirect instead of falling into the 404.

	  The old categories used the DISPLAY TEXT in the URL
	  ("/blog/category/Derecho%20Civil") — exactly the problem solved by
	  storing IDs in content instead.
	*/
	redirects: {
		"/about": "/servicios/",
		"/contact": "/contacto/",

		// Old category indexes -> new areas
		"/blog/category/asesoria": "/blog/asesoria-academica/",
		"/blog/category/Derecho%20Civil": "/blog/derecho-civil-mercantil/",
		"/blog/category/Derecho%20Laboral": "/blog/derecho-laboral/",
		"/blog/category/Derecho%20de%20Familia": "/blog/derecho-familia/",
		"/blog/category/Derecho%20Penal": "/blog/derecho-penal/",
		"/blog/category/Derecho%20Tributario": "/blog/derecho-tributario/",
		"/blog/category/Inmobiliario": "/blog/inmobiliario/",

		/*
		  Old posts -> THEIR AREA'S INDEX, not the new post itself.

		  The 7 migrated posts are all drafts (the original body was the same
		  filler text on all 7), so their pages aren't generated yet — pointing
		  there would send people from a working URL to a 404. The area index
		  does exist and is useful.

		  As Lisbeth publishes each article, the target can be tightened up.
		*/
		"/blog/derecho/civil/demanda-civil": "/blog/derecho-civil-mercantil/",
		"/blog/derecho/laboral/demanda-laboral": "/blog/derecho-laboral/",
		"/blog/derecho/familiar/demanda-familiar": "/blog/derecho-familia/",
		"/blog/derecho/penal/derecho-penal": "/blog/derecho-penal/",
		"/blog/derecho/tributario/derecho-tributario": "/blog/derecho-tributario/",
		"/blog/asesoria/tesis/tesis-nueva": "/blog/asesoria-academica/",
		"/blog/asesoria/tutorias/tutoria-nueva": "/blog/asesoria-academica/",
	},

	// One route tree under src/pages/[...lang]/ serves every locale: the
	// spread segment is optional, so lang: undefined generates "/contacto/"
	// and lang: "en" generates "/en/contacto/" from the SAME file.
	i18n: {
		defaultLocale: DEFAULT_LOCALE,
		locales: [...LOCALES],
		routing: {
			prefixDefaultLocale: false,
			redirectToDefaultLocale: false,
		},
	},

	integrations: [
		svelte(),
		react(),
		mdx(),
		// Unlike jrdz.dev, keystatic() is NOT dev-only: in github mode the
		// panel runs in production too.
		keystatic(),
		sitemap({
			i18n: {
				defaultLocale: DEFAULT_LOCALE,
				locales: Object.fromEntries(LOCALES.map((l) => [l, l])),
			},
			filter: (page) => !page.includes("/keystatic") && !page.includes("/estudio"),
			serialize(item) {
				if (item.url === `${SITE}/`) {
					item.priority = 1.0;
					item.changefreq = ChangeFreqEnum.WEEKLY;
				} else if (/\/(propiedades|vehiculos)\/[^/]+\/[^/]+\/$/.test(item.url)) {
					// Listing pages: price and status change often.
					item.priority = 0.8;
					item.changefreq = ChangeFreqEnum.DAILY;
				} else if (/\/servicios\/[^/]+\/$/.test(item.url)) {
					item.priority = 0.9;
					item.changefreq = ChangeFreqEnum.MONTHLY;
				} else {
					item.priority = 0.6;
					item.changefreq = ChangeFreqEnum.MONTHLY;
				}
				return item;
			},
		}),
	],

	vite: {
		plugins: [tailwindcss(), noCachearEnDev()],
		ssr: {
			/*
			  Keystatic's API handler depends on `cookie`, pure CommonJS
			  (v1.1.1: no "exports" field, no ESM build). Loaded as-is it breaks
			  with "exports is not defined" at cookie/dist/index.js:5, and the
			  panel returns 500 unable to read or save anything.

			  BOTH of these are needed:
			   · noExternal   -> Vite bundles it into the production build.
			   · optimizeDeps -> pre-bundles it to ESM in dev; without this,
			                     noExternal alone isn't enough for a CJS-only package.
			*/
			noExternal: ["cookie", "@keystatic/core", "@keystatic/astro"],
			optimizeDeps: { include: ["cookie"] },
		},
	},
});

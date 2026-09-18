import type { Plugin } from "vite";

/**
 * In dev, stops the browser from caching Vite's pre-bundled dependencies
 * (`/node_modules/.vite/deps/`).
 *
 * THE BUG THIS FIXES (reproduced, not theoretical):
 *
 * Vite serves those bundles as immutable. When it re-optimizes — which
 * happens every time `astro.config.mjs` changes — a browser that already has
 * the page cached ends up mixing old and new bundles. Svelte's runtime
 * splits into two instances, and since hydration state lives at module
 * scope, EVERY island on the page fails at once:
 *
 *   Failed to hydrate: TypeError: Cannot read properties of undefined (reading 'call')
 *   [astro-island] Error hydrating ... node.remove is not a function
 *
 * Exact repro: load the page, touch `astro.config.mjs` to force
 * re-optimization, reload with the SAME cache. It never fails on a cold
 * cache, which is why headless tests (a fresh profile every run) passed
 * clean while the real browser broke.
 *
 * Dev-only, and scoped to that one folder — the rest of the site keeps its
 * cache, so HMR stays fast.
 */
export function noCachearEnDev(): Plugin {
	return {
		name: "lg-no-cachear-en-dev",
		apply: "serve",
		configureServer(servidor) {
			servidor.middlewares.use((req, res, next) => {
				/*
				  The deps folder alone isn't enough: the transformed source module
				  (/src/components/Algo.svelte) is served with an ETag, and its
				  content changes on re-optimization because it embeds the deps'
				  `?v=` hashes. If the browser revalidates and gets a 304, it keeps
				  the stale version, pointing at bundles that aren't this run's.

				  Setting the header here alone isn't enough either: Vite's
				  middleware runs AFTER and overwrites it. That's why `setHeader`
				  gets intercepted below, at the last point before the response goes out.
				*/
				/*
				  Todo `/node_modules/`, no solo `/node_modules/.vite/deps/`.

				  Los bundles pre-optimizados no son los únicos que llevan los
				  `?v=` adentro. El punto de entrada del renderer de Svelte
				  —`/node_modules/@astrojs/svelte/dist/client.svelte.js`, que es
				  lo que carga cada isla— es un módulo servido por Vite con los
				  imports ya reescritos, y ese archivo lo devolvía con:

				      Cache-Control: max-age=31536000,immutable
				      Etag: W/"8bb-..."

				  …teniendo adentro `deps/svelte_internal_client.js?v=17432291`.
				  O sea: el navegador se guardaba UN AÑO un archivo que apunta al
				  hash de esta corrida del optimizador. En cuanto Vite
				  re-optimiza, ese hash deja de existir y la consola se llena de

				      GET .../svelte_internal_client.js?v=<viejo>
				      net::ERR_ABORTED 504 (Outdated Optimize Dep)

				  Es la misma familia de fallo que el 304 de abajo, por una
				  puerta que este plugin no estaba mirando. Comprobado con curl
				  contra el servidor de desarrollo, no deducido.
				*/
				const u = req.url ?? "";
				const esDeVite =
					u.startsWith("/node_modules/") ||
					u.startsWith("/src/") ||
					u.startsWith("/@id/") ||
					u.startsWith("/@fs/") ||
					u.startsWith("/@vite/");

				if (esDeVite) {
					/*
					  Intercepting `setHeader` rather than wrapping `writeHead`: it's
					  exactly where Vite sets its own headers, and types cleanly.
					  Setting them earlier doesn't work — Vite's middleware runs
					  after and overwrites them.
					*/
					const setHeaderOriginal = res.setHeader.bind(res);
					res.setHeader = ((nombre: string, valor: never) => {
						const n = nombre.toLowerCase();
						if (n === "cache-control") {
							return setHeaderOriginal(nombre, "no-store, must-revalidate");
						}
						// No ETag or Last-Modified means no possible 304 — this run's
						// version always gets through.
						if (n === "etag" || n === "last-modified") return res;
						return setHeaderOriginal(nombre, valor);
					}) as typeof res.setHeader;

					res.setHeader("Cache-Control", "no-store, must-revalidate");
				}

				next();
			});
		},
	};
}

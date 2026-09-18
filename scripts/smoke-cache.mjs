/**
 * Regression test for the hot-cache hydration bug.
 *
 * Reproduces the exact sequence that broke the site in a real browser and
 * that regular headless tests did NOT catch, since they open a clean
 * profile every time:
 *
 *   1. load the page                -> ok
 *   2. reload (hot cache)           -> ok
 *   3. force Vite to re-optimize deps and reload  -> USED TO BREAK
 *
 * On re-optimization, the transformed source module changes (it embeds the
 * deps' `?v=` hashes), but its ETag made the browser keep the stale version.
 * Result: two instances of Svelte's runtime, and since hydration state lives
 * at module scope, EVERY island failed.
 *
 * Fixed by the `noCachearEnDev` plugin in src/lib/vite-no-cache-deps.ts.
 *
 *   bun run smoke:cache        (requires the dev server on :4321)
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

const LIBS = join(
	homedir(),
	".local/lib/playwright-deps/root/usr/lib/x86_64-linux-gnu",
);
if (existsSync(LIBS)) process.env.LD_LIBRARY_PATH = LIBS;
const pwPath = execSync(
	'find "$HOME/.local/share/pnpm/store" -name index.mjs -path "*node_modules/playwright/index.mjs" | head -1',
	{ shell: "/bin/bash", encoding: "utf8" },
).trim();
const { chromium } = await import(pwPath);

const PERFIL = "/tmp/perfil-cache-test";
const URL_ = "http://127.0.0.1:4321/propiedades/";

async function visita(etiqueta) {
	// PERSISTENT profile: keeps the HTTP cache across runs, like a real browser.
	const ctx = await chromium.launchPersistentContext(PERFIL, {
		colorScheme: "dark",
		reducedMotion: "reduce",
	});
	const p = ctx.pages()[0] ?? (await ctx.newPage());
	const errs = [];
	p.on("console", (m) => {
		if (m.type() === "error") errs.push(m.text());
	});
	p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
	await p.goto(URL_, { waitUntil: "networkidle" });
	await p.waitForTimeout(1200);
	const sinHidratar = await p.evaluate(
		() =>
			[...document.querySelectorAll("astro-island")].filter((i) =>
				i.hasAttribute("ssr"),
			).length,
	);
	const hidra = errs.filter((e) => /hydrat|reading 'call'/i.test(e));
	const ok = sinHidratar === 0 && hidra.length === 0;
	console.log(
		`${ok ? "✓" : "✗"} ${etiqueta.padEnd(32)} sinHidratar=${sinHidratar} errHidratación=${hidra.length}`,
	);
	hidra
		.slice(0, 2)
		.forEach((e) => console.log("      ·", e.split("\n")[0].slice(0, 120)));
	await ctx.close();
	return ok;
}

const { execSync: exec2 } = await import("node:child_process");

/**
 * Comprobación directa de cabeceras, sin navegador.
 *
 * Los pasos de abajo prueban el SÍNTOMA (las islas no hidratan); esto prueba
 * la CAUSA, que es más barato y más específico: cualquier módulo que Vite
 * sirva con los `?v=` del optimizador adentro tiene que ser incacheable.
 *
 * Existe porque hubo una segunda puerta abierta durante meses. El plugin solo
 * miraba `/node_modules/.vite/deps/`, y el punto de entrada del renderer de
 * Svelte —`/node_modules/@astrojs/svelte/dist/client.svelte.js`, que carga
 * CADA isla— salía con `max-age=31536000,immutable` y un ETag, llevando
 * adentro `deps/svelte_internal_client.js?v=<hash>`. El navegador se lo
 * guardaba un año; en cuanto Vite re-optimizaba, ese hash dejaba de existir:
 *
 *     GET .../svelte_internal_client.js?v=<viejo>
 *     net::ERR_ABORTED 504 (Outdated Optimize Dep)
 *
 * La `renderer-url` se lee del HTML en vez de escribirla acá: lleva un `?v=`
 * que cambia, y una URL a mano se quedaría vieja sin que nadie se entere.
 */
async function revisarCabeceras() {
	const html = await (await fetch(URL_)).text();
	const urls = [
		...new Set(
			[...html.matchAll(/(?:renderer|component)-url="([^"]+)"/g)].map((m) => m[1]),
		),
		"/node_modules/.vite/deps/svelte.js",
	];

	let malas = 0;
	for (const u of urls) {
		const res = await fetch(new URL(u, URL_));
		const cc = res.headers.get("cache-control") ?? "";
		const etag = res.headers.get("etag");
		const bien = cc.includes("no-store") && !etag;
		if (!bien) {
			malas++;
			console.log(
				`      · ${u}\n        cache-control: ${cc || "(ninguno)"}${etag ? ` · etag: ${etag}` : ""}`,
			);
		}
	}

	console.log(
		`${malas === 0 ? "✓" : "✗"} ${"0. cabeceras incacheables".padEnd(32)} módulos revisados=${urls.length} cacheables=${malas}`,
	);
	return malas === 0;
}

let fallos = 0;
const paso = async (etiqueta) => {
	if (!(await visita(etiqueta))) fallos++;
};

if (!(await revisarCabeceras())) fallos++;

await paso("1. caché fría");
await paso("2. caché caliente");

console.log("   forzando re-optimización de dependencias…");
exec2("touch astro.config.mjs");
await new Promise((r) => setTimeout(r, 15_000));

await paso("3. tras re-optimizar  <- acá rompía");

console.log(
	fallos === 0 ? "\nTodo en orden." : `\n${fallos} paso(s) con fallos de hidratación.`,
);
process.exit(fallos === 0 ? 0 : 1);

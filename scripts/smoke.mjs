/**
 * Smoke test in a real browser: loads pages and verifies the Svelte islands
 * hydrate without errors.
 *
 * Exists because a hydration bug once didn't show up in the HTML at all —
 * the server returned everything fine and the error only appeared in the
 * browser console. Checking HTML with curl can't catch that.
 *
 *   bun run smoke                      # against the dev server (4321)
 *   bun run smoke http://localhost:8787
 *
 * System libraries: Chromium needs libnspr4/libnss3/libasound2, which this
 * WSL doesn't ship. Instead of requiring root, `bun run browser:deps`
 * downloads them as .deb and extracts them into ~/.local/lib/playwright-deps;
 * hooked in here via LD_LIBRARY_PATH. No sudo, no touching the system.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/* Must be set BEFORE Playwright launches the browser. */
const LIBS = join(
	homedir(),
	".local/lib/playwright-deps/root/usr/lib/x86_64-linux-gnu",
);
if (existsSync(LIBS)) {
	process.env.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH
		? `${LIBS}:${process.env.LD_LIBRARY_PATH}`
		: LIBS;
}

const base = process.argv[2] ?? "http://127.0.0.1:4321";
const MODO = process.env.SMOKE_SCHEME ?? "dark";
const MOVIMIENTO = process.env.SMOKE_MOTION ?? "reduce";

const RUTAS = [
	"/",
	"/servicios/",
	"/servicios/derecho-laboral/",
	"/propiedades/",
	"/vehiculos/",
	"/blog/",
	"/contacto/",
	"/estudio",
];

/** Playwright can be installed locally or globally (pnpm). */
async function cargarChromium() {
	const candidatos = ["playwright", "playwright-core"];
	for (const nombre of candidatos) {
		try {
			return (await import(nombre)).chromium;
		} catch {
			/* keep trying */
		}
	}
	try {
		const { execSync } = await import("node:child_process");
		const ruta = execSync(
			'find "$HOME/.local/share/pnpm/store" -name index.mjs -path "*node_modules/playwright/index.mjs" 2>/dev/null | head -1',
			{ shell: "/bin/bash", encoding: "utf8" },
		).trim();
		if (ruta) return (await import(ruta)).chromium;
	} catch {
		/* nothing found */
	}
	throw new Error(
		"No encontré Playwright. Instalalo con: bun add -d playwright\n" +
			"y las dependencias del sistema con: sudo npx playwright install-deps chromium",
	);
}

const chromium = await cargarChromium();

let navegador;
try {
	navegador = await chromium.launch();
} catch (e) {
	console.error("No pude abrir el navegador.\n");
	console.error(String(e).split("\n").slice(0, 6).join("\n"));
	console.error("\nProbablemente falten las librerías del sistema. Sin sudo:");
	console.error("  bun run browser:deps");
	process.exit(2);
}

/*
  Warmup request before measuring. In `astro dev`, the first load after
  startup can land while Vite is still optimizing dependencies, giving a
  failure that doesn't reflect the real state.
*/
try {
	const p = await navegador.newPage();
	await p.goto(base + "/", { waitUntil: "networkidle", timeout: 30_000 });
	await p.close();
} catch {
	// If even the warmup fails to load, the routes below will report it.
}

let fallos = 0;

for (const ruta of RUTAS) {
	/*
	  Emulates the user's REAL environment, not headless's factory default:

	  · colorScheme dark — theme-init.js sets .dark on <html> BEFORE hydrating,
	    so the client wants to paint the moon while the server drew the sun.
	    That mismatch doesn't exist in light theme, headless's default —
	    which is why this test passed while the real browser failed.
	  · reducedMotion reduce — the user has it on, and it changes the code
	    path morphicons takes.
	*/
	const pagina = await navegador.newPage({
		colorScheme: MODO,
		reducedMotion: MOVIMIENTO,
	});
	const errores = [];
	pagina.on("console", (m) => {
		if (m.type() === "error") errores.push(m.text());
	});
	pagina.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
	// Which resource failed, not just "something failed".
	pagina.on("requestfailed", (r) => errores.push(`request falló: ${r.url()}`));
	pagina.on("response", (r) => {
		if (r.status() >= 400) errores.push(`HTTP ${r.status()} ${r.url()}`);
	});

	const url = base + ruta;
	try {
		await pagina.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
	} catch (e) {
		console.log(`✗ ${ruta}  no cargó: ${String(e).split("\n")[0]}`);
		fallos++;
		await pagina.close();
		continue;
	}
	await pagina.waitForTimeout(900);

	// An island that hydrated fine no longer exposes the ssr attribute.
	const islas = await pagina.evaluate(() =>
		[...document.querySelectorAll("astro-island")].map((i) => ({
			comp: (i.getAttribute("component-url") ?? "").split("/").pop(),
			sinHidratar: i.hasAttribute("ssr"),
		})),
	);

	const rotas = islas.filter((i) => i.sinHidratar);
	/*
	  Invisible content. Entrance animations use opacity, so a bug in
	  @starting-style or the prefers-reduced-motion block would leave the
	  page blank without throwing a single console error — it would look
	  broken while every other check passed.
	*/
	const invisibles = await pagina.evaluate(() => {
		const oculto = (el) => {
			const e = getComputedStyle(el);
			return e.opacity === "0" || e.visibility === "hidden" || e.display === "none";
		};

		const sospechosos = [...document.querySelectorAll("main .aparece, main h1")];

		/*
		  Scroll reveals (.revelar) are legitimately transparent while they're
		  still below the fold — that's the whole point — so only the ones
		  already inside the viewport count. If `animation-timeline: view()`
		  ever regressed, or the reduced-motion override stopped applying,
		  this is what would catch it: no console error, just a blank page.
		*/
		const enPantalla = [
			...document.querySelectorAll("main .revelar, main .revelar-grupo > *"),
		].filter((el) => {
			const r = el.getBoundingClientRect();
			return r.bottom > 0 && r.top < window.innerHeight && r.height > 0;
		});

		return [...sospechosos, ...enPantalla].filter(oculto).length;
	});

	// An <img src=""> makes the browser re-request the page itself.
	const srcVacios = await pagina.evaluate(
		() =>
			[...document.querySelectorAll("img")].filter((i) => !i.getAttribute("src"))
				.length,
	);

	/*
	  Noise that gets filtered out, with a reason each:

	  · /api/keystatic/github/* — in dev, Keystatic runs in LOCAL mode, so its
	    OAuth routes don't exist and /estudio gets a 404 while silently trying
	    to refresh the session. The code handles that (shows the sign-in
	    screen). In production, github mode, the route does exist.

	  · "Failed to load resource" — the generic message the browser emits
	    ALONGSIDE the concrete failure. We already log `HTTP <code> <url>`
	    above, which says exactly what failed, so this would only duplicate it.
	*/
	const DESCARTABLE = [/\/api\/keystatic\/github\//, /^Failed to load resource/];
	const ruido = errores.filter((e) => !DESCARTABLE.some((r) => r.test(e)));

	const ok =
		ruido.length === 0 && rotas.length === 0 && srcVacios === 0 && invisibles === 0;
	if (!ok) fallos++;

	const omitidos = errores.length - ruido.length;
	console.log(
		`${ok ? "✓" : "✗"} ${ruta.padEnd(30)} islas=${islas.length} sinHidratar=${rotas.length} src-vacio=${srcVacios} invisible=${invisibles} errores=${ruido.length}` +
			(omitidos > 0 ? `  (${omitidos} esperado/s en dev)` : ""),
	);
	for (const e of ruido.slice(0, 3)) {
		console.log(`      · ${e.split("\n")[0].slice(0, 150)}`);
	}
	for (const r of rotas) console.log(`      · no hidrató: ${r.comp}`);

	await pagina.close();
}

await navegador.close();
console.log(`\n(esquema=${MODO} movimiento=${MOVIMIENTO})`);
console.log(fallos === 0 ? "Todo en orden." : `\n${fallos} ruta(s) con problemas.`);
process.exit(fallos === 0 ? 0 : 1);

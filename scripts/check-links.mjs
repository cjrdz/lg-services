/**
 * Finds broken internal links in the already-built site.
 *
 * Born from two real cases: the menu pointed at /vehiculos/ (a section that
 * didn't exist yet) and the footer at /aviso-privacidad/ and /terminos/.
 * None of the three errored at build — Astro builds happily — and the 404
 * only showed up by clicking through. A dead footer link shows up on EVERY page.
 *
 *   bun run lint:links      (runs as part of `bun run verify`)
 */
import { readFileSync, statSync } from "node:fs";
import { globSync } from "node:fs";
import { relative, resolve } from "node:path";

/**
 * ON-DEMAND routes: they leave no file in dist/client, so they have to be
 * recognized separately or the check would flag them as broken.
 *
 * Derived from the code instead of a hand-kept list: finds every
 * `export const prerender = false` in src/pages and turns that file's path
 * into its URL pattern. So if another page goes on-demand tomorrow, this
 * picks it up automatically.
 */
function rutasBajoDemanda() {
	const patrones = [];
	for (const archivo of globSync("**/*.{astro,ts}", { cwd: "src/pages" })) {
		const abs = resolve("src/pages", archivo);
		if (!readFileSync(abs, "utf8").includes("export const prerender = false")) continue;

		let ruta = "/" + archivo.split("\\").join("/");
		ruta = ruta.replace(/\.(astro|ts)$/, "").replace(/\/index$/, "");
		// [...lang] is optional: /contacto and /en/contacto come from the same file.
		ruta = ruta.replace(/\/\[\.\.\.lang\]/, "");
		// Any other param becomes a wildcard.
		const regex = new RegExp(
			"^" +
				ruta.replace(/\[\.\.\.[^\]]+\]/g, ".*").replace(/\[[^\]]+\]/g, "[^/]+") +
				"/?$",
		);
		patrones.push(regex);
	}
	return patrones;
}

const RAIZ = resolve("dist/client");

let paginas;
try {
	paginas = globSync("**/*.html", { cwd: RAIZ }).map((f) => resolve(RAIZ, f));
} catch {
	console.error("No encuentro dist/client. Corré `bun run build` primero.");
	process.exit(2);
}

/** Everything the site can serve, in every form it could be linked. */
const servibles = new Set();
for (const f of globSync("**/*", { cwd: RAIZ })) {
	const abs = resolve(RAIZ, f);
	if (!statSync(abs).isFile()) continue;
	const ruta = "/" + relative(RAIZ, abs).split("\\").join("/");
	servibles.add(ruta);
	if (ruta.endsWith("/index.html")) {
		servibles.add(ruta.slice(0, -"index.html".length)); // /blog/
		servibles.add(ruta.slice(0, -"/index.html".length) || "/"); // /blog
	}
}

const DINAMICAS = rutasBajoDemanda();

const rotos = new Map();
for (const abs of paginas) {
	const html = readFileSync(abs, "utf8");
	const origen = "/" + relative(RAIZ, abs).split("\\").join("/");
	for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
		const href = m[1];
		if (href.startsWith("/_astro/")) continue; // hashed, always exist
		const variantes = [
			href,
			href.replace(/\/$/, "") + "/",
			href + "index.html",
			href.replace(/\/$/, "") + "/index.html",
		];
		const esDinamica = DINAMICAS.some((re) => re.test(href.replace(/\/$/, "") || "/"));
		if (!esDinamica && !variantes.some((v) => servibles.has(v))) {
			if (!rotos.has(href)) rotos.set(href, new Set());
			rotos.get(href).add(origen);
		}
	}
}

if (rotos.size === 0) {
	console.log(`✓ Sin enlaces internos rotos (${paginas.length} páginas)`);
	process.exit(0);
}

console.error(`✗ ${rotos.size} enlace(s) interno(s) roto(s):\n`);
for (const [href, origen] of [...rotos].sort()) {
	const lista = [...origen].sort();
	console.error(`  ${href}`);
	console.error(`    en ${lista.length} página(s), p. ej. ${lista[0]}`);
}
console.error(
	"\n  Si la sección todavía no existe, apagala en src/data/sitio/index.json\n" +
		"  (modulos) o quitá el enlace, en vez de dejarlo apuntando a un 404.",
);
process.exit(1);

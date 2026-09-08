/**
 * Bans literal Tailwind color utilities outside src/styles/global.css.
 *
 * Why: in lg-blog, `bg-blue-100 text-blue-600` and `text-black` ended up
 * baked to one theme and turned unreadable once dark mode switched on.
 * Every color must go through a semantic token (bg-background, text-muted-foreground…).
 *
 *   bun run lint:colors
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

const EXTS = [".astro", ".svelte", ".ts", ".tsx", ".css", ".mdx"];
const SKIP_DIRS = new Set(["ui", "node_modules"]); // components/ui = shadcn, don't touch
const SKIP_FILES = new Set([join(SRC, "styles", "global.css")]);

const SCALES =
	"slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PROPS =
	"bg|text|border|ring|from|via|to|fill|stroke|decoration|outline|shadow|accent|caret|divide|placeholder";

const PATTERNS = [
	new RegExp(`\\b(?:${PROPS})-(?:${SCALES})-\\d{2,3}\\b`, "g"),
	/\b(?:bg|text|border|fill|stroke)-(?:black|white)\b/g,
	/#[0-9a-fA-F]{3,8}\b/g,
];

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) {
			if (!SKIP_DIRS.has(name)) walk(full, out);
		} else if (EXTS.some((e) => name.endsWith(e)) && !SKIP_FILES.has(full)) {
			out.push(full);
		}
	}
	return out;
}

let failures = 0;
for (const file of walk(SRC)) {
	const lines = readFileSync(file, "utf8").split("\n");
	lines.forEach((line, i) => {
		if (line.includes("color-literals-ok")) return;
		for (const re of PATTERNS) {
			re.lastIndex = 0;
			const hits = line.match(re);
			if (hits) {
				console.error(
					`${relative(ROOT, file)}:${i + 1}  color literal: ${[...new Set(hits)].join(", ")}`,
				);
				failures += hits.length;
			}
		}
	});
}

if (failures) {
	console.error(
		`\n✗ ${failures} color literal(s) fuera de global.css.\n` +
			`  Usá tokens semánticos (bg-background, text-muted-foreground, border-border…).\n` +
			`  Si un caso es legítimo, agregá el comentario "color-literals-ok" en esa línea.`,
	);
	process.exit(1);
}
console.log("✓ Sin colores literales fuera de global.css");

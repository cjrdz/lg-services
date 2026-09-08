/**
 * Finds photos in R2 that no longer any listing references.
 *
 * Git and R2 aren't transactional: deleting a property from the panel
 * leaves its photos in the bucket. Not preventable, so it's detected instead.
 *
 * DELETES NOTHING BY DEFAULT. Prints a report. `--aplicar` moves the orphans
 * to `trash/<date>/`, where R2's lifecycle rule expires them after 30 days —
 * so even "apply" stays reversible for a month.
 *
 *   bun run media:gc              # report
 *   bun run media:gc --aplicar    # move to trash
 *
 * Needs R2 S3 credentials in .env (see .env.example). Uses the S3 API rather
 * than the binding because it runs outside the worker, same as jrdz.dev's
 * upload script.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const APLICAR = process.argv.includes("--aplicar");
const DIAS_GRACIA = 30;

/* --- .env with no dependencies --- */
function cargarEnv() {
	if (!existsSync(".env")) return;
	for (const linea of readFileSync(".env", "utf8").split("\n")) {
		const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
		// Doesn't override what's already set in the environment.
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
	}
}
cargarEnv();

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } =
	process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
	console.error(
		"Faltan credenciales de R2 en .env:\n" +
			"  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME\n" +
			"Se sacan del panel de Cloudflare: R2 → Manage API Tokens.",
	);
	process.exit(2);
}

/* --- 1. Which stems the content references --- */
function archivosDeContenido(dir, acc = []) {
	if (!existsSync(dir)) return acc;
	for (const nombre of readdirSync(dir)) {
		const ruta = join(dir, nombre);
		if (statSync(ruta).isDirectory()) archivosDeContenido(ruta, acc);
		else if ([".json", ".mdx", ".md"].includes(extname(ruta))) acc.push(ruta);
	}
	return acc;
}

const RE_TALLO = /media\/(?:propiedades|vehiculos|bufete)\/[a-z0-9-]+\/[a-z0-9]{8}/g;

const referenciados = new Set();
for (const archivo of archivosDeContenido("src/content")) {
	const texto = readFileSync(archivo, "utf8");
	for (const m of texto.matchAll(RE_TALLO)) referenciados.add(m[0]);
}

/* --- 2. What's in the bucket --- */
const { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectsCommand } =
	await import("@aws-sdk/client-s3");

const s3 = new S3Client({
	region: "auto",
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
});

/** stem -> { keys, lastModified } */
const enBucket = new Map();
let cursor;
do {
	const res = await s3.send(
		new ListObjectsV2Command({
			Bucket: R2_BUCKET_NAME,
			Prefix: "media/",
			ContinuationToken: cursor,
		}),
	);
	for (const obj of res.Contents ?? []) {
		// media/<vertical>/<listing>/<photoId>/<width>.webp -> strip the width
		const tallo = obj.Key.split("/").slice(0, 4).join("/");
		const actual = enBucket.get(tallo) ?? { claves: [], ultima: new Date(0) };
		actual.claves.push(obj.Key);
		if (obj.LastModified && obj.LastModified > actual.ultima) {
			actual.ultima = obj.LastModified;
		}
		enBucket.set(tallo, actual);
	}
	cursor = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (cursor);

/* --- 3. Compare --- */
const limite = Date.now() - DIAS_GRACIA * 24 * 60 * 60 * 1000;
const huerfanos = [];
for (const [tallo, info] of enBucket) {
	if (referenciados.has(tallo)) continue;
	// A grace period is honored: a freshly-uploaded photo may still be
	// waiting for its path to get pasted into the panel.
	if (info.ultima.getTime() > limite) continue;
	huerfanos.push({ tallo, ...info });
}

console.log(`Referenciadas en el contenido : ${referenciados.size}`);
console.log(`Tallos en el bucket           : ${enBucket.size}`);
console.log(`Huérfanas (>${DIAS_GRACIA} días)          : ${huerfanos.length}`);

if (huerfanos.length === 0) {
	console.log("\nNada que limpiar.");
	process.exit(0);
}

console.log("");
for (const h of huerfanos) {
	console.log(
		`  ${h.tallo}  (${h.claves.length} archivos, ${h.ultima.toISOString().slice(0, 10)})`,
	);
}

if (!APLICAR) {
	console.log(
		`\nInforme solamente. Para moverlas a la papelera:\n` +
			`  bun run media:gc --aplicar\n` +
			`Van a trash/<fecha>/ y la regla de ciclo de vida las expira a los 30 días.`,
	);
	process.exit(0);
}

/* --- 4. Apply: copy to trash and delete --- */
const hoy = new Date().toISOString().slice(0, 10);
let movidas = 0;

for (const h of huerfanos) {
	for (const clave of h.claves) {
		await s3.send(
			new CopyObjectCommand({
				Bucket: R2_BUCKET_NAME,
				CopySource: `${R2_BUCKET_NAME}/${clave}`,
				Key: `trash/${hoy}/${clave}`,
			}),
		);
	}
	await s3.send(
		new DeleteObjectsCommand({
			Bucket: R2_BUCKET_NAME,
			Delete: { Objects: h.claves.map((Key) => ({ Key })) },
		}),
	);
	movidas += h.claves.length;
}

console.log(`\n${movidas} archivo(s) movidos a trash/${hoy}/.`);

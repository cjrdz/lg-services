import type { APIRoute } from "astro";
import { getBucketMedia } from "@/lib/media/bucket";
import {
	claveIndiceSha,
	construirClave,
	construirTallo,
	esFotoId,
	esSlug,
	esVertical,
	type Vertical,
} from "@/lib/media/keys";

export const prerender = false;

/** Each derivative on its own. A 2400px WebP runs about 300-500 KB. */
const MAX_PARTE = 3 * 1024 * 1024;
/** All of one photo's derivatives together. */
const MAX_TOTAL = 12 * 1024 * 1024;
const INMUTABLE = "public, max-age=31536000, immutable";

/**
 * Receives ONE photo with all its derivatives in a single request.
 *
 * Being atomic per photo is deliberate: either all five widths land or none
 * do. A listing never ends up with the 960 version but not the 480 — which
 * is what a gallery looks like mid-upload over a connection that dropped.
 *
 * And it's idempotent: the browser generates the fotoId BEFORE uploading, so
 * a retry rewrites the same keys instead of duplicating.
 */
export const POST: APIRoute = async (ctx) => {
	const editora = ctx.locals.editor;
	if (!editora) return Response.json({ error: "sin_sesion" }, { status: 401 });

	const { bucket, motivo } = await getBucketMedia();
	if (!bucket) {
		return Response.json({ error: "sin_bucket", detalle: motivo }, { status: 500 });
	}

	let form: FormData;
	try {
		form = await ctx.request.formData();
	} catch {
		return Response.json({ error: "cuerpo_invalido" }, { status: 400 });
	}

	const vertical = String(form.get("vertical") ?? "");
	const anuncio = String(form.get("anuncio") ?? "");
	const fotoId = String(form.get("fotoId") ?? "");
	const nombreOriginal = String(form.get("nombreOriginal") ?? "");
	const sha256 = String(form.get("sha256") ?? "");

	if (!esVertical(vertical) || !esSlug(anuncio) || !esFotoId(fotoId)) {
		return Response.json(
			{ error: "destino_invalido", vertical, anuncio, fotoId },
			{ status: 400 },
		);
	}

	const tallo = construirTallo(vertical as Vertical, anuncio, fotoId);

	// Dedupe: if this exact photo was already uploaded, reuse it instead of
	// spending mobile data uploading it again.
	if (sha256) {
		const marca = await bucket.head(claveIndiceSha(sha256));
		const talloPrevio = marca?.customMetadata?.tallo;
		if (talloPrevio) {
			return Response.json({ tallo: talloPrevio, duplicada: true });
		}
	}

	const partes = form.getAll("derivada") as File[];
	if (partes.length === 0) {
		return Response.json({ error: "sin_derivadas" }, { status: 400 });
	}

	// Everything is validated before writing anything, to never leave the
	// photo half-uploaded.
	const anchos: number[] = [];
	let total = 0;
	for (const parte of partes) {
		const ancho = Number(String(parte.name).replace(/\D+/g, ""));
		if (!Number.isInteger(ancho) || ancho < 1 || ancho > 4000) {
			return Response.json({ error: "derivada_invalida" }, { status: 400 });
		}
		total += parte.size;
		if (parte.size > MAX_PARTE || total > MAX_TOTAL) {
			return Response.json({ error: "demasiado_grande" }, { status: 413 });
		}
		anchos.push(ancho);
	}

	const metadatos = {
		vertical,
		anuncio,
		fotoId,
		nombreOriginal: nombreOriginal.slice(0, 120),
		subidoPor: editora.login,
		subidoEn: new Date().toISOString(),
		w: String(form.get("w") ?? ""),
		h: String(form.get("h") ?? ""),
	};

	await Promise.all(
		partes.map((parte, i) =>
			bucket.put(construirClave(tallo, anchos[i]), parte.stream(), {
				httpMetadata: {
					contentType: "image/webp",
					cacheControl: INMUTABLE,
				},
				customMetadata: { ...metadatos, ancho: String(anchos[i]) },
			}),
		),
	);

	if (sha256) {
		await bucket.put(claveIndiceSha(sha256), new Uint8Array(0), {
			customMetadata: { tallo },
		});
	}

	return Response.json({
		tallo,
		anchos: [...anchos].sort((a, b) => a - b),
		duplicada: false,
	});
};

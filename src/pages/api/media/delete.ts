import type { APIRoute } from "astro";
import { getBucketMedia } from "@/lib/media/bucket";
import { claveBasura, esTallo } from "@/lib/media/keys";

export const prerender = false;

/**
 * SOFT deletes a photo.
 *
 * Nothing is really deleted: it's copied to trash/<date>/ and only then are
 * the originals removed. With an R2 lifecycle rule expiring `trash/` after
 * 30 days, "I deleted the wrong one" goes from permanent to recoverable for
 * a month. The cost of keeping those copies around briefly is negligible
 * next to losing a listing's photos.
 */
export const POST: APIRoute = async (ctx) => {
	const editora = ctx.locals.editor;
	if (!editora) return Response.json({ error: "sin_sesion" }, { status: 401 });

	const { bucket, motivo } = await getBucketMedia();
	if (!bucket)
		return Response.json({ error: "sin_bucket", detalle: motivo }, { status: 500 });

	let cuerpo: { tallo?: string };
	try {
		cuerpo = (await ctx.request.json()) as { tallo?: string };
	} catch {
		return Response.json({ error: "cuerpo_invalido" }, { status: 400 });
	}

	const tallo = cuerpo.tallo ?? "";
	if (!esTallo(tallo)) {
		return Response.json({ error: "tallo_invalido", tallo }, { status: 400 });
	}

	const listado = await bucket.list({ prefix: `${tallo}/` });
	if (listado.objects.length === 0) {
		return Response.json({ error: "no_encontrada", tallo }, { status: 404 });
	}

	const ahora = new Date().toISOString();

	// Copy to trash first; only delete once everything has copied.
	for (const obj of listado.objects) {
		const original = await bucket.get(obj.key);
		if (!original) continue;
		await bucket.put(claveBasura(obj.key), original.body, {
			httpMetadata: original.httpMetadata,
			customMetadata: {
				...obj.customMetadata,
				borradoPor: editora.login,
				borradoEn: ahora,
			},
		});
	}

	await bucket.delete(listado.objects.map((o) => o.key));

	return Response.json({ tallo, borradas: listado.objects.length });
};

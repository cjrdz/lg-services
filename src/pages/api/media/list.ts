import type { APIRoute } from "astro";
import { getBucketMedia } from "@/lib/media/bucket";
import { esSlug, esVertical } from "@/lib/media/keys";

export const prerender = false;

/**
 * Lists what's in the bucket.
 *
 * With `delimiter: "/"`, R2 does the grouping: it returns each photo's stem
 * directly in `delimitedPrefixes`, without fetching all five keys per photo
 * to dedupe here. One Class A operation per page, no database to maintain.
 *
 *   no `anuncio`   -> lists the listings with photos in that vertical
 *   with `anuncio` -> lists that listing's photo stems
 */
export const GET: APIRoute = async (ctx) => {
	const { bucket, motivo } = await getBucketMedia();
	if (!bucket) {
		return Response.json({ error: "sin_bucket", detalle: motivo }, { status: 500 });
	}

	const params = ctx.url.searchParams;
	const vertical = params.get("vertical") ?? "";
	const anuncio = params.get("anuncio") ?? "";
	const cursor = params.get("cursor") ?? undefined;

	if (!esVertical(vertical)) {
		return Response.json({ error: "vertical_invalida" }, { status: 400 });
	}
	if (anuncio && !esSlug(anuncio)) {
		return Response.json({ error: "anuncio_invalido" }, { status: 400 });
	}

	const prefix = anuncio ? `media/${vertical}/${anuncio}/` : `media/${vertical}/`;

	const res = await bucket.list({
		prefix,
		delimiter: "/",
		limit: 500,
		cursor,
	});

	// "media/propiedades/casa-x/k7x2f9a1/" -> "media/propiedades/casa-x/k7x2f9a1"
	const items = (res.delimitedPrefixes ?? []).map((p) => p.replace(/\/$/, ""));

	return Response.json({
		items,
		cursor: res.truncated ? res.cursor : null,
	});
};

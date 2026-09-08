import { defineMiddleware } from "astro:middleware";
import { getEditora, mismoOrigen } from "./lib/server/auth";

/**
 * Guards /estudio and /api/media/*.
 *
 * /estudio does NOT redirect to login: the sign-in screen renders right on
 * the page. That's a real Keystatic limitation — its OAuth only accepts
 * returning to routes starting with "branch/", so there's no asking for
 * "take me back to /estudio". The component opens login in a separate
 * window and waits for the cookie to show up.
 */
const PROTEGIDO = /^\/(estudio|api\/media)(\/|$)/;

export const onRequest = defineMiddleware(async (ctx, next) => {
	const ruta = new URL(ctx.request.url).pathname;
	if (!PROTEGIDO.test(ruta)) return next();

	const editora = await getEditora(ctx);

	if (ruta.startsWith("/api/media")) {
		if (ctx.request.method !== "GET" && !mismoOrigen(ctx)) {
			return new Response("Origen no permitido", { status: 403 });
		}
		if (!editora) {
			return Response.json({ error: "sin_sesion" }, { status: 401 });
		}
	}

	ctx.locals.editor = editora ?? undefined;
	return next();
});

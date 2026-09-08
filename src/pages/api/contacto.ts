import type { APIRoute } from "astro";
import { z } from "astro:schema";
import { CONTACTO } from "@/lib/sitio";
import { enviarConsulta, verificarTurnstile } from "@/lib/server/correo";

export const prerender = false;

/**
 * Receives the contact form.
 *
 * Accepts `multipart/form-data` on purpose: the same endpoint serves both
 * the browser's native submit (no JavaScript) and the island's `fetch`. In
 * lg-blog the form was a mockup — the button was a `<label>` opening a
 * success modal without sending anything — and a legal inquiry vanished silently.
 *
 * Defenses, in order of cost:
 *  1. honeypot    — free, zero config, stops dumb bots
 *  2. Turnstile   — if a key is configured; see SETUP-DESPLIEGUE.md
 *  3. validation  — zod, with Spanish messages
 */

const MOTIVOS = CONTACTO.motivosContacto.map((m) => m.id) as [string, ...string[]];

const esquema = z.object({
	nombre: z.string().trim().min(3, "Escribí tu nombre completo.").max(120),
	correo: z.email("Ingresá un correo válido."),
	telefono: z.string().trim().max(40).optional(),
	motivo: z.enum(MOTIVOS),
	mensaje: z
		.string()
		.trim()
		.min(20, "Contanos un poco más (mínimo 20 caracteres).")
		.max(4000),
	privacidad: z.literal("on", { message: "Tenés que aceptar el aviso de privacidad." }),
});

/** Does the browser expect JSON (island) or a page (native submit)? */
function quiereJson(req: Request): boolean {
	return (req.headers.get("accept") ?? "").includes("application/json");
}

function responder(
	req: Request,
	estado: "ok" | "error",
	mensaje: string,
	status: number,
	errores?: Record<string, string>,
): Response {
	if (quiereJson(req)) {
		return Response.json({ estado, mensaje, errores }, { status });
	}
	/*
	  Without JavaScript, redirects back to /contacto with the result in the
	  URL. A POST-redirect-GET: reloading never resubmits the form.
	*/
	const params = new URLSearchParams({ envio: estado });
	if (estado === "error") params.set("motivo", mensaje);
	return new Response(null, {
		status: 303,
		headers: { Location: `/contacto/?${params.toString()}` },
	});
}

export const POST: APIRoute = async (ctx) => {
	const req = ctx.request;

	let form: FormData;
	try {
		form = await req.formData();
	} catch {
		return responder(req, "error", "No pudimos leer el formulario.", 400);
	}

	// Honeypot: a hidden field a real person never fills in. Responds "ok" on
	// purpose, so the bot never gets a signal it was caught.
	if (String(form.get("empresa") ?? "").trim() !== "") {
		return responder(req, "ok", "Recibimos tu consulta.", 200);
	}

	const datos = Object.fromEntries(form.entries());
	const res = esquema.safeParse(datos);
	if (!res.success) {
		const errores: Record<string, string> = {};
		for (const issue of res.error.issues) {
			const campo = String(issue.path[0] ?? "");
			if (campo && !errores[campo]) errores[campo] = issue.message;
		}
		return responder(req, "error", "Revisá los datos del formulario.", 400, errores);
	}

	const ip = req.headers.get("cf-connecting-ip");
	const secretoTurnstile = import.meta.env.TURNSTILE_SECRET_KEY as string | undefined;
	const token = form.get("cf-turnstile-response");
	const humano = await verificarTurnstile(
		typeof token === "string" ? token : null,
		secretoTurnstile,
		ip,
	);
	if (!humano) {
		return responder(req, "error", "No pudimos verificar que seas una persona.", 403);
	}

	const etiquetaMotivo =
		CONTACTO.motivosContacto.find((m) => m.id === res.data.motivo)?.etiqueta ??
		res.data.motivo;

	const envio = await enviarConsulta(
		{
			nombre: res.data.nombre,
			correo: res.data.correo,
			telefono: res.data.telefono,
			motivo: res.data.motivo,
			mensaje: res.data.mensaje,
		},
		etiquetaMotivo,
		CONTACTO.correo,
		import.meta.env.RESEND_API_KEY as string | undefined,
	);

	if (!envio.ok) {
		// 503, not 500: the problem is configuration or the provider, not
		// anything the person wrote. The UI directs them to WhatsApp.
		return responder(
			req,
			"error",
			envio.motivo === "sin_configurar"
				? "El correo todavía no está configurado."
				: "No pudimos enviar tu mensaje.",
			503,
		);
	}

	return responder(req, "ok", "Recibimos tu consulta.", 200);
};

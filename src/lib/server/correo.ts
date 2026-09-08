/**
 * Sends the contact-form email.
 *
 * Isolated from the endpoint so switching providers means touching only this
 * file. Uses Resend today, which works without a custom domain: it allows
 * sending from `onboarding@resend.dev` while no domain is verified yet.
 *
 * Careful with that test address: Resend only lets it send to the account's
 * own email. Good for verifying the circuit works, not for production.
 * Once there's a domain: verify it in Resend and change REMITENTE.
 */

export interface Consulta {
	nombre: string;
	correo: string;
	telefono?: string;
	motivo: string;
	mensaje: string;
}

export type ResultadoEnvio =
	| { ok: true }
	| { ok: false; motivo: "sin_configurar" | "fallo_proveedor"; detalle?: string };

const REMITENTE = "Sitio web <onboarding@resend.dev>";

function textoPlano(c: Consulta, motivoEtiqueta: string): string {
	return [
		`Nombre:   ${c.nombre}`,
		`Correo:   ${c.correo}`,
		c.telefono ? `Teléfono: ${c.telefono}` : null,
		`Motivo:   ${motivoEtiqueta}`,
		"",
		c.mensaje,
	]
		.filter((l) => l !== null)
		.join("\n");
}

export async function enviarConsulta(
	consulta: Consulta,
	motivoEtiqueta: string,
	destino: string,
	apiKey: string | undefined,
): Promise<ResultadoEnvio> {
	if (!apiKey) {
		return { ok: false, motivo: "sin_configurar" };
	}

	try {
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: REMITENTE,
				to: [destino],
				// Replying to the email goes straight to the person who asked, not
				// the technical sender — that's what makes the inbox usable.
				reply_to: consulta.correo,
				subject: `${motivoEtiqueta} — ${consulta.nombre}`,
				text: textoPlano(consulta, motivoEtiqueta),
			}),
		});

		if (!res.ok) {
			const detalle = await res.text().catch(() => "");
			return { ok: false, motivo: "fallo_proveedor", detalle: detalle.slice(0, 200) };
		}
		return { ok: true };
	} catch (e) {
		return {
			ok: false,
			motivo: "fallo_proveedor",
			detalle: (e as Error).message.slice(0, 200),
		};
	}
}

/**
 * Verifies the Cloudflare Turnstile token.
 *
 * Returns `true` if no key is configured: the form keeps working with the
 * honeypot as its only defense. A deliberate choice to not block launch —
 * see SETUP-DESPLIEGUE.md.
 */
export async function verificarTurnstile(
	token: string | null,
	secreto: string | undefined,
	ip: string | null,
): Promise<boolean> {
	if (!secreto) return true;
	if (!token) return false;

	try {
		const cuerpo = new FormData();
		cuerpo.set("secret", secreto);
		cuerpo.set("response", token);
		if (ip) cuerpo.set("remoteip", ip);

		const res = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{ method: "POST", body: cuerpo },
		);
		const datos = (await res.json()) as { success?: boolean };
		return datos.success === true;
	} catch {
		// If Cloudflare doesn't respond, don't block a legitimate inquiry.
		return true;
	}
}

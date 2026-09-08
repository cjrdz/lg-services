import { asegurarToken } from "./session";
import type { Vertical } from "@/lib/media/keys";

/**
 * Uploads one photo with its derivatives.
 *
 * Everything here exists because Lisbeth will upload from her phone, on
 * mobile data, in El Salvador. This isn't over-engineered defensiveness —
 * it's the normal case.
 */

export interface ResultadoSubida {
	tallo: string;
	anchos: number[];
	duplicada: boolean;
}

export class ErrorSubida extends Error {
	constructor(
		message: string,
		readonly codigo: string,
		readonly reintentable: boolean,
	) {
		super(message);
		this.name = "ErrorSubida";
	}
}

const INTENTOS = 3;
const ESPERAS_MS = [1000, 3000, 9000];
const TIMEOUT_MS = 60_000;

/** Only network and server failures are worth retrying. */
function esReintentable(status: number): boolean {
	return status === 408 || status === 429 || status >= 500;
}

function esperar(ms: number): Promise<void> {
	// With some jitter, so multiple photos don't all retry at once.
	const jitter = Math.random() * 300;
	return new Promise((r) => setTimeout(r, ms + jitter));
}

interface Entrada {
	vertical: Vertical;
	anuncio: string;
	fotoId: string;
	derivadas: Array<{ ancho: number; blob: Blob }>;
	w: number;
	h: number;
	sha256: string;
	nombreOriginal: string;
}

function armarFormulario(e: Entrada): FormData {
	const form = new FormData();
	form.set("vertical", e.vertical);
	form.set("anuncio", e.anuncio);
	form.set("fotoId", e.fotoId);
	form.set("nombreOriginal", e.nombreOriginal);
	form.set("sha256", e.sha256);
	form.set("w", String(e.w));
	form.set("h", String(e.h));
	for (const d of e.derivadas) {
		// The field's filename carries the width — the server reads it from there.
		form.append("derivada", d.blob, `${d.ancho}.webp`);
	}
	return form;
}

/**
 * One attempt. Uses XMLHttpRequest instead of fetch because fetch doesn't
 * expose UPLOAD progress, and without a progress bar a slow upload looks stuck.
 */
function intentar(
	entrada: Entrada,
	onProgreso?: (fraccion: number) => void,
): Promise<ResultadoSubida> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/media/upload");
		xhr.timeout = TIMEOUT_MS;
		xhr.responseType = "json";
		// So retries can be correlated in the logs.
		xhr.setRequestHeader("Idempotency-Key", entrada.fotoId);

		xhr.upload.onprogress = (ev) => {
			if (ev.lengthComputable && onProgreso) {
				onProgreso(ev.loaded / ev.total);
			}
		};

		xhr.onload = () => {
			const cuerpo = xhr.response as (ResultadoSubida & { error?: string }) | null;

			if (xhr.status >= 200 && xhr.status < 300 && cuerpo?.tallo) {
				onProgreso?.(1);
				resolve(cuerpo);
				return;
			}
			reject(
				new ErrorSubida(
					cuerpo?.error ?? `HTTP ${xhr.status}`,
					cuerpo?.error ?? String(xhr.status),
					esReintentable(xhr.status),
				),
			);
		};

		xhr.onerror = () => reject(new ErrorSubida("Sin conexión", "red", true));
		xhr.ontimeout = () =>
			reject(new ErrorSubida("La subida tardó demasiado", "timeout", true));
		xhr.onabort = () => reject(new ErrorSubida("Subida cancelada", "cancelada", false));

		xhr.send(armarFormulario(entrada));
	});
}

/**
 * Uploads a photo, retrying with increasing backoff.
 *
 * Retrying is safe because the fotoId was generated beforehand: a second
 * attempt writes the exact same keys. No duplicates possible.
 */
export async function subirFoto(
	entrada: Entrada,
	onProgreso?: (fraccion: number) => void,
): Promise<ResultadoSubida> {
	let ultimo: unknown;

	for (let intento = 0; intento < INTENTOS; intento++) {
		try {
			return await intentar(entrada, onProgreso);
		} catch (err) {
			ultimo = err;
			const e = err as ErrorSubida;

			// Session expired mid-batch: refresh and retry once.
			if (e.codigo === "sin_sesion" || e.codigo === "401") {
				const ok = await asegurarToken();
				if (!ok) throw e;
				continue;
			}

			if (!e.reintentable || intento === INTENTOS - 1) throw e;
			await esperar(ESPERAS_MS[intento]);
		}
	}

	throw ultimo;
}

/** Fewer parallel uploads on a bad connection. */
export function concurrenciaSegunRed(): number {
	const conn = (navigator as Navigator & { connection?: { effectiveType?: string } })
		.connection;
	const tipo = conn?.effectiveType ?? "4g";
	return tipo === "slow-2g" || tipo === "2g" || tipo === "3g" ? 2 : 4;
}

/// <reference lib="webworker" />
import { ANCHOS } from "@/lib/media/keys";

/**
 * Generates a photo's WebP derivatives, off the main thread.
 *
 * Running this in a worker isn't a luxury: re-encoding ten 4000×3000 photos
 * on the main thread freezes the UI right when she wants to watch the progress.
 */

const CALIDAD = 0.82;

export interface PeticionResize {
	id: string;
	archivo: File;
}

export interface RespuestaResize {
	id: string;
	error?: "decodificar";
	derivadas?: Array<{ ancho: number; blob: Blob }>;
	w?: number;
	h?: number;
	sha256?: string;
	nombreOriginal?: string;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
	const hash = await crypto.subtle.digest("SHA-256", buffer);
	return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join(
		"",
	);
}

self.onmessage = async (e: MessageEvent<PeticionResize>) => {
	const { id, archivo } = e.data;

	let bitmap: ImageBitmap;
	try {
		// imageOrientation "from-image" applies the EXIF orientation; without
		// this, vertical phone photos come out sideways.
		bitmap = await createImageBitmap(archivo, {
			imageOrientation: "from-image",
		});
	} catch {
		// Usually an iPhone HEIC in "High Efficiency" mode: no decoder outside
		// Safari. The UI shows the specific fix.
		self.postMessage({ id, error: "decodificar" } satisfies RespuestaResize);
		return;
	}

	const w = bitmap.width;
	const h = bitmap.height;
	const derivadas: Array<{ ancho: number; blob: Blob }> = [];

	for (const objetivo of ANCHOS) {
		if (objetivo > w) continue; // never upscale

		// Halve step by step before the final draw. A single drawImage from
		// 4000px down to 240px produces visible jagged edges; stepping down
		// by halves keeps the detail.
		let actual: ImageBitmap = bitmap;
		while (actual.width / 2 > objetivo) {
			const mitad = new OffscreenCanvas(
				Math.max(1, Math.round(actual.width / 2)),
				Math.max(1, Math.round(actual.height / 2)),
			);
			const ctxMitad = mitad.getContext("2d");
			if (!ctxMitad) break;
			ctxMitad.imageSmoothingQuality = "high";
			ctxMitad.drawImage(actual, 0, 0, mitad.width, mitad.height);
			if (actual !== bitmap) actual.close();
			actual = mitad.transferToImageBitmap();
		}

		const lienzo = new OffscreenCanvas(
			objetivo,
			Math.max(1, Math.round((objetivo / w) * h)),
		);
		const ctx = lienzo.getContext("2d");
		if (!ctx) continue;
		ctx.imageSmoothingQuality = "high";
		ctx.drawImage(actual, 0, 0, lienzo.width, lienzo.height);
		if (actual !== bitmap) actual.close();

		derivadas.push({
			ancho: objetivo,
			blob: await lienzo.convertToBlob({
				type: "image/webp",
				quality: CALIDAD,
			}),
		});
	}

	// If the photo is smaller than the smallest width, still save one.
	if (derivadas.length === 0) {
		const lienzo = new OffscreenCanvas(w, h);
		const ctx = lienzo.getContext("2d");
		if (ctx) {
			ctx.drawImage(bitmap, 0, 0);
			derivadas.push({
				ancho: w,
				blob: await lienzo.convertToBlob({
					type: "image/webp",
					quality: CALIDAD,
				}),
			});
		}
	}

	bitmap.close();

	// The hash is of the ORIGINAL file — so the same photo is detected even
	// if the derivatives change if quality ever gets tuned.
	const sha256 = await sha256Hex(await archivo.arrayBuffer());

	self.postMessage({
		id,
		derivadas,
		w,
		h,
		sha256,
		nombreOriginal: archivo.name,
	} satisfies RespuestaResize);
};

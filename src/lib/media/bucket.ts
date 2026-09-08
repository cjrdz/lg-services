/**
 * Access to the R2 bucket.
 *
 * WATCH OUT: `Astro.locals.runtime.env` NO LONGER WORKS. In
 * @astrojs/cloudflare v14 that property is a getter that THROWS:
 *
 *   "Astro.locals.runtime.env has been removed in Astro v6.
 *    Use 'import { env } from \"cloudflare:workers\"' instead."
 *
 * So it doesn't fail silently — it blows up the request. The correct way is
 * the `cloudflare:workers` module, which only exists inside workerd's
 * runtime. That's why it's imported dynamically: in `astro dev` (which runs
 * on Node, without the adapter) it doesn't exist, and there null is returned
 * with a clear message instead of a cryptic error.
 *
 * Testing /estudio for real needs the compiled worker:
 *
 *     bun run build && bun run preview
 */

export interface ResultadoBucket {
	bucket: R2Bucket | null;
	motivo?: string;
}

export async function getBucketMedia(): Promise<ResultadoBucket> {
	try {
		// `env` is already typed from worker-configuration.d.ts (bun run cf-typegen),
		// so MEDIA comes out as R2Bucket with no cast needed.
		const { env } = await import("cloudflare:workers");
		const bucket = env?.MEDIA;

		if (!bucket) {
			return {
				bucket: null,
				motivo:
					"Falta el binding MEDIA. Creá el bucket y revisá r2_buckets en wrangler.jsonc.",
			};
		}
		return { bucket };
	} catch {
		return {
			bucket: null,
			motivo:
				"R2 no está disponible en `astro dev`. Para probar el estudio: bun run build && bun run preview.",
		};
	}
}

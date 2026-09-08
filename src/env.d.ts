/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

/*
  Note: in @astrojs/cloudflare v14 the Runtime type is no longer generic and
  no longer exposes `runtime.env`. Bindings are read via
  `import { env } from "cloudflare:workers"` — see src/lib/media/bucket.ts.
*/
type Runtime = import("@astrojs/cloudflare").Runtime;

declare namespace App {
	interface Locals extends Runtime {
		/** Set by src/middleware.ts after validating Keystatic's GitHub session. */
		editor?: { login: string; avatarUrl: string };
	}
}

import type { APIContext } from "astro";

/**
 * Who can upload and delete photos.
 *
 * No new login invented — reuses the GitHub session Keystatic already
 * creates. The question asked is the right one: "can this person push to
 * the repo?", which is exactly the permission Keystatic grants. So there's
 * ONE login for everything, and one place to revoke access (remove her as a
 * GitHub collaborator).
 *
 * On the strength of this: the `keystatic-gh-access-token` cookie is NOT
 * httpOnly (Keystatic deliberately leaves it readable by its own client), so
 * validating it here is exactly as strong as /keystatic itself. Locking down
 * /estudio harder alone would achieve nothing — anyone in would still be
 * able to commit whatever they want from the panel.
 *
 * If the laptop is ever shared, the answer is Cloudflare Access over ALL
 * FOUR paths (/estudio, /api/media/*, /keystatic, /api/keystatic/*), never
 * just one.
 */

const COOKIE = "keystatic-gh-access-token";
const REPO = "cjrdz/lg-services";
const UA = "lg-services-estudio";

export interface Editora {
	login: string;
	avatarUrl: string;
}

/**
 * Per-isolate cache. GitHub allows 5,000 requests/hour with a user token, so
 * this isn't even necessary — it just saves two round trips per upload.
 */
const cache = new Map<string, { editora: Editora; expira: number }>();
const TTL_MS = 5 * 60_000;

async function huella(token: string): Promise<string> {
	const datos = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return Array.from(new Uint8Array(datos), (b) => b.toString(16).padStart(2, "0")).join(
		"",
	);
}

export async function getEditora(ctx: APIContext): Promise<Editora | null> {
	const token = ctx.cookies.get(COOKIE)?.value;
	if (!token) return null;

	const fp = await huella(token);
	const hit = cache.get(fp);
	if (hit && hit.expira > Date.now()) return hit.editora;

	const headers = {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": UA,
	};

	try {
		const [resRepo, resUser] = await Promise.all([
			fetch(`https://api.github.com/repos/${REPO}`, { headers }),
			fetch("https://api.github.com/user", { headers }),
		]);
		if (!resRepo.ok || !resUser.ok) return null;

		// In GET /repos/{owner}/{repo}, `permissions` reflects the permissions
		// of WHOEVER is asking — exactly what we want to know.
		const repo = (await resRepo.json()) as {
			permissions?: { push?: boolean };
		};
		if (repo.permissions?.push !== true) return null;

		const user = (await resUser.json()) as {
			login: string;
			avatar_url: string;
		};
		const editora: Editora = { login: user.login, avatarUrl: user.avatar_url };
		cache.set(fp, { editora, expira: Date.now() + TTL_MS });
		return editora;
	} catch {
		// If GitHub doesn't respond, don't let it through. Fail closed.
		return null;
	}
}

/**
 * The cookie is SameSite=Lax, so a cross-site POST won't carry it — but the
 * origin is still checked explicitly.
 */
export function mismoOrigen(ctx: APIContext): boolean {
	const origin = ctx.request.headers.get("origin");
	if (!origin) return false;
	try {
		return origin === new URL(ctx.request.url).origin;
	} catch {
		return false;
	}
}

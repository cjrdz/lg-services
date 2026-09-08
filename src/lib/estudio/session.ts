/**
 * /estudio's session: it's the SAME one as Keystatic's.
 *
 * Two things found by reading Keystatic's source that explain why this looks
 * odder than expected:
 *
 *  1. Its OAuth only accepts returning to routes starting with "branch/", so
 *     you CANNOT send someone to sign in and have them return to /estudio.
 *     That's why login opens in a separate window while this waits for the
 *     cookie to show up.
 *  2. A GitHub user token lasts 8 hours. Without refreshing it, a long
 *     upload session dies halfway through. The silent refresh here is the
 *     same one Keystatic's own panel uses.
 */

const COOKIE = "keystatic-gh-access-token";

export function hayToken(): boolean {
	return document.cookie
		.split("; ")
		.some((c) => c.startsWith(`${COOKIE}=`) && c.length > COOKIE.length + 1);
}

/** Silent refresh using the httpOnly refresh cookie. */
export async function asegurarToken(): Promise<boolean> {
	if (hayToken()) return true;
	try {
		const res = await fetch("/api/keystatic/github/refresh-token", {
			method: "POST",
		});
		return res.status === 200 && hayToken();
	} catch {
		return false;
	}
}

/**
 * Does Keystatic's login route even exist?
 *
 * Doesn't exist in LOCAL mode (dev), and won't in production either until
 * the GitHub App is created. Without this check the button opened a window
 * onto a 404 and polled for three minutes for a cookie that would never arrive.
 */
export async function hayLoginDisponible(): Promise<boolean> {
	try {
		const res = await fetch("/api/keystatic/github/login", {
			method: "HEAD",
			redirect: "manual",
		});
		/*
		  404 = route doesn't exist (local mode, dev).
		  500 = it exists but the GitHub App secrets are missing; Keystatic
		        responds "Missing required config … 'github' storage mode".
		  Either way, signing in won't work yet, so this warns instead of
		  opening a window onto an error.
		*/
		return res.status !== 404 && res.status !== 500;
	} catch {
		return false;
	}
}

/** Interactive login in a separate window, polling for the cookie. */
export function abrirLogin(): Promise<boolean> {
	const v = window.open(
		"/api/keystatic/github/login",
		"ks-login",
		"width=620,height=760",
	);

	return new Promise((resolve) => {
		const t = setInterval(() => {
			if (hayToken()) {
				clearInterval(t);
				try {
					v?.close();
				} catch {
					/* the window may have already closed itself */
				}
				resolve(true);
			} else if (v?.closed) {
				clearInterval(t);
				resolve(hayToken());
			}
		}, 800);

		// 3-minute cap so the interval doesn't run forever.
		setTimeout(() => {
			clearInterval(t);
			resolve(hayToken());
		}, 180_000);
	});
}

/**
 * The site's motion policy. ONE switch controls all of it.
 *
 *   "sistema" — respects the OS's `prefers-reduced-motion`. When it's set to
 *               reduce, there are no page transitions, entrance animations,
 *               hover elevation, or icon morphs.
 *
 *   "siempre" — animates regardless, ignoring that preference.
 *
 * Set to "sistema" on purpose: whoever turned on "reduce motion" usually has
 * a reason, and it's not our place to override it.
 *
 * IF YOU SEE NO ANIMATIONS AT ALL: your system probably has "reduce motion"
 * on, and the site is honoring it. Check in the browser console:
 *
 *     matchMedia("(prefers-reduced-motion: reduce)").matches
 *
 * If that's `true`, either turn it off in the OS (Windows: Settings →
 * Accessibility → Visual effects → Animation effects), or set "siempre"
 * below.
 *
 * This value feeds two places:
 *  · `<html data-motion="…">` in BaseLayout, which gates the @media block
 *    in src/styles/global.css
 *  · every `<MorphIcon reducedMotion={…}>`, so icons follow the same rule
 *    as everything else (they used to go their own way)
 */
export const POLITICA_MOVIMIENTO: "sistema" | "siempre" = "sistema";

/** What morphicons expects: "user" respects the preference, "never" always animates. */
export const MORPH_REDUCED_MOTION =
	POLITICA_MOVIMIENTO === "sistema" ? "user" : "never";

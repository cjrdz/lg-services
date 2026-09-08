<script lang="ts">
	import { MorphIcon } from "morphicons/svelte";
	import { MORPH_REDUCED_MOTION } from "@/lib/motion";
	import { Sun, Moon } from "lucide";

	/**
	 * The server can't know the theme — it always renders the sun.
	 *
	 * State used to be read in onMount, so on a dark theme the icon did a
	 * VISIBLE sun→moon morph on every page load. It looked like a bug because
	 * it was one: an animation nobody asked for.
	 *
	 * Now it's two things:
	 *  1. State is read when the component is constructed (not in onMount),
	 *     so the client's first render is already correct.
	 *  2. Until a real click happens, the morph stays on "always" — which in
	 *     morphicons means an instant change. So the initial sync doesn't
	 *     animate, but clicks do.
	 */
	function temaOscuroActual(): boolean {
		if (typeof document === "undefined") return false;
		return document.documentElement.classList.contains("dark");
	}

	let dark = $state(temaOscuroActual());
	let interactuado = $state(false);

	function toggle() {
		interactuado = true;
		dark = !dark;
		document.documentElement.classList.toggle("dark", dark);
		try {
			localStorage.setItem("theme", dark ? "dark" : "light");
		} catch {
			// Private mode or blocked storage: the theme simply doesn't persist.
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	class="hover:bg-muted inline-flex size-9 items-center justify-center rounded-lg transition-colors"
	aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
>
	<MorphIcon
		icon={dark ? Moon : Sun}
		size={20}
		reducedMotion={interactuado ? MORPH_REDUCED_MOTION : "always"}
	/>
</button>

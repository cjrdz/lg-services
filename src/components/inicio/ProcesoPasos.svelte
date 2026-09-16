<script lang="ts">
	import { onMount } from "svelte";
	import { cargarGsap, DURACION_ENTRADA, type GsapModulo } from "@/lib/gsap";

	/**
	 * Steps list for the Proceso band, animated with GSAP ScrollTrigger.
	 *
	 * CSS scroll-driven animations (`animation-timeline: view()`) are the
	 * site's default, but they only work in Chrome/Edge 115+ and Safari 18.4+.
	 * For this section we need the stagger to be unmistakable in every
	 * browser, so GSAP drives it.
	 *
	 * The steps are hidden BEFORE paint by `.js .proceso-pasos > li` in
	 * global.css, so there's no flash of visible-then-vanishing content.
	 * If GSAP can't run (failed import, reduced motion), `.gsap-fallo`
	 * brings them back — the content never depends on the chunk arriving.
	 */
	interface Props {
		pasos: ReadonlyArray<{ titulo: string; descripcion: string }>;
	}

	let { pasos }: Props = $props();
	let lista: HTMLOListElement | undefined = $state();

	onMount(() => {
		const fallo = () => lista?.classList.add("gsap-fallo");

		cargarGsap()
			.then((g: GsapModulo | null) => {
				if (!g || !lista) return fallo();
				const { gsap, ScrollTrigger } = g;
				const items = lista.querySelectorAll(":scope > li");
				if (!items.length) return fallo();

				gsap.fromTo(
					items,
					{ opacity: 0, y: 28 },
					{
						opacity: 1,
						y: 0,
						duration: DURACION_ENTRADA,
						stagger: 0.22,
						ease: "salida",
						scrollTrigger: {
							trigger: lista,
							start: "top 82%",
							toggleActions: "play none none none",
						},
					},
				);
			})
			.catch(fallo);
	});
</script>

<ol bind:this={lista} class="proceso-pasos">
	{#each pasos as paso, i (i)}
		<li
			class="border-banda-linea grid grid-cols-[2.6rem_minmax(0,1fr)] gap-5 border-t py-6 last:border-b"
		>
			<span aria-hidden="true" class="text-accent font-serif text-xl tabular-nums">
				{String(i + 1).padStart(2, "0")}
			</span>
			<div class="min-w-0">
				<h3 class="text-banda-titulo text-lg font-semibold">{paso.titulo}</h3>
				<p class="mt-1.5 leading-relaxed">{paso.descripcion}</p>
			</div>
		</li>
	{/each}
</ol>

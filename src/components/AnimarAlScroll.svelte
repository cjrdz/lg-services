<script lang="ts">
	import { onMount } from "svelte";
	import { cargarGsap, DURACION_SCROLL } from "@/lib/gsap";

	interface Props {
		/** Selector inside this wrapper to animate. */
		selector?: string;
		/** Stagger between elements, in seconds. */
		stagger?: number;
		/** ScrollTrigger start value. */
		start?: string;
		/** Vertical distance to travel. */
		distancia?: number;
	}

	let {
		selector = ".scroll-animable",
		stagger = 0.1,
		start = "top 82%",
		distancia = 24,
	}: Props = $props();

	let raiz: HTMLElement;

	// Start loading GSAP as soon as this module runs on the client.
	const gsapPromise = typeof window !== "undefined" ? cargarGsap() : null;

	onMount(async () => {
		const g = gsapPromise ? await gsapPromise : null;
		if (!g) return;

		const targets = raiz.querySelectorAll(selector);
		if (targets.length === 0) return;

		const st = g.ScrollTrigger.create({
			trigger: raiz,
			start,
			onEnter: () => {
				g.gsap.fromTo(
					targets,
					{ opacity: 0, y: distancia },
					{
						opacity: 1,
						y: 0,
						duration: DURACION_SCROLL,
						ease: "salida",
						stagger,
					},
				);
			},
			once: true,
		});

		return () => {
			st.kill();
		};
	});
</script>

<div bind:this={raiz}>
	<slot />
</div>

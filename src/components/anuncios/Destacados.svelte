<script lang="ts">
	import { onMount } from "svelte";
	import TarjetaAnuncio from "./TarjetaAnuncio.svelte";
	import { cargarGsap, DURACION_SCROLL } from "@/lib/gsap";
	import type { TarjetaAnuncio as TarjetaAnuncioTipo } from "@/lib/anuncios-tipos";

	interface Props {
		tarjetas: TarjetaAnuncioTipo[];
		textos: {
			titulo: string;
			descripcion: string;
			verPropiedades: string;
			verVehiculos: string;
			etiquetaPropiedades: string;
			etiquetaVehiculos: string;
			sinFoto: string;
			consultarPrecio: string;
		};
	}

	let { tarjetas, textos }: Props = $props();

	let raiz: HTMLElement;

	// Start loading GSAP as soon as this module runs on the client.
	const gsapPromise = typeof window !== "undefined" ? cargarGsap() : null;

	onMount(async () => {
		const g = gsapPromise ? await gsapPromise : null;
		if (!g) return;

		const titulo = raiz.querySelector('[data-destacados="titulo"]');
		const cards = raiz.querySelectorAll(".scroll-animable");

		const triggers: (() => void)[] = [];

		if (titulo) {
			const stTitulo = g.ScrollTrigger.create({
				trigger: titulo,
				start: "top 85%",
				onEnter: () => {
					g.gsap.fromTo(
						titulo,
						{ opacity: 0, y: 18 },
						{
							opacity: 1,
							y: 0,
							duration: DURACION_SCROLL,
							ease: "salida",
						},
					);
				},
				once: true,
			});
			triggers.push(() => stTitulo.kill());
		}

		if (cards.length > 0) {
			const stGrid = g.ScrollTrigger.create({
				trigger: cards[0].parentElement,
				start: "top 80%",
				onEnter: () => {
					g.gsap.fromTo(
						cards,
						{ opacity: 0, y: 24 },
						{
							opacity: 1,
							y: 0,
							duration: DURACION_SCROLL,
							ease: "salida",
							stagger: 0.12,
						},
					);
				},
				once: true,
			});
			triggers.push(() => stGrid.kill());
		}

		return () => {
			triggers.forEach((kill) => kill());
		};
	});
</script>

<section bind:this={raiz} class="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
	<div class="mb-8 flex flex-wrap items-end justify-between gap-4">
		<div data-destacados="titulo">
			<h2 class="font-serif text-3xl font-bold tracking-tight">
				{textos.titulo}
			</h2>
			<p class="text-muted-foreground mt-2 max-w-2xl">{textos.descripcion}</p>
		</div>
		<div class="flex flex-wrap gap-3">
			<a
				href={textos.verPropiedades}
				class="border-border bg-card hover:border-primary/40 hover:text-primary group inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
			>
				{textos.etiquetaPropiedades}
				<svg
					aria-hidden="true"
					width="15"
					height="15"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="transition-transform duration-200 group-hover:translate-x-0.5"
				>
					<path d="M5 12h14" />
					<path d="m12 5 7 7-7 7" />
				</svg>
			</a>
			<a
				href={textos.verVehiculos}
				class="border-border bg-card hover:border-primary/40 hover:text-primary group inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
			>
				{textos.etiquetaVehiculos}
				<svg
					aria-hidden="true"
					width="15"
					height="15"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="transition-transform duration-200 group-hover:translate-x-0.5"
				>
					<path d="M5 12h14" />
					<path d="m12 5 7 7-7 7" />
				</svg>
			</a>
		</div>
	</div>

	<div
		data-destacados="grid"
		class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
	>
		{#each tarjetas as t (t.slug)}
			<TarjetaAnuncio
				tarjeta={t}
				clase="scroll-animable"
				textos={{ sinFoto: textos.sinFoto, consultarPrecio: textos.consultarPrecio }}
			/>
		{/each}
	</div>
</section>

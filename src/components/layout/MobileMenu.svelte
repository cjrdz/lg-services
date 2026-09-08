<script lang="ts">
	import { MorphIcon } from "morphicons/svelte";
	import { MORPH_REDUCED_MOTION } from "@/lib/motion";
	import { Menu, X } from "lucide";

	interface Enlace {
		href: string;
		label: string;
		activo: boolean;
	}

	let {
		enlaces,
		etiquetaAbrir,
		etiquetaCerrar,
	}: {
		enlaces: Enlace[];
		etiquetaAbrir: string;
		etiquetaCerrar: string;
	} = $props();

	let abierto = $state(false);

	// The open menu blocks background scroll; restored on close.
	$effect(() => {
		document.body.style.overflow = abierto ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	});

	function alPresionarTecla(event: KeyboardEvent) {
		if (event.key === "Escape") abierto = false;
	}
</script>

<svelte:window onkeydown={alPresionarTecla} />

<button
	type="button"
	class="hover:bg-muted inline-flex size-9 items-center justify-center rounded-lg transition-colors md:hidden"
	aria-label={abierto ? etiquetaCerrar : etiquetaAbrir}
	aria-expanded={abierto}
	aria-controls="menu-movil"
	onclick={() => (abierto = !abierto)}
>
	<MorphIcon icon={abierto ? X : Menu} size={22} reducedMotion={MORPH_REDUCED_MOTION} />
</button>

{#if abierto}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bg-background/80 fixed inset-0 top-16 z-40 backdrop-blur-sm md:hidden"
		onclick={() => (abierto = false)}
	></div>

	<nav
		id="menu-movil"
		class="bg-background border-border fixed inset-x-0 top-16 z-40 border-b shadow-lg md:hidden"
	>
		<ul class="flex flex-col p-2">
			{#each enlaces as enlace (enlace.href)}
				<li>
					<a
						href={enlace.href}
						aria-current={enlace.activo ? "page" : undefined}
						class="hover:bg-muted block rounded-lg px-4 py-3 text-base font-medium transition-colors aria-[current=page]:text-primary"
					>
						{enlace.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

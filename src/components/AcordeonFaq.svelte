<script lang="ts">
	import { MorphIcon } from "morphicons/svelte";
	import { MORPH_REDUCED_MOTION } from "@/lib/motion";
	// Plus ↔ Minus, not a rotating chevron: the row either adds the answer or
	// takes it away, and that's a state change morphicons is actually for.
	import { Minus, Plus } from "lucide";

	interface Props {
		pregunta: string;
		respuesta: string;
	}

	let { pregunta, respuesta }: Props = $props();
	let abierto = $state(false);
</script>

<div class="border-border border-b">
	<button
		type="button"
		class="hover:text-primary color-animado flex w-full items-center justify-between gap-5 py-5 text-left text-[1.02rem] font-semibold"
		aria-expanded={abierto}
		onclick={() => (abierto = !abierto)}
	>
		<span class="min-w-0">{pregunta}</span>
		<MorphIcon
			icon={abierto ? Minus : Plus}
			size={18}
			reducedMotion={MORPH_REDUCED_MOTION}
			class="text-muted-foreground shrink-0"
		/>
	</button>
	<div class="acordeon-contenido" class:abierto>
		<div>
			<p class="text-muted-foreground max-w-[64ch] pb-5 leading-relaxed">
				{respuesta}
			</p>
		</div>
	</div>
</div>

<script lang="ts">
	import { MorphIcon } from "morphicons/svelte";
	import { MORPH_REDUCED_MOTION } from "@/lib/motion";
	import { ChevronDown, ChevronUp } from "lucide";

	interface Props {
		pregunta: string;
		respuesta: string;
	}

	let { pregunta, respuesta }: Props = $props();
	let abierto = $state(false);
</script>

<div class="border-border bg-card rounded-xl border">
	<button
		type="button"
		class="flex w-full items-center justify-between gap-3 p-5 text-left font-medium"
		aria-expanded={abierto}
		onclick={() => (abierto = !abierto)}
	>
		{pregunta}
		<MorphIcon
			icon={abierto ? ChevronUp : ChevronDown}
			size={18}
			reducedMotion={MORPH_REDUCED_MOTION}
			class="text-muted-foreground shrink-0"
		/>
	</button>
	<div class="acordeon-contenido" class:abierto>
		<div>
			<p class="text-muted-foreground px-5 pb-5 text-sm">{respuesta}</p>
		</div>
	</div>
</div>

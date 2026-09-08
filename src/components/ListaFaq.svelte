<script lang="ts">
	import AcordeonFaq from "./AcordeonFaq.svelte";

	interface Props {
		items: Array<{ pregunta: string; respuesta: string }>;
	}

	let { items }: Props = $props();
</script>

<div class="space-y-4">
	{#each items as item (item.pregunta)}
		<AcordeonFaq pregunta={item.pregunta} respuesta={item.respuesta} />
	{/each}
</div>

<script lang="ts">
	import AcordeonFaq from "./AcordeonFaq.svelte";

	interface Props {
		items: Array<{ pregunta: string; respuesta: string }>;
	}

	let { items }: Props = $props();
</script>

<!--
	No gap between items: they're rows of one list sharing a hairline, not
	separate cards. Each row draws its own bottom border.
-->
<div>
	{#each items as item (item.pregunta)}
		<AcordeonFaq pregunta={item.pregunta} respuesta={item.respuesta} />
	{/each}
</div>

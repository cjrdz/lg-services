<script lang="ts">
	import { onMount } from "svelte";
	import {
		abrirLogin,
		asegurarToken,
		hayLoginDisponible,
		hayToken,
	} from "@/lib/estudio/session";

	let entrando = $state(false);
	let fallo = $state(false);
	// null while checking; false if the login route doesn't exist yet.
	let disponible = $state<boolean | null>(null);

	onMount(async () => {
		// Silent attempt: if there's a refresh cookie, she never even notices.
		if (await asegurarToken()) {
			location.reload();
			return;
		}
		disponible = await hayLoginDisponible();
	});

	async function entrar() {
		entrando = true;
		fallo = false;
		const ok = await abrirLogin();
		if (ok || hayToken()) {
			location.reload();
		} else {
			entrando = false;
			fallo = true;
		}
	}
</script>

<div class="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
	<h1 class="font-serif text-2xl font-bold tracking-tight">Estudio de fotos</h1>
	<p class="text-muted-foreground mt-3 text-sm">
		Entrá con la misma cuenta de GitHub que usás para el panel.
	</p>

	<button
		type="button"
		onclick={entrar}
		disabled={entrando}
		class="bg-primary text-primary-foreground mt-6 inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
	>
		{entrando ? "Esperando…" : "Entrar con GitHub"}
	</button>

	{#if disponible === false}
		<p
			class="border-border bg-muted/40 text-muted-foreground mt-5 rounded-lg border px-4 py-3 text-left text-sm"
		>
			Todavía no está configurada la GitHub App de Keystatic, así que iniciar sesión no
			va a funcionar. Los pasos están en <code>SETUP-DESPLIEGUE.md</code>.
		</p>
	{/if}

	{#if entrando}
		<p class="text-muted-foreground mt-4 text-xs">
			Se abrió una ventana para iniciar sesión. Si no la ves, revisá si el navegador
			bloqueó las ventanas emergentes.
		</p>
	{/if}

	{#if fallo}
		<p class="text-destructive mt-4 text-sm">
			No se pudo iniciar sesión. Probá de nuevo, o entrá primero al
			<a href="/keystatic" class="underline">panel</a> y volvé acá.
		</p>
	{/if}
</div>

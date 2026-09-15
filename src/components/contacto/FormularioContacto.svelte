<script lang="ts">
	import { MorphIcon } from "morphicons/svelte";
	import { MORPH_REDUCED_MOTION } from "@/lib/motion";
	import { Send, Check, LoaderCircle } from "lucide";

	/**
	 * Progressive enhancement over a real `<form method="POST">`.
	 *
	 * The server already rendered a form that works with no JavaScript: it
	 * submits, the endpoint responds 303, and it returns to /contacto with
	 * the result in the URL. This island only avoids the reload and shows
	 * errors field by field.
	 *
	 * Worth insisting on this because lg-blog's form was a mockup: the button
	 * was a `<label>` that opened a "Message sent!" modal without sending
	 * anything. A legal inquiry vanished and the person believed it had gone through.
	 */
	interface Props {
		motivos: Array<{ id: string; etiqueta: string }>;
		textos: Record<string, string>;
		whatsapp: string;
		/** Turnstile's public site key. Without it, the widget doesn't render. */
		turnstileSiteKey?: string;
		/**
		 * Privacy-notice URL. Only arrives if the page is published: requiring
		 * acceptance of a document that can't be read isn't acceptable on a
		 * site collecting personal data.
		 */
		avisoPrivacidadUrl?: string;
	}

	let { motivos, textos, whatsapp, turnstileSiteKey, avisoPrivacidadUrl }: Props =
		$props();

	let enviando = $state(false);
	let resultado = $state<"ok" | "error" | null>(null);
	let mensajeGlobal = $state("");
	let errores = $state<Record<string, string>>({});

	async function alEnviar(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;

		enviando = true;
		resultado = null;
		errores = {};

		try {
			const res = await fetch(form.action, {
				method: "POST",
				body: new FormData(form),
				headers: { Accept: "application/json" },
			});
			const d = (await res.json()) as {
				estado: "ok" | "error";
				mensaje: string;
				errores?: Record<string, string>;
			};

			resultado = d.estado;
			mensajeGlobal = d.mensaje;
			errores = d.errores ?? {};
			if (d.estado === "ok") form.reset();
		} catch {
			resultado = "error";
			mensajeGlobal = textos.error;
		} finally {
			enviando = false;
		}
	}
</script>

<form
	method="POST"
	action="/api/contacto"
	onsubmit={alEnviar}
	class="space-y-4"
	novalidate
>
	<!--
		Honeypot: invisible to a real person, irresistible to a bot.
		aria-hidden + tabindex -1 so a screen reader never announces it.
	-->
	<div class="hidden" aria-hidden="true">
		<label>
			Empresa
			<input type="text" name="empresa" tabindex="-1" autocomplete="off" />
		</label>
	</div>

	<!--
		Fields share `color-animado` so the border glides instead of snapping
		when `aria-invalid` marks the field with the error — the message under
		it says what's wrong, the border says where.
	-->
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="block">
			<span class="text-sm font-medium">{textos.nombre}</span>
			<input
				type="text"
				name="nombre"
				required
				autocomplete="name"
				aria-invalid={errores.nombre ? "true" : undefined}
				class="border-input bg-background color-animado aria-invalid:border-destructive mt-1 w-full rounded-lg border px-3 py-2 text-sm"
			/>
			{#if errores.nombre}
				<span class="error-animado text-destructive mt-1 block text-xs">{errores.nombre}</span>
			{/if}
		</label>

		<label class="block">
			<span class="text-sm font-medium">{textos.correo}</span>
			<input
				type="email"
				name="correo"
				required
				autocomplete="email"
				aria-invalid={errores.correo ? "true" : undefined}
				class="border-input bg-background color-animado aria-invalid:border-destructive mt-1 w-full rounded-lg border px-3 py-2 text-sm"
			/>
			{#if errores.correo}
				<span class="error-animado text-destructive mt-1 block text-xs">{errores.correo}</span>
			{/if}
		</label>

		<label class="block">
			<span class="text-sm font-medium">{textos.telefono}</span>
			<input
				type="tel"
				name="telefono"
				autocomplete="tel"
				class="border-input bg-background color-animado mt-1 w-full rounded-lg border px-3 py-2 text-sm"
			/>
		</label>

		<label class="block">
			<span class="text-sm font-medium">{textos.asunto}</span>
			<select
				name="motivo"
				required
				class="border-input bg-background color-animado mt-1 w-full rounded-lg border px-3 py-2 text-sm"
			>
				{#each motivos as m (m.id)}
					<option value={m.id}>{m.etiqueta}</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="block">
		<span class="text-sm font-medium">{textos.mensaje}</span>
		<textarea
			name="mensaje"
			rows="6"
			required
			aria-invalid={errores.mensaje ? "true" : undefined}
			class="border-input bg-background color-animado aria-invalid:border-destructive mt-1 w-full rounded-lg border px-3 py-2 text-sm"
		></textarea>
		{#if errores.mensaje}
			<span class="error-animado text-destructive mt-1 block text-xs">{errores.mensaje}</span>
		{/if}
	</label>

	<label class="flex items-start gap-2">
		<input
			type="checkbox"
			name="privacidad"
			required
			aria-invalid={errores.privacidad ? "true" : undefined}
			class="border-input color-animado aria-invalid:border-destructive mt-0.5 size-4 rounded border"
		/>
		<span class="text-muted-foreground text-sm">
			{#if avisoPrivacidadUrl}
				{textos.privacidadPrefijo}
				<a
					href={avisoPrivacidadUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary underline"
				>
					{textos.privacidadEnlace}
				</a>
				{textos.privacidadSufijo}
			{:else}
				{textos.privacidad}
			{/if}
		</span>
	</label>
	{#if errores.privacidad}
		<span class="error-animado text-destructive block text-xs">{errores.privacidad}</span>
	{/if}

	{#if turnstileSiteKey}
		<div class="cf-turnstile" data-sitekey={turnstileSiteKey}></div>
	{/if}

	<!--
		Same hover as the home hero's primary CTA. `color-animado` replaces
		`transition-opacity`: a utility would win the cascade and make the
		background snap (the trap documented on `.elevable`), and the disabled
		fade happens under the spinner anyway.
	-->
	<button
		type="submit"
		disabled={enviando}
		class="bg-primary text-primary-foreground hover:bg-primary/90 color-animado inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
	>
		<!--
			The icon tells the submit's state: plane -> spinning -> checkmark.
			This is where an animation genuinely earns its place — there's a
			wait, and the person needs to know something is happening.
		-->
		<MorphIcon
			icon={resultado === "ok" ? Check : enviando ? LoaderCircle : Send}
			size={16}
			reducedMotion={MORPH_REDUCED_MOTION}
			class={enviando ? "animate-spin" : undefined}
		/>
		{enviando ? textos.enviando : textos.enviar}
	</button>

	{#if resultado === "ok"}
		<p
			class="mensaje-animado border-success bg-success/10 text-foreground rounded-lg border px-4 py-3 text-sm"
			role="status"
		>
			{textos.exito}
		</p>
	{:else if resultado === "error"}
		<p
			class="mensaje-animado border-destructive bg-destructive/10 text-foreground rounded-lg border px-4 py-3 text-sm"
			role="alert"
		>
			{mensajeGlobal || textos.error}
			<a href={whatsapp} target="_blank" rel="noopener noreferrer" class="underline">
				{textos.whatsapp}
			</a>
		</p>
	{/if}
</form>

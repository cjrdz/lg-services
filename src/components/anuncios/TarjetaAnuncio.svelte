<script lang="ts">
	import { r2Srcset, r2Url } from "@/lib/media/r2";
	import type { TarjetaAnuncio } from "@/lib/anuncios-tipos";

	interface Props {
		tarjeta: TarjetaAnuncio;
		textos: {
			sinFoto: string;
			consultarPrecio: string;
		};
		clase?: string;
	}

	let { tarjeta, textos, clase = "" }: Props = $props();

	const dinero = new Intl.NumberFormat("es-SV", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	});

	const ANCHOS_TARJETA = [240, 480, 960] as const;
</script>

<article
	class="border-border bg-card hover:border-primary/40 group elevable relative overflow-hidden rounded-lg border {clase}"
>
	<!--
		The photo is clipped here rather than on the <img>, so the zoom on hover
		happens inside a frame that doesn't move.
	-->
	<div class="relative overflow-hidden">
		{#if r2Url(tarjeta.foto, 480)}
			<img
				src={r2Url(tarjeta.foto, 480)}
				srcset={r2Srcset(tarjeta.foto, ANCHOS_TARJETA)}
				sizes="(min-width: 1280px) 20rem, (min-width: 640px) 45vw, 90vw"
				alt={tarjeta.alt}
				loading="lazy"
				decoding="async"
				style="aspect-ratio:4/3"
				class="zoom-foto bg-muted w-full object-cover"
			/>
		{:else}
			<div
				class="bg-muted text-muted-foreground flex w-full items-center justify-center text-xs"
				style="aspect-ratio:4/3"
			>
				{textos.sinFoto}
			</div>
		{/if}

		<!-- Over the photo: it belongs to the listing's status, not to its price. -->
		{#if tarjeta.insignia}
			<span
				class="bg-background/90 text-foreground absolute top-2 left-2 rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur-sm"
			>
				{tarjeta.insignia}
			</span>
		{/if}
	</div>

	<div class="p-4">
		<div class="flex items-start justify-between gap-2">
			<p class="font-semibold tabular-nums">
				{tarjeta.ocultarPrecio ? textos.consultarPrecio : dinero.format(tarjeta.precio)}
				{#if !tarjeta.ocultarPrecio && tarjeta.periodoTexto}
					<span class="text-muted-foreground text-sm font-normal">
						{tarjeta.periodoTexto}
					</span>
				{/if}
			</p>
			<svg
				aria-hidden="true"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="text-primary flecha-tarjeta mt-0.5 shrink-0"
			>
				<path d="M5 12h14" />
				<path d="m12 5 7 7-7 7" />
			</svg>
		</div>

		<h3 class="group-hover:text-primary color-animado mt-1 font-medium">
			<a href={tarjeta.href} class="after:absolute after:inset-0">{tarjeta.titulo}</a>
		</h3>

		<p class="text-muted-foreground mt-1 text-sm">{tarjeta.subtitulo}</p>

		{#if tarjeta.datos.length > 0}
			<p class="text-muted-foreground mt-2 text-xs">
				{tarjeta.datos.join(" · ")}
			</p>
		{/if}
	</div>
</article>

<script lang="ts">
	import { tick, untrack } from "svelte";
	import { MorphIcon } from "morphicons/svelte";
	import { MORPH_REDUCED_MOTION } from "@/lib/motion";
	import { Search, X } from "lucide";
	import TarjetaAnuncio from "@/components/anuncios/TarjetaAnuncio.svelte";
	import {
		cargarGsap,
		capturarFlipState,
		DURACION_NORMAL,
		prefiereMovimientoReducido,
		type GsapModulo,
	} from "@/lib/gsap";
	import type {
		DescriptorFiltro,
		DescriptorOrden,
		TarjetaAnuncio as TarjetaAnuncioTipo,
	} from "@/lib/anuncios-tipos";

	/**
	 * Filtering island SHARED by propiedades and vehiculos.
	 *
	 * Doesn't know what "habitaciones" or "pasajeros" mean: it receives
	 * already-normalized cards (`TarjetaAnuncio`) and a list of filters
	 * describing which key to look at and how to render it. That's why both
	 * sections use this one file instead of each keeping its own copy, which
	 * is how they'd drift apart.
	 *
	 * Filters in the browser over data already embedded in the page: about
	 * 350 bytes per listing, so tens of listings are a few KB and ZERO
	 * requests. Svelte also server-renders this, so the grid is complete and
	 * indexable before any JavaScript arrives.
	 */
	interface Props {
		tarjetas: TarjetaAnuncioTipo[];
		filtros: DescriptorFiltro[];
		ordenes: DescriptorOrden[];
		textos: Record<string, string>;
		/** The facet this mounts with, on facet pages. */
		inicial?: Record<string, string>;
	}

	let { tarjetas, filtros, ordenes, textos, inicial = {} }: Props = $props();

	/*
	  `inicial` comes from Astro and never changes: it's the facet the page
	  was built with. We want a snapshot of the value, not a subscription, and
	  `untrack` says that explicitly (reading it bare warns `state_referenced_locally`).
	*/
	const semilla = untrack(() => ({ ...inicial }));

	// Same reason: `ordenes` is a prop, and reading it bare warns
	// `state_referenced_locally`. The first order is the default and never
	// changes over the page's lifetime.
	const ordenPorDefecto = untrack(() => ordenes[0]?.clave ?? "recientes");

	let busqueda = $state("");
	let seleccion = $state<Record<string, string>>({ ...semilla });
	let numeros = $state<Record<string, number | null>>({});
	let orden = $state(ordenPorDefecto);
	let montado = $state(false);
	let grid: HTMLElement | undefined = $state();
	let gsapMod = $state<GsapModulo | null>(null);

	// Start loading GSAP as soon as this module runs on the client.
	const gsapPromise = typeof window !== "undefined" ? cargarGsap() : null;

	/* On mount, read the URL: a filter shared over WhatsApp — how listings
	   actually circulate here — opens to exactly what the sender saw. */
	$effect(() => {
		if (montado) return;
		montado = true;
		const p = new URLSearchParams(location.search);
		busqueda = p.get("q") ?? "";

		const sel: Record<string, string> = { ...semilla };
		const num: Record<string, number | null> = {};
		for (const f of filtros) {
			const v = p.get(f.clave);
			if (f.tipo === "select") {
				if (v !== null) sel[f.clave] = v;
			} else {
				num[f.clave] = v !== null && v !== "" ? Number(v) : null;
			}
		}
		seleccion = sel;
		numeros = num;

		const o = p.get("orden");
		if (o && ordenes.some((x) => x.clave === o)) orden = o;

		// GSAP is already loading from the module-level promise.
		gsapPromise?.then((g) => {
			gsapMod = g;
		});
	});

	const normalizada = $derived(
		busqueda
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim(),
	);

	const filtradas = $derived.by(() => {
		// Sold and rented listings are hidden by default but still reachable by
		// URL: they're social proof, and they keep their inbound links.
		let r = tarjetas.filter((t) => t.disponible);

		for (const f of filtros) {
			if (f.tipo === "select") {
				const v = seleccion[f.clave];
				if (v) r = r.filter((t) => t.facetas[f.campo] === v);
			} else {
				const v = numeros[f.clave];
				if (v === null || v === undefined || Number.isNaN(v)) continue;
				r =
					f.tipo === "max"
						? r.filter((t) => (t.numeros[f.campo] ?? 0) <= v)
						: r.filter((t) => (t.numeros[f.campo] ?? 0) >= v);
			}
		}

		if (normalizada) r = r.filter((t) => t.q.includes(normalizada));

		const d = ordenes.find((x) => x.clave === orden);
		const s = [...r];
		if (d?.campo) {
			s.sort((a, b) => {
				const va = a.numeros[d.campo!] ?? 0;
				const vb = b.numeros[d.campo!] ?? 0;
				return d.direccion === "asc" ? va - vb : vb - va;
			});
		} else {
			s.sort((a, b) => (d?.direccion === "asc" ? a.ts - b.ts : b.ts - a.ts));
		}
		return s;
	});

	/* The URL mirrors the filters without reloading or littering history. */
	$effect(() => {
		if (!montado) return;
		const p = new URLSearchParams();
		if (busqueda) p.set("q", busqueda);
		for (const f of filtros) {
			if (f.tipo === "select") {
				const v = seleccion[f.clave];
				if (v) p.set(f.clave, v);
			} else {
				const v = numeros[f.clave];
				if (v !== null && v !== undefined && !Number.isNaN(v)) {
					p.set(f.clave, String(v));
				}
			}
		}
		if (orden !== ordenPorDefecto) p.set("orden", orden);
		const qs = p.toString();
		history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
	});

	function limpiar() {
		busqueda = "";
		seleccion = { ...semilla };
		numeros = {};
		orden = ordenPorDefecto;
	}

	/* Capture the layout BEFORE Svelte updates the DOM. */
	let estadoFlip: ReturnType<typeof import("gsap/Flip").Flip.getState> | undefined;
	$effect.pre(() => {
		// Reading filtradas makes this effect run whenever the list changes.
		const _ = filtradas.map((t) => t.slug);
		if (grid && gsapMod && !prefiereMovimientoReducido()) {
			estadoFlip = capturarFlipState(gsapMod.Flip, grid.querySelectorAll("article"));
		}
	});

	/* Animate from the captured layout AFTER Svelte updates the DOM. */
	$effect(() => {
		const _ = filtradas.map((t) => t.slug);
		if (!estadoFlip || !grid || !gsapMod || prefiereMovimientoReducido()) return;

		tick().then(() => {
			const cards = grid!.querySelectorAll("article");
			cards.forEach((el) => el.classList.add("flip-animando"));

			gsapMod!.Flip.from(estadoFlip!, {
				duration: DURACION_NORMAL,
				ease: "salida",
				stagger: 0.03,
				absolute: true,
				scale: true,
				simple: true,
				onEnter: (elements) =>
					gsapMod!.gsap.fromTo(
						elements,
						{ opacity: 0, scale: 0.96 },
						{
							opacity: 1,
							scale: 1,
							duration: DURACION_NORMAL,
							ease: "salida",
						},
					),
				onLeave: (elements) =>
					gsapMod!.gsap.fromTo(
						elements,
						{ opacity: 1, scale: 1 },
						{
							opacity: 0,
							scale: 0.96,
							duration: DURACION_NORMAL,
							ease: "salida",
						},
					),
				onComplete: () => {
					cards.forEach((el) => el.classList.remove("flip-animando"));
				},
			});
		});
	});
</script>

<div class="grid gap-8 lg:grid-cols-[16rem_1fr]">
	<aside class="lg:sticky lg:top-20 lg:self-start">
		<div class="border-border bg-card rounded-xl border p-4">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">{textos.titulo}</h2>
				<button
					type="button"
					onclick={limpiar}
					class="text-muted-foreground hover:text-foreground text-xs"
				>
					{textos.limpiar}
				</button>
			</div>

			<div class="mt-4 space-y-4">
				<label class="block">
					<span class="text-xs font-medium">{textos.buscar}</span>
					<div class="relative mt-1">
						<input
							type="text"
							bind:value={busqueda}
							placeholder={textos.buscarPlaceholder}
							class="border-input bg-background w-full rounded-lg border py-2 pr-9 pl-3 text-sm"
						/>
						<!--
							The magnifying glass morphs into an X once there's text: the
							same spot goes from "search here" to "clear this".
						-->
						<button
							type="button"
							onclick={() => (busqueda = "")}
							disabled={!busqueda}
							aria-label={busqueda ? textos.limpiar : textos.buscar}
							tabindex={busqueda ? 0 : -1}
							class="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 transition-colors disabled:pointer-events-none"
						>
							<MorphIcon
								icon={busqueda ? X : Search}
								size={16}
								reducedMotion={MORPH_REDUCED_MOTION}
							/>
						</button>
					</div>
				</label>

				{#each filtros as f (f.clave)}
					<label class="block">
						<span class="text-xs font-medium">{f.etiqueta}</span>
						{#if f.tipo === "select"}
							<select
								bind:value={seleccion[f.clave]}
								class="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
							>
								<option value="">{textos.todos}</option>
								{#each f.opciones ?? [] as o (o.value)}
									<option value={o.value}>{o.label}</option>
								{/each}
							</select>
						{:else}
							<input
								type="number"
								min="0"
								bind:value={numeros[f.clave]}
								placeholder={f.placeholder ?? ""}
								class="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
							/>
						{/if}
					</label>
				{/each}

				<label class="block">
					<span class="text-xs font-medium">{textos.ordenar}</span>
					<select
						bind:value={orden}
						class="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
					>
						{#each ordenes as o (o.clave)}
							<option value={o.clave}>{o.etiqueta}</option>
						{/each}
					</select>
				</label>
			</div>
		</div>
	</aside>

	<div>
		<p class="text-muted-foreground mb-4 text-sm">
			{filtradas.length === 1
				? textos.conteoUno
				: textos.conteo.replace("{n}", String(filtradas.length))}
		</p>

		{#if filtradas.length === 0}
			<div
				class="border-border bg-muted/30 rounded-xl border border-dashed p-10 text-center"
			>
				<p class="font-medium">{textos.sinResultados}</p>
				<p class="text-muted-foreground mt-1 text-sm">{textos.sinResultadosAyuda}</p>
			</div>
		{:else}
			<div
				bind:this={grid}
				class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
			>
				{#each filtradas as t (t.slug)}
					<TarjetaAnuncio
						tarjeta={t}
						textos={{ sinFoto: textos.sinFoto, consultarPrecio: textos.consultarPrecio }}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>


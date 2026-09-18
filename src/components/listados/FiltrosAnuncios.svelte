<script lang="ts">
	import { tick, untrack } from "svelte";
	import { MorphIcon } from "morphicons/svelte";
	import { MORPH_REDUCED_MOTION } from "@/lib/motion";
	import { Search, X, SlidersHorizontal } from "lucide";
	import TarjetaAnuncio from "@/components/anuncios/TarjetaAnuncio.svelte";
	import {
		cargarFlip,
		capturarFlipState,
		DURACION_NORMAL,
		prefiereMovimientoReducido,
		type ModuloFlip,
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

	/*
	  Every select starts at "" so it matches its <option value="">Todos</option>.
	  Left undefined, the bound value matches no option and the browser draws
	  an EMPTY select — which is what the three property selects looked like.
	*/
	const seleccionVacia = () => {
		const base: Record<string, string> = {};
		for (const f of filtros) if (f.tipo === "select") base[f.clave] = "";
		return { ...base, ...semilla };
	};

	let busqueda = $state("");
	let seleccion = $state<Record<string, string>>(seleccionVacia());
	let numeros = $state<Record<string, number | null>>({});
	let orden = $state(ordenPorDefecto);
	let montado = $state(false);
	let grid: HTMLElement | undefined = $state();
	let gsapMod = $state<ModuloFlip | null>(null);

	/*
	  Panel open/closed, only meaningful below the listing breakpoint (the CSS
	  ignores it above). Starts OPEN so the markup works with no JavaScript,
	  and the island closes it on mount: on a phone the panel is seven form
	  fields standing between the person and the first listing.
	*/
	let panelAbierto = $state(true);

	/*
	  Start loading GSAP as soon as this module runs on the client.

	  `cargarFlip()`, not a blanket loader: this island uses Flip and nothing
	  else. The old entry point pulled ScrollTrigger along with it — 17 KB
	  gzipped of a plugin no listing page ever calls.
	*/
	const gsapPromise = typeof window !== "undefined" ? cargarFlip() : null;

	/* On mount, read the URL: a filter shared over WhatsApp — how listings
	   actually circulate here — opens to exactly what the sender saw. */
	$effect(() => {
		if (montado) return;
		montado = true;
		panelAbierto = false;
		const p = new URLSearchParams(location.search);
		busqueda = p.get("q") ?? "";

		const sel: Record<string, string> = seleccionVacia();
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

	/*
	  What's applied right now, as removable chips.

	  On a phone the panel is closed most of the time, so without this there's
	  nothing on screen saying WHY only two listings are showing. `fijo`
	  marks the facet the page itself was built with: it can't be removed
	  without leaving the page, so it renders without an ✕.
	*/
	const chips = $derived.by(() => {
		const out: Array<{ id: string; texto: string; fijo: boolean; quitar: () => void }> =
			[];

		if (busqueda) {
			out.push({
				id: "q",
				texto: `“${busqueda}”`,
				fijo: false,
				quitar: () => (busqueda = ""),
			});
		}

		for (const f of filtros) {
			if (f.tipo === "select") {
				const v = seleccion[f.clave];
				if (!v) continue;
				const etiquetaValor = f.opciones?.find((o) => o.value === v)?.label ?? v;
				out.push({
					id: f.clave,
					texto: etiquetaValor,
					fijo: semilla[f.clave] === v,
					quitar: () => (seleccion = { ...seleccion, [f.clave]: "" }),
				});
			} else {
				const v = numeros[f.clave];
				if (v === null || v === undefined || Number.isNaN(v)) continue;
				out.push({
					id: f.clave,
					texto: `${f.etiqueta}: ${v}`,
					fijo: false,
					quitar: () => (numeros = { ...numeros, [f.clave]: null }),
				});
			}
		}

		return out;
	});

	const activos = $derived(chips.filter((c) => !c.fijo).length);

	/* Sorting counts as something to reset, but it isn't a "filter" on the badge. */
	const hayQueLimpiar = $derived(activos > 0 || orden !== ordenPorDefecto);

	function limpiar() {
		busqueda = "";
		seleccion = seleccionVacia();
		numeros = {};
		orden = ordenPorDefecto;
	}

	/* Capture the layout BEFORE Svelte updates the DOM. */
	let estadoFlip: ReturnType<typeof import("gsap/Flip").Flip.getState> | undefined;

	/*
	  The grid ships with `.revelar-grupo`, so the first screenful of listings
	  reveals as it's scrolled with no JavaScript at all. But that reveal is a
	  CSS animation with `fill: both`, and a filled animation outranks the
	  inline `transform` GSAP Flip writes — the two cannot own the cards at the
	  same time.

	  So the class is dropped the first time the list actually changes: from
	  the moment someone filters, Flip owns the grid. Any card still waiting
	  to be revealed simply becomes visible, which is what filtering asks for
	  anyway.
	*/
	let firmaAnterior: string | null = null;
	let revelarCedido = false;

	$effect.pre(() => {
		// Reading filtradas makes this effect run whenever the list changes.
		const firma = filtradas.map((t) => t.slug).join("|");
		const cambio = firmaAnterior !== null && firma !== firmaAnterior;
		firmaAnterior = firma;

		if (cambio && !revelarCedido && grid) {
			revelarCedido = true;
			grid.classList.remove("revelar-grupo");
		}

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
				/*
				  `targets` is what makes onEnter/onLeave fire at all.

				  Without it, Flip animates only the elements recorded in the
				  captured state — so a card that just appeared is not in it and
				  never gets touched, and the two callbacks below were dead code.
				  Passing the CURRENT cards lets Flip diff the two sets: in both →
				  it moves, only in targets → onEnter, only in the state → onLeave.
				*/
				targets: cards,
				duration: DURACION_NORMAL,
				ease: "salida",
				stagger: 0.03,
				/*
				  NO `absolute: true` here — that's what caused the glitch.

				  It pulls EVERY target out of the flow while the animation runs,
				  entering cards included. An entering card was never in the
				  captured state, so Flip has no coordinates for it, and
				  `position: absolute` with no top/left fell back to the document's
				  top-left corner: the card appeared up beside the page title for
				  ~200 ms and then jumped into the grid.

				  Nothing needs it. Cards that stay reflow correctly on their own
				  (verified in the browser with several listings), and cards that
				  leave are already out of the DOM by the time this runs.
				*/
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
				/*
				  There is no onLeave, and it isn't an oversight: Flip cannot
				  animate one here. It builds its comparison by walking the NEW
				  state (`for (p in toState.idLookup)` in Flip.js), and Svelte has
				  already detached the filtered-out card by the time this runs —
				  a node that isn't there can never be classified as leaving. The
				  onLeave that used to sit here never ran once.

				  Animating the exit would mean keeping filtered-out cards in the
				  DOM until their tween ends, which is a different component. As
				  it stands the card goes and the rest slide into the gap, which
				  is what the filter was asked to do.
				*/
				onComplete: () => {
					cards.forEach((el) => el.classList.remove("flip-animando"));
				},
			});
		});
	});
</script>

<div class="grid gap-8 lg:grid-cols-[16rem_1fr]">
	<aside class="lg:sticky lg:top-24 lg:self-start">
		<div class="border-border bg-card rounded-lg border">
			<div class="flex flex-wrap items-center justify-between gap-2 p-4">
				<h2 class="font-semibold">
					{textos.titulo}
					{#if activos > 0}
						<span class="text-muted-foreground text-xs font-normal">
							· {activos === 1
								? textos.activo
								: textos.activos.replace("{n}", String(activos))}
						</span>
					{/if}
				</h2>

				<div class="flex items-center gap-3">
					{#if hayQueLimpiar}
						<button
							type="button"
							onclick={limpiar}
							class="text-muted-foreground hover:text-foreground aparece text-xs"
						>
							{textos.limpiar}
						</button>
					{/if}

					<!--
						Only below the sidebar breakpoint: a column with room to spare
						has nothing to collapse. The icon morphs between "adjust" and
						"close", which is the state the button actually toggles.
					-->
					<button
						type="button"
						onclick={() => (panelAbierto = !panelAbierto)}
						aria-expanded={panelAbierto}
						aria-controls="panel-filtros"
						class="border-border hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium lg:hidden"
					>
						<MorphIcon
							icon={panelAbierto ? X : SlidersHorizontal}
							size={14}
							reducedMotion={MORPH_REDUCED_MOTION}
						/>
						{panelAbierto ? textos.ocultar : textos.ver}
					</button>
				</div>
			</div>

			<div id="panel-filtros" class="panel-plegable" data-abierto={panelAbierto}>
				<div>
					<div class="space-y-4 px-4 pb-4">
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
			</div>
		</div>
	</aside>

	<div>
		<div class="mb-4 flex flex-wrap items-center gap-2">
			<p class="text-sm font-medium">
				{filtradas.length === 1
					? textos.conteoUno
					: textos.conteo.replace("{n}", String(filtradas.length))}
			</p>

			<!--
				What's applied, right here next to the count. On a phone the panel
				is closed, so otherwise nothing on screen explains why only two
				listings are showing.
			-->
			{#each chips as c (c.id)}
				{#if c.fijo}
					<span
						class="border-border bg-muted text-muted-foreground chip-filtro inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs"
					>
						{c.texto}
					</span>
				{:else}
					<button
						type="button"
						onclick={c.quitar}
						aria-label={textos.quitar.replace("{filtro}", c.texto)}
						class="border-border bg-secondary text-secondary-foreground hover:border-primary/40 hover:text-primary chip-filtro color-animado inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
					>
						{c.texto}
						<svg
							aria-hidden="true"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
						>
							<path d="M18 6 6 18M6 6l12 12" />
						</svg>
					</button>
				{/if}
			{/each}
		</div>

		{#if filtradas.length === 0}
			<div
				class="border-border bg-muted/30 rounded-lg border border-dashed p-10 text-center"
			>
				<p class="font-medium">{textos.sinResultados}</p>
				<p class="text-muted-foreground mt-1 text-sm">{textos.sinResultadosAyuda}</p>
			</div>
		{/if}

		<!--
			The grid stays MOUNTED even with no results — it just renders empty,
			and the message above takes its place visually.

			It used to live in the {:else} of that block, so an empty result
			destroyed the container `bind:this` points at. The next search
			rebuilt a different node while `estadoFlip` still described elements
			from the old one, and Flip animated against a layout that no longer
			existed.

			`relative` matters too: Flip pulls leaving cards out of the flow, and
			an absolutely positioned child needs a positioned ancestor to be
			measured against.

			`.revelar-grupo` gives the first pass down the list a CSS-only
			reveal; the island drops the class the first time a filter changes,
			and from then on Flip owns the grid.
		-->
		<div
			bind:this={grid}
			class="revelar-grupo relative grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
		>
			{#each filtradas as t (t.slug)}
				<TarjetaAnuncio
					tarjeta={t}
					textos={{
						sinFoto: textos.sinFoto,
						consultarPrecio: textos.consultarPrecio,
					}}
				/>
			{/each}
		</div>
	</div>
</div>

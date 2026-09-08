<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { VERTICALES, nuevoFotoId, slugificar, type Vertical } from "@/lib/media/keys";
	import { subirFoto, concurrenciaSegunRed } from "@/lib/estudio/uploader";
	import { asegurarToken } from "@/lib/estudio/session";
	import { r2Url } from "@/lib/media/r2";
	import { MorphIcon } from "morphicons/svelte";
	import { MORPH_REDUCED_MOTION } from "@/lib/motion";
	import { Copy, Check } from "lucide";
	import type { RespuestaResize } from "@/lib/estudio/resize.worker";

	const ETIQUETA_VERTICAL: Record<Vertical, string> = {
		propiedades: "Propiedades",
		vehiculos: "Vehículos",
		bufete: "Fotos del bufete",
	};

	type Estado =
		"pendiente" | "procesando" | "subiendo" | "lista" | "duplicada" | "error";

	interface Item {
		id: string;
		fotoId: string;
		nombre: string;
		estado: Estado;
		progreso: number;
		tallo?: string;
		mensaje?: string;
		miniatura?: string;
		derivadas?: Array<{ ancho: number; blob: Blob }>;
		w?: number;
		h?: number;
		sha256?: string;
	}

	let vertical = $state<Vertical>("propiedades");
	let anuncioTexto = $state("");
	let cola = $state<Item[]>([]);
	let existentes = $state<string[]>([]);
	let cargandoExistentes = $state(false);
	let enLinea = $state(true);
	let copiado = $state<string | null>(null);

	const anuncio = $derived(slugificar(anuncioTexto));
	const listo = $derived(anuncio.length >= 2);
	const subiendo = $derived(
		cola.some((i) => i.estado === "procesando" || i.estado === "subiendo"),
	);
	const terminadas = $derived(
		cola.filter((i) => i.estado === "lista" || i.estado === "duplicada"),
	);

	let worker: Worker | undefined;
	let wakeLock: WakeLockSentinel | null = null;
	const pendientes = new Map<string, (r: RespuestaResize) => void>();

	onMount(() => {
		// Deliberately a RELATIVE path: Vite resolves workers at build time by
		// statically analyzing this literal, and it doesn't understand the "@/" alias.
		worker = new Worker(
			new URL("../../lib/estudio/resize.worker.ts", import.meta.url),
			{ type: "module" },
		);
		worker.onmessage = (e: MessageEvent<RespuestaResize>) => {
			pendientes.get(e.data.id)?.(e.data);
			pendientes.delete(e.data.id);
		};

		enLinea = navigator.onLine;
		const alConectar = () => (enLinea = true);
		const alDesconectar = () => (enLinea = false);
		window.addEventListener("online", alConectar);
		window.addEventListener("offline", alDesconectar);

		void asegurarToken();

		return () => {
			window.removeEventListener("online", alConectar);
			window.removeEventListener("offline", alDesconectar);
		};
	});

	onDestroy(() => {
		worker?.terminate();
		void wakeLock?.release().catch(() => {});
	});

	/* Stops iOS from suspending the tab if she sets the phone down mid-upload. */
	$effect(() => {
		if (subiendo && !wakeLock) {
			navigator.wakeLock
				?.request("screen")
				.then((s) => (wakeLock = s))
				.catch(() => {});
		} else if (!subiendo && wakeLock) {
			void wakeLock.release().catch(() => {});
			wakeLock = null;
		}
	});

	function procesar(archivo: File, id: string): Promise<RespuestaResize> {
		return new Promise((resolve) => {
			pendientes.set(id, resolve);
			worker?.postMessage({ id, archivo });
		});
	}

	async function cargarExistentes() {
		if (!listo) return;
		cargandoExistentes = true;
		try {
			const res = await fetch(
				`/api/media/list?vertical=${vertical}&anuncio=${anuncio}`,
			);
			const d = (await res.json()) as { items?: string[] };
			existentes = d.items ?? [];
		} catch {
			existentes = [];
		} finally {
			cargandoExistentes = false;
		}
	}

	async function agregar(archivos: FileList | File[]) {
		if (!listo) return;

		const nuevos: Item[] = Array.from(archivos)
			.filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name))
			.map((f) => ({
				id: crypto.randomUUID(),
				fotoId: nuevoFotoId(),
				nombre: f.name,
				estado: "pendiente" as Estado,
				progreso: 0,
			}));

		if (nuevos.length === 0) return;
		cola = [...cola, ...nuevos];

		const lista = Array.from(archivos).filter(
			(f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name),
		);
		const limite = concurrenciaSegunRed();

		// Bounded-concurrency queue: process and upload a few at a time.
		let siguiente = 0;
		const trabajadores = Array.from(
			{ length: Math.min(limite, nuevos.length) },
			async () => {
				while (siguiente < nuevos.length) {
					const i = siguiente++;
					await procesarYSubir(nuevos[i], lista[i]);
				}
			},
		);
		await Promise.all(trabajadores);
		await cargarExistentes();
	}

	function actualizar(id: string, cambios: Partial<Item>) {
		cola = cola.map((i) => (i.id === id ? { ...i, ...cambios } : i));
	}

	async function procesarYSubir(item: Item, archivo: File) {
		actualizar(item.id, { estado: "procesando" });

		const res = await procesar(archivo, item.id);

		if (res.error === "decodificar") {
			actualizar(item.id, {
				estado: "error",
				mensaje:
					"No pude leer esta foto. Si es de iPhone: Ajustes → Cámara → Formatos → Más compatible, y volvé a tomarla.",
			});
			return;
		}

		const derivadas = res.derivadas ?? [];
		const mini = derivadas[0]?.blob;
		actualizar(item.id, {
			estado: "subiendo",
			derivadas,
			w: res.w,
			h: res.h,
			sha256: res.sha256,
			miniatura: mini ? URL.createObjectURL(mini) : undefined,
		});

		try {
			const r = await subirFoto(
				{
					vertical,
					anuncio,
					fotoId: item.fotoId,
					derivadas,
					w: res.w ?? 0,
					h: res.h ?? 0,
					sha256: res.sha256 ?? "",
					nombreOriginal: res.nombreOriginal ?? archivo.name,
				},
				(f) => actualizar(item.id, { progreso: f }),
			);
			actualizar(item.id, {
				estado: r.duplicada ? "duplicada" : "lista",
				tallo: r.tallo,
				progreso: 1,
			});
		} catch (err) {
			actualizar(item.id, {
				estado: "error",
				mensaje: (err as Error).message,
			});
		}
	}

	async function copiar(texto: string) {
		try {
			await navigator.clipboard.writeText(texto);
			copiado = texto;
			setTimeout(() => (copiado = null), 2000);
		} catch {
			/* no clipboard permission: it can still be selected by hand */
		}
	}

	function copiarTodas() {
		const rutas = terminadas.map((i) => i.tallo).filter((t): t is string => Boolean(t));
		if (rutas.length) void copiar(rutas.join("\n"));
	}

	async function borrar(tallo: string) {
		if (
			!confirm(`¿Borrar esta foto?\n\n${tallo}\n\nSe puede recuperar durante 30 días.`)
		)
			return;
		await fetch("/api/media/delete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tallo }),
		});
		await cargarExistentes();
	}

	function alSoltar(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer?.files) void agregar(e.dataTransfer.files);
	}
</script>

<div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
	<h1 class="font-serif text-3xl font-bold tracking-tight">Estudio de fotos</h1>
	<p class="text-muted-foreground mt-2">
		Subí las fotos acá y después pegá la ruta en el panel, en la galería del anuncio.
	</p>

	{#if !enLinea}
		<p
			class="border-warning bg-warning/10 text-warning-foreground mt-4 rounded-lg border px-4 py-3 text-sm"
		>
			Sin conexión. Esperá a tener señal para seguir subiendo.
		</p>
	{/if}

	<!-- 1. Where do they go -->
	<section class="border-border bg-card mt-8 rounded-xl border p-5">
		<h2 class="font-semibold">1. ¿A qué anuncio pertenecen?</h2>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<label class="block">
				<span class="text-sm font-medium">Sección</span>
				<select
					bind:value={vertical}
					onchange={cargarExistentes}
					class="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
				>
					{#each VERTICALES as v (v)}
						<option value={v}>{ETIQUETA_VERTICAL[v]}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="text-sm font-medium">Nombre del anuncio</span>
				<input
					type="text"
					bind:value={anuncioTexto}
					onblur={cargarExistentes}
					placeholder="Casa en Santa Tecla 3 habitaciones"
					class="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
				/>
			</label>
		</div>

		{#if anuncioTexto}
			<p class="text-muted-foreground mt-3 text-xs">
				Carpeta: <code class="bg-muted rounded px-1.5 py-0.5"
					>media/{vertical}/{anuncio || "…"}</code
				>
			</p>
		{/if}
	</section>

	<!-- 2. Upload -->
	<section class="mt-6">
		<h2 class="font-semibold">2. Subí las fotos</h2>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			ondragover={(e) => e.preventDefault()}
			ondrop={alSoltar}
			class="border-border mt-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors"
			class:opacity-50={!listo}
		>
			<p class="text-muted-foreground text-sm">
				{listo
					? "Arrastrá las fotos acá, o tocá para elegirlas."
					: "Primero escribí el nombre del anuncio."}
			</p>
			<label class="mt-4 inline-block">
				<input
					type="file"
					multiple
					accept="image/*"
					disabled={!listo}
					class="sr-only"
					onchange={(e) => {
						const t = e.currentTarget;
						if (t.files) void agregar(t.files);
						t.value = "";
					}}
				/>
				<span
					class="bg-primary text-primary-foreground inline-flex cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-medium"
					class:pointer-events-none={!listo}
				>
					Elegir fotos
				</span>
			</label>
		</div>
	</section>

	<!-- Queue -->
	{#if cola.length > 0}
		<section class="mt-6">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">
					Subiendo ({terminadas.length}/{cola.length})
				</h2>
				{#if terminadas.length > 0}
					<button
						type="button"
						onclick={copiarTodas}
						class="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-sm"
					>
						Copiar todas las rutas
					</button>
				{/if}
			</div>

			<ul class="mt-3 space-y-2">
				{#each cola as item (item.id)}
					<li
						class="border-border bg-card flex items-center gap-3 rounded-lg border p-3"
					>
						{#if item.miniatura}
							<img
								src={item.miniatura}
								alt=""
								class="bg-muted size-12 shrink-0 rounded object-cover"
							/>
						{:else}
							<div class="bg-muted size-12 shrink-0 rounded"></div>
						{/if}

						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{item.nombre}</p>

							{#if item.estado === "procesando"}
								<p class="text-muted-foreground text-xs">Preparando…</p>
							{:else if item.estado === "subiendo"}
								<div class="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
									<div
										class="bg-primary h-full transition-all"
										style={`width:${Math.round(item.progreso * 100)}%`}
									></div>
								</div>
							{:else if item.estado === "error"}
								<p class="text-destructive text-xs">{item.mensaje}</p>
							{:else if item.tallo}
								<code class="text-muted-foreground block truncate text-xs">
									{item.tallo}
								</code>
							{/if}
						</div>

						{#if item.estado === "lista" || item.estado === "duplicada"}
							<button
								type="button"
								onclick={() => item.tallo && copiar(item.tallo)}
								class="border-border hover:bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors"
							>
								<!-- The icon confirms the copy without needing to read anything. -->
								<MorphIcon
									icon={copiado === item.tallo ? Check : Copy}
									size={14}
									reducedMotion={MORPH_REDUCED_MOTION}
								/>
								{copiado === item.tallo ? "¡Copiada!" : "Copiar"}
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Already uploaded -->
	{#if listo}
		<section class="mt-10">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">Fotos de este anuncio</h2>
				<button
					type="button"
					onclick={cargarExistentes}
					class="text-muted-foreground hover:text-foreground text-sm"
				>
					Actualizar
				</button>
			</div>

			{#if cargandoExistentes}
				<p class="text-muted-foreground mt-3 text-sm">Cargando…</p>
			{:else if existentes.length === 0}
				<p class="text-muted-foreground mt-3 text-sm">
					Todavía no hay fotos en este anuncio.
				</p>
			{:else}
				<ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{#each existentes as tallo (tallo)}
						<li class="border-border bg-card overflow-hidden rounded-lg border">
							<img
								src={r2Url(tallo, 240)}
								alt=""
								loading="lazy"
								class="bg-muted aspect-square w-full object-cover"
							/>
							<div class="flex gap-1 p-2">
								<button
									type="button"
									onclick={() => copiar(tallo)}
									class="border-border hover:bg-muted inline-flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
								>
									<MorphIcon
										icon={copiado === tallo ? Check : Copy}
										size={12}
										reducedMotion={MORPH_REDUCED_MOTION}
									/>
									{copiado === tallo ? "¡Copiada!" : "Copiar"}
								</button>
								<button
									type="button"
									onclick={() => borrar(tallo)}
									class="text-destructive hover:bg-destructive/10 rounded px-2 py-1 text-xs"
									aria-label="Borrar foto"
								>
									Borrar
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	<!-- 3. What to do next -->
	<section class="border-border bg-muted/30 mt-10 rounded-xl border p-5">
		<h2 class="font-semibold">3. Ahora pegá las rutas en el panel</h2>
		<ol class="text-muted-foreground mt-3 list-decimal space-y-1 pl-5 text-sm">
			<li>Abrí el panel y entrá al anuncio.</li>
			<li>En «Galería de fotos», tocá «Añadir».</li>
			<li>Pegá la ruta que copiaste y escribí de qué es la foto.</li>
		</ol>
		<a
			href="/keystatic"
			target="_blank"
			rel="noopener"
			class="text-primary mt-3 inline-block text-sm hover:underline"
		>
			Abrir el panel →
		</a>
	</section>
</div>

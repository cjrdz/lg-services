import { getCollection, type CollectionEntry } from "astro:content";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { etiqueta } from "@/i18n/enums";
import { departamentoNombre, distritoNombre } from "./geo/el-salvador";
import type { TarjetaAnuncio } from "./anuncios-tipos";

// Re-exported so pages import everything from one place.
export * from "./anuncios-tipos";

function normalizar(texto: string): string {
	return texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

/* ---------------------------------------------------------------- */
/* Properties                                                        */
/* ---------------------------------------------------------------- */

export type Propiedad = CollectionEntry<"propiedades">;

const mostrarBorradores = import.meta.env.DEV;

function ordenar<T extends { data: { orden: number } }>(
	items: T[],
	fecha: (x: T) => number,
): T[] {
	return items.sort((a, b) => {
		if (a.data.orden !== b.data.orden) return a.data.orden - b.data.orden;
		return fecha(b) - fecha(a);
	});
}

export async function getPropiedades() {
	const todas = await getCollection(
		"propiedades",
		({ data }) => mostrarBorradores || !data.borrador,
	);
	return ordenar(todas, (p) => p.data.publicada.valueOf());
}

export function propiedadATarjeta(
	p: Propiedad,
	locale: Locale = DEFAULT_LOCALE,
	base = "/propiedades/inmueble/",
): TarjetaAnuncio {
	const d = p.data;
	const portada = d.fotos[d.portada] ?? d.fotos[0];
	const dep = departamentoNombre(d.ubicacion.departamento);
	const dis = distritoNombre(d.ubicacion.departamento, d.ubicacion.distrito);
	const disponible = d.estado === "disponible" || d.estado === "reservado";

	const datos = [
		d.habitaciones !== undefined ? `${d.habitaciones} hab` : null,
		d.banos !== undefined ? `${d.banos} baños` : null,
		`${d.superficie.valor} ${etiqueta("unidadSuperficie", d.superficie.unidad, locale)}`,
	].filter((x): x is string => x !== null);

	return {
		slug: p.id,
		ref: d.referencia,
		href: `${base}${p.id}/`,
		titulo: d.titulo,
		subtitulo: `${dis}, ${dep}`,
		foto: portada?.ruta ?? "",
		alt: portada?.alt ?? d.titulo,
		precio: d.precio,
		periodoTexto: d.periodoPrecio === "mensual" ? "/ mes" : "",
		ocultarPrecio: d.ocultarPrecio,
		insignia:
			d.estado === "disponible"
				? undefined
				: etiqueta("estadoPropiedad", d.estado, locale),
		disponible,
		datos,
		ts: d.publicada.valueOf(),
		destacado: d.destacada,
		orden: d.orden,
		q: normalizar(
			[
				d.titulo,
				d.descripcionCorta,
				dis,
				dep,
				d.ubicacion.zona ?? "",
				etiqueta("tipoPropiedad", d.tipo, locale),
				etiqueta("operacion", d.operacion, locale),
				...d.amenidades.map((a) => etiqueta("amenidad", a, locale)),
				d.referencia,
			].join(" "),
		),
		facetas: {
			op: d.operacion,
			tipo: d.tipo,
			dep: d.ubicacion.departamento,
		},
		numeros: {
			precio: d.precio,
			hab: d.habitaciones ?? 0,
			area: d.superficie.valor,
		},
	};
}

export async function getTarjetasPropiedades(locale: Locale = DEFAULT_LOCALE) {
	return (await getPropiedades()).map((p) => propiedadATarjeta(p, locale));
}

/* ---------------------------------------------------------------- */
/* Vehicles                                                          */
/* ---------------------------------------------------------------- */

export type Vehiculo = CollectionEntry<"vehiculos">;

export async function getVehiculos() {
	const todos = await getCollection(
		"vehiculos",
		({ data }) => mostrarBorradores || !data.borrador,
	);
	return ordenar(todos, (v) => v.data.publicado.valueOf());
}

export function vehiculoATarjeta(
	v: Vehiculo,
	locale: Locale = DEFAULT_LOCALE,
	base = "/vehiculos/alquiler/",
): TarjetaAnuncio {
	const d = v.data;
	const portada = d.fotos[d.portada] ?? d.fotos[0];
	const disponible = d.disponibilidad === "disponible";

	const datos = [
		`${d.pasajeros} pasajeros`,
		etiqueta("transmision", d.transmision, locale),
		etiqueta("combustible", d.combustible, locale),
	];

	return {
		slug: v.id,
		ref: d.referencia,
		href: `${base}${v.id}/`,
		titulo: d.titulo,
		// The spec sheet plays the role of "location" here — it's what identifies a vehicle.
		subtitulo: `${d.marca} ${d.modelo} · ${d.anio} · ${etiqueta("categoriaVehiculo", d.categoria, locale)}`,
		foto: portada?.ruta ?? "",
		alt: portada?.alt ?? d.titulo,
		precio: d.tarifaDiaria,
		periodoTexto: "por día",
		ocultarPrecio: false,
		insignia: disponible
			? undefined
			: etiqueta("disponibilidadVehiculo", d.disponibilidad, locale),
		disponible,
		datos,
		ts: d.publicado.valueOf(),
		destacado: d.destacado,
		orden: d.orden,
		q: normalizar(
			[
				d.titulo,
				d.descripcionCorta,
				d.marca,
				d.modelo,
				String(d.anio),
				etiqueta("categoriaVehiculo", d.categoria, locale),
				etiqueta("transmision", d.transmision, locale),
				etiqueta("combustible", d.combustible, locale),
				...d.entrega.map((e) => departamentoNombre(e)),
				d.referencia,
			].join(" "),
		),
		facetas: {
			categoria: d.categoria,
			transmision: d.transmision,
			combustible: d.combustible,
			// Filters by the FIRST delivery departamento; free-text search
			// covers the rest.
			dep: d.entrega[0] ?? "",
		},
		numeros: {
			precio: d.tarifaDiaria,
			pasajeros: d.pasajeros,
			anio: d.anio,
		},
	};
}

export async function getTarjetasVehiculos(locale: Locale = DEFAULT_LOCALE) {
	return (await getVehiculos()).map((v) => vehiculoATarjeta(v, locale));
}

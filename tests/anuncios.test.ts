import { describe, expect, it } from "vitest";
import {
	filtrosPropiedades,
	filtrosVehiculos,
	ordenesPropiedades,
	ordenesVehiculos,
	type DescriptorFiltro,
	type TarjetaAnuncio,
} from "@/lib/anuncios-tipos";

/*
  La isla de filtros es COMPARTIDA por propiedades y vehículos. Estas pruebas
  fijan el contrato entre ambas: si una sección empieza a describir sus filtros
  de otra forma, el componente común deja de servirle y aparece la tentación de
  forkearlo — que es justo lo que se quiso evitar.
*/

const t = (k: string) => k;

const OPC = [{ value: "a", label: "A" }];

describe("descriptores de filtro", () => {
	const props = filtrosPropiedades(t, {
		operacion: OPC,
		tipo: OPC,
		departamento: OPC,
	});
	const vehs = filtrosVehiculos(t, {
		categoria: OPC,
		transmision: OPC,
		combustible: OPC,
	});

	it("ambas secciones producen descriptores con la misma forma", () => {
		for (const lista of [props, vehs]) {
			for (const f of lista) {
				expect(f.clave).toBeTruthy();
				expect(f.campo).toBeTruthy();
				expect(["select", "max", "min"]).toContain(f.tipo);
				if (f.tipo === "select") expect(Array.isArray(f.opciones)).toBe(true);
			}
		}
	});

	it("no repiten claves dentro de una sección (colisionarían en la URL)", () => {
		for (const lista of [props, vehs]) {
			const claves = lista.map((f) => f.clave);
			expect(new Set(claves).size).toBe(claves.length);
		}
	});

	it("las dos usan `max` sobre `precio`, que es el filtro común", () => {
		const precioDe = (l: DescriptorFiltro[]) =>
			l.find((f) => f.campo === "precio" && f.tipo === "max");
		expect(precioDe(props)).toBeDefined();
		expect(precioDe(vehs)).toBeDefined();
	});
});

describe("descriptores de orden", () => {
	it("el primero es el predeterminado y ordena por fecha", () => {
		for (const lista of [ordenesPropiedades(t), ordenesVehiculos(t)]) {
			expect(lista[0].clave).toBe("recientes");
			// Sin `campo` la isla ordena por `ts` (fecha de publicación).
			expect(lista[0].campo).toBeUndefined();
			expect(lista[0].direccion).toBe("desc");
		}
	});

	it("todo orden con campo apunta a un número, no a texto", () => {
		for (const lista of [ordenesPropiedades(t), ordenesVehiculos(t)]) {
			for (const o of lista) {
				if (o.campo) expect(["precio", "area", "anio"]).toContain(o.campo);
				expect(["asc", "desc"]).toContain(o.direccion);
			}
		}
	});
});

describe("forma de TarjetaAnuncio", () => {
	it("los campos por los que filtra la isla existen en las dos secciones", () => {
		// Contrato mínimo: lo que los descriptores miran tiene que estar en la tarjeta.
		const camposProps = filtrosPropiedades(t, {
			operacion: OPC,
			tipo: OPC,
			departamento: OPC,
		});
		const camposVehs = filtrosVehiculos(t, {
			categoria: OPC,
			transmision: OPC,
			combustible: OPC,
		});

		const tarjetaProp: Pick<TarjetaAnuncio, "facetas" | "numeros"> = {
			facetas: { op: "venta", tipo: "casa", dep: "la-libertad" },
			numeros: { precio: 1, hab: 1, area: 1 },
		};
		const tarjetaVeh: Pick<TarjetaAnuncio, "facetas" | "numeros"> = {
			facetas: {
				categoria: "suv",
				transmision: "automatica",
				combustible: "gasolina",
				dep: "",
			},
			numeros: { precio: 1, pasajeros: 1, anio: 1 },
		};

		for (const [filtros, tarjeta] of [
			[camposProps, tarjetaProp],
			[camposVehs, tarjetaVeh],
		] as const) {
			for (const f of filtros) {
				const donde = f.tipo === "select" ? tarjeta.facetas : tarjeta.numeros;
				expect(donde, `falta "${f.campo}" para el filtro "${f.clave}"`).toHaveProperty(
					f.campo,
				);
			}
		}
	});
});

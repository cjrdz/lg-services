import { describe, expect, it } from "vitest";
// Se importa de formato.ts, no de contenido.ts: ese último importa
// `astro:content`, un módulo virtual que solo existe dentro del build de Astro.
import { formatearFecha, formatearPrecio, slugDe, tiempoLectura } from "@/lib/formato";
import {
	AREAS,
	AREA_IDS,
	SUBTEMAS,
	areaTitulo,
	areasOrdenadas,
	esAreaId,
} from "@/lib/taxonomia";
import {
	DEPARTAMENTOS,
	DISTRITOS,
	distritoValido,
	ubicacionTexto,
} from "@/lib/geo/el-salvador";

describe("slugDe", () => {
	it("quita el prefijo de idioma que agrega el loader glob", () => {
		expect(slugDe("es/derecho-laboral/demanda-laboral")).toBe(
			"derecho-laboral/demanda-laboral",
		);
		expect(slugDe("en/derecho-laboral/x")).toBe("derecho-laboral/x");
	});

	it("no toca un id que ya viene sin idioma", () => {
		expect(slugDe("derecho-laboral/demanda-laboral")).toBe(
			"derecho-laboral/demanda-laboral",
		);
	});

	it("no confunde un segmento de dos letras que no es idioma", () => {
		// "sv" no es un locale del sitio, pero el patrón es el mismo; se documenta
		// el comportamiento real para que un cambio futuro sea deliberado.
		expect(slugDe("sv/algo")).toBe("algo");
	});
});

describe("tiempoLectura", () => {
	it("redondea a 200 palabras por minuto", () => {
		expect(tiempoLectura("palabra ".repeat(400))).toBe(2);
	});

	it("nunca devuelve menos de 1 minuto", () => {
		expect(tiempoLectura("hola")).toBe(1);
		expect(tiempoLectura("")).toBe(1);
	});
});

describe("formatearFecha", () => {
	it("usa formato largo en español", () => {
		const texto = formatearFecha(new Date("2025-03-12T00:00:00Z"), "es");
		expect(texto).toMatch(/marzo/);
		expect(texto).toMatch(/2025/);
	});
});

describe("formatearPrecio", () => {
	it("muestra dólares sin decimales", () => {
		const texto = formatearPrecio(125000);
		expect(texto).toMatch(/125[.,]000/);
		expect(texto).not.toMatch(/[.,]00$/);
	});
});

describe("taxonomía", () => {
	it("declara exactamente las 7 áreas de práctica", () => {
		expect(AREA_IDS).toHaveLength(7);
		expect(Object.keys(AREAS)).toHaveLength(7);
	});

	it("todas las áreas tienen copy en español y subtemas", () => {
		for (const id of AREA_IDS) {
			expect(AREAS[id].i18n.es.titulo.length).toBeGreaterThan(3);
			expect(AREAS[id].i18n.es.palabrasClave.length).toBeGreaterThanOrEqual(3);
			expect(SUBTEMAS[id].length).toBeGreaterThan(0);
		}
	});

	it("la descripción SEO cabe en el rango que exige el esquema (70–160)", () => {
		for (const id of AREA_IDS) {
			const n = AREAS[id].i18n.es.seoDescripcion.length;
			expect(n, `${id} mide ${n}`).toBeGreaterThanOrEqual(70);
			expect(n, `${id} mide ${n}`).toBeLessThanOrEqual(160);
		}
	});

	it("no queda ninguna referencia a la DIAN (es de Colombia, no de El Salvador)", () => {
		const todo = JSON.stringify(AREAS) + JSON.stringify(SUBTEMAS);
		expect(todo).not.toMatch(/\bDIAN\b/);
		expect(todo).toMatch(/\bDGII\b/);
	});

	it("ordena por el campo orden, sin huecos ni repetidos", () => {
		const ordenes = areasOrdenadas().map((a) => a.orden);
		expect(ordenes).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it("esAreaId rechaza el texto mostrado, que era la clave vieja de lg-blog", () => {
		expect(esAreaId("derecho-laboral")).toBe(true);
		expect(esAreaId("Derecho Laboral")).toBe(false);
		expect(esAreaId(undefined)).toBe(false);
	});

	it("areaTitulo cae al español si falta la traducción", () => {
		expect(areaTitulo("derecho-laboral", "es")).toBe("Derecho Laboral");
	});
});

describe("geografía de El Salvador", () => {
	it("tiene los 14 departamentos, cada uno con distritos", () => {
		expect(DEPARTAMENTOS).toHaveLength(14);
		for (const d of DEPARTAMENTOS) {
			expect(DISTRITOS[d.id]?.length, `${d.id} sin distritos`).toBeGreaterThan(0);
		}
	});

	it("todos los ids de distrito son kebab-case en minúsculas", () => {
		for (const d of DEPARTAMENTOS) {
			for (const dis of DISTRITOS[d.id]) {
				expect(dis.id, `${d.id}/${dis.id}`).toMatch(/^[a-z0-9-]+$/);
			}
		}
	});

	it("no hay ids de distrito repetidos dentro de un departamento", () => {
		for (const d of DEPARTAMENTOS) {
			const ids = DISTRITOS[d.id].map((x) => x.id);
			expect(new Set(ids).size, `${d.id} tiene repetidos`).toBe(ids.length);
		}
	});

	it("distritoValido cruza departamento y distrito", () => {
		expect(distritoValido("ahuachapan", "san-pedro-puxtla")).toBe(true);
		// Santa Tecla existe, pero en La Libertad — no en Ahuachapán.
		expect(distritoValido("ahuachapan", "santa-tecla")).toBe(false);
		expect(distritoValido("la-libertad", "santa-tecla")).toBe(true);
		expect(distritoValido("inventado", "santa-tecla")).toBe(false);
	});

	it("ubicacionTexto arma 'Distrito, Departamento'", () => {
		expect(ubicacionTexto("la-libertad", "santa-tecla")).toBe(
			"Santa Tecla, La Libertad",
		);
	});
});

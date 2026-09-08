import { describe, expect, it } from "vitest";
import {
	ANCHOS,
	VERTICALES,
	claveBasura,
	construirClave,
	construirTallo,
	esFotoId,
	esSlug,
	esTallo,
	esVertical,
	nuevoFotoId,
	partirTallo,
	slugificar,
} from "@/lib/media/keys";

/*
  Este módulo es el contrato compartido entre CUATRO consumidores: el subidor
  del navegador, las rutas de API, el esquema de zod y la validación de
  Keystatic. Si se desalinean, ella sube fotos que el sitio no encuentra.
*/

describe("slugificar", () => {
	it("quita tildes, que es lo que rompe una URL", () => {
		expect(slugificar("Casa en Santa Tecla con jardín")).toBe(
			"casa-en-santa-tecla-con-jardin",
		);
		expect(slugificar("Añejo Cañón")).toBe("anejo-canon");
	});

	it("colapsa separadores y no deja guiones en los bordes", () => {
		expect(slugificar("  Terreno   800 v² — La Libertad  ")).toBe(
			"terreno-800-v-la-libertad",
		);
	});

	it("lo que produce siempre pasa esSlug", () => {
		for (const t of [
			"Toyota RAV4 2022",
			"Casa #3, Col. Escalón",
			"Apartamento 2H / 2B",
		]) {
			expect(esSlug(slugificar(t)), t).toBe(true);
		}
	});

	it("recorta a 80 caracteres", () => {
		expect(slugificar("a".repeat(200)).length).toBe(80);
	});
});

describe("nuevoFotoId", () => {
	it("son 8 caracteres base36", () => {
		for (let i = 0; i < 50; i++) {
			const id = nuevoFotoId();
			expect(id).toHaveLength(8);
			expect(esFotoId(id), id).toBe(true);
		}
	});

	it("no repite en 500 intentos", () => {
		const vistos = new Set(Array.from({ length: 500 }, nuevoFotoId));
		expect(vistos.size).toBe(500);
	});
});

describe("tallos", () => {
	it("construir y partir son inversos", () => {
		const tallo = construirTallo("propiedades", "casa-santa-tecla-3h", "k7x2f9a1");
		expect(tallo).toBe("media/propiedades/casa-santa-tecla-3h/k7x2f9a1");
		expect(esTallo(tallo)).toBe(true);
		expect(partirTallo(tallo)).toEqual({
			vertical: "propiedades",
			anuncio: "casa-santa-tecla-3h",
			fotoId: "k7x2f9a1",
		});
	});

	it("todo lo que genera el subidor es un tallo válido", () => {
		for (const v of VERTICALES) {
			const tallo = construirTallo(v, slugificar("Anuncio de Prueba ñ"), nuevoFotoId());
			expect(esTallo(tallo), tallo).toBe(true);
		}
	});

	it("RECHAZA la URL completa, que es el error más probable al pegar", () => {
		expect(
			esTallo(
				"https://cdn.lisbethgutierrez.com/media/propiedades/casa-x/k7x2f9a1/960.webp",
			),
		).toBe(false);
		expect(esTallo("media/propiedades/casa-x/k7x2f9a1/960.webp")).toBe(false);
	});

	it("rechaza vertical desconocida, id de largo incorrecto y mayúsculas", () => {
		expect(esTallo("media/inventada/casa-x/k7x2f9a1")).toBe(false);
		expect(esTallo("media/propiedades/casa-x/k7x2f9")).toBe(false);
		expect(esTallo("media/propiedades/casa-x/k7x2f9a12")).toBe(false);
		expect(esTallo("media/propiedades/Casa-X/k7x2f9a1")).toBe(false);
		expect(esTallo("media/propiedades//k7x2f9a1")).toBe(false);
	});

	it("partirTallo devuelve null si no tiene la forma esperada", () => {
		expect(partirTallo("cualquier/cosa")).toBeNull();
	});
});

describe("claves", () => {
	it("agrega ancho y extensión al tallo", () => {
		const tallo = "media/propiedades/casa-x/k7x2f9a1";
		expect(construirClave(tallo, 960)).toBe(`${tallo}/960.webp`);
	});

	it("los anchos van de menor a mayor y sin repetidos", () => {
		expect([...ANCHOS]).toEqual([...ANCHOS].sort((a, b) => a - b));
		expect(new Set(ANCHOS).size).toBe(ANCHOS.length);
	});

	it("la papelera va por fecha, conservando la clave original", () => {
		const clave = "media/propiedades/casa-x/k7x2f9a1/960.webp";
		expect(claveBasura(clave, new Date("2026-03-12T10:00:00Z"))).toBe(
			`trash/2026-03-12/${clave}`,
		);
	});
});

describe("esVertical", () => {
	it("acepta solo las tres verticales reales", () => {
		expect(esVertical("propiedades")).toBe(true);
		expect(esVertical("vehiculos")).toBe(true);
		expect(esVertical("bufete")).toBe(true);
		expect(esVertical("terrenos")).toBe(false);
		expect(esVertical(undefined)).toBe(false);
	});
});

describe("r2Url sin bucket configurado", () => {
	/*
	  Regresión de un bug real: con PUBLIC_MEDIA_BASE_URL sin configurar,
	  r2Url() devolvía algo como "PENDIENTE-.../media/.../960.webp" y las
	  tarjetas emitían <img src="">. Un src vacío NO es "una imagen en blanco":
	  el navegador lo resuelve contra la URL del documento y vuelve a pedir la
	  página entera. Se veía como que el listado no cargaba.

	  El contrato ahora es: sin bucket válido, r2Url devuelve "" y quien la use
	  NO debe emitir un <img>.
	*/
	it("nunca devuelve una URL a medias para un tallo de R2", async () => {
		const { r2Url, r2Srcset, MEDIA_CONFIGURADO } = await import("@/lib/media/r2");
		const tallo = "media/propiedades/casa-x/k7x2f9a1";
		const url = r2Url(tallo, 960);

		if (MEDIA_CONFIGURADO) {
			expect(url).toMatch(/^https?:\/\/.+\/960\.webp$/);
		} else {
			expect(url).toBe("");
			expect(r2Srcset(tallo, [240, 480])).toBe("");
		}
	});

	it("deja pasar las URLs absolutas y las rutas del sitio", async () => {
		const { r2Url } = await import("@/lib/media/r2");
		expect(r2Url("https://ejemplo.com/foto.jpg", 960)).toBe(
			"https://ejemplo.com/foto.jpg",
		);
		expect(r2Url("images/perfil.jpg", 960)).toBe("/images/perfil.jpg");
		expect(r2Url("", 960)).toBe("");
	});
});

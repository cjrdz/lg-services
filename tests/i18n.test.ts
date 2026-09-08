import { describe, expect, it } from "vitest";
import { useTranslations } from "@/i18n";

describe("t()", () => {
	it("resuelve claves e interpola variables", () => {
		const t = useTranslations("es");
		expect(t("nav.contacto")).toBe("Contacto");
		expect(t("propiedades.habitaciones", { n: 3 })).toBe("3 hab.");
	});

	it("revienta ante una clave inexistente en desarrollo", () => {
		const t = useTranslations("es");
		// @ts-expect-error clave inventada: debe fallar en tipos Y en runtime
		expect(() => t("nav.noExiste")).toThrow(/Missing key/);
	});
});

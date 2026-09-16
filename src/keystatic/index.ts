import { config } from "@keystatic/core";
import { createElement } from "react";

import { blog } from "./collections/blog";
import { paginas } from "./collections/paginas";
import { propiedades } from "./collections/propiedades";
import { servicios } from "./collections/servicios";
import { vehiculos } from "./collections/vehiculos";
import { configuracion } from "./singletons/configuracion";
import { contacto } from "./singletons/contacto";
import { inicio } from "./singletons/inicio";

const esDev = process.env.NODE_ENV === "development";

/**
 * Lisbeth's admin panel.
 *
 * DESIGN PRINCIPLE: she must never be able to save something that breaks the
 * site. In practice:
 *   · Every closed set is a `select`, never free text.
 *   · Every field has a Spanish `description` with a concrete example.
 *   · Slugs derive from the title; she's never asked to type kebab-case.
 *   · Whatever doesn't apply is hidden (fields.conditional).
 *   · Whatever still slips through is caught by zod at build time, so the
 *     previous deploy stays live. See src/content.config.ts.
 *
 * Field `label`/`description` strings below are in Spanish on purpose —
 * they're what Lisbeth reads in the panel.
 */
export default config({
	// Writes to disk in dev; commits to GitHub in production — that's what
	// lets her publish without ever touching git.
	storage: esDev
		? { kind: "local" }
		: { kind: "github", repo: { owner: "cjrdz", name: "lg-services" } },

	ui: {
		brand: {
			name: "Panel de Lisbeth",
			mark: () =>
				createElement("img", {
					src: "/icon.png",
					alt: "",
					// icon.png is 346×445 (not square) — fixed height, proportional
					// width, so the "G" mark doesn't get squished into a square box.
					width: 19,
					height: 24,
				}),
		},
		navigation: {
			Sitio: ["inicio", "contacto", "configuracion"],
			"Servicios legales": ["servicios"],
			Propiedades: ["propiedades"],
			Vehículos: ["vehiculos"],
			Blog: ["blog"],
			Legales: ["paginas"],
		},
	},

	singletons: {
		inicio,
		contacto,
		configuracion,
	},

	collections: {
		paginas,
		propiedades,
		vehiculos,
		servicios,
		blog,
	},
});

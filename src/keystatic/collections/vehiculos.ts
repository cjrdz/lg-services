import { collection, fields } from "@keystatic/core";

import { opciones } from "../../i18n/enums";
import { DEPARTAMENTOS } from "../../lib/geo/el-salvador";
import { campoFotos, campoSeo } from "../shared/fields";

/**
 * Vehicle rental listings collection.
 *
 * Same shape as properties but tailored to cars: rates, mileage, delivery
 * area and requirements.
 */
export const vehiculos = collection({
	label: "Vehículos",
	path: "src/content/vehiculos/*",
	slugField: "referencia",
	entryLayout: "form",
	format: { data: "json" },
	previewUrl: "/vehiculos/alquiler/{slug}/",
	columns: ["referencia", "marca", "modelo", "anio", "tarifaDiaria", "borrador"],
	schema: {
		referencia: fields.slug({
			name: {
				label: "Código del vehículo",
				description:
					"Formato V-0001. Sirve para que un cliente te lo mencione por teléfono o WhatsApp.",
				validation: {
					isRequired: true,
					pattern: { regex: /^V-\d{4}$/, message: "Usá el formato V-0001" },
				},
			},
			slug: {
				label: "Dirección web",
				description: 'Poné algo descriptivo: "toyota-rav4-2022".',
				validation: {
					pattern: {
						regex: /^[a-z0-9-]+$/,
						message: "Solo minúsculas, números y guiones.",
					},
				},
			},
		}),

		marca: fields.text({
			label: "Marca",
			description: "Ejemplo: Toyota, Nissan, Kia.",
			validation: { isRequired: true, length: { min: 2 } },
		}),
		modelo: fields.text({
			label: "Modelo",
			description: "Ejemplo: RAV4, Frontier.",
			validation: { isRequired: true },
		}),
		anio: fields.integer({
			label: "Año",
			defaultValue: new Date().getFullYear(),
			validation: {
				isRequired: true,
				min: 1990,
				max: new Date().getFullYear() + 1,
			},
		}),
		categoria: fields.select({
			label: "Tipo de vehículo",
			options: opciones("categoriaVehiculo"),
			defaultValue: "sedan",
		}),
		transmision: fields.select({
			label: "Transmisión",
			options: opciones("transmision"),
			defaultValue: "automatica",
		}),
		combustible: fields.select({
			label: "Combustible",
			options: opciones("combustible"),
			defaultValue: "gasolina",
		}),
		traccion: fields.select({
			label: "Tracción",
			options: opciones("traccion"),
			defaultValue: "4x2",
		}),
		pasajeros: fields.integer({
			label: "Pasajeros",
			defaultValue: 5,
			validation: { isRequired: true, min: 2, max: 30 },
		}),
		puertas: fields.integer({
			label: "Puertas",
			defaultValue: 4,
			validation: { isRequired: true, min: 2, max: 6 },
		}),
		maletas: fields.integer({
			label: "Maletas grandes que caben",
			defaultValue: 2,
			validation: { isRequired: true, min: 0, max: 10 },
		}),
		aireAcondicionado: fields.checkbox({
			label: "Aire acondicionado",
			defaultValue: true,
		}),

		tarifaDiaria: fields.number({
			label: "Tarifa por día (US$)",
			description: "Solo el número. Ejemplo: 45",
			validation: { isRequired: true, min: 1 },
		}),
		tarifaSemanal: fields.number({
			label: "Tarifa por semana (US$)",
			description:
				"Opcional, pero tiene que ser MENOR que 7 días sueltos — si no, el sitio no publica.",
			validation: { isRequired: false, min: 1 },
		}),
		tarifaMensual: fields.number({
			label: "Tarifa por mes (US$)",
			description: "Opcional. Menor que 30 días sueltos.",
			validation: { isRequired: false, min: 1 },
		}),
		deposito: fields.number({
			label: "Depósito de garantía (US$)",
			defaultValue: 0,
			validation: { isRequired: true, min: 0 },
		}),

		kilometraje: fields.select({
			label: "Kilometraje",
			options: [
				{ label: "Ilimitado", value: "ilimitado" },
				{ label: "Limitado por día", value: "limitado" },
			],
			defaultValue: "ilimitado",
		}),
		kmIncluidosPorDia: fields.integer({
			label: "Km incluidos por día",
			description: 'Solo si arriba elegiste "Limitado por día". Si no, dejalo vacío.',
			validation: { isRequired: false, min: 1 },
		}),
		edadMinima: fields.integer({
			label: "Edad mínima del conductor",
			defaultValue: 23,
			validation: { isRequired: true, min: 18, max: 30 },
		}),
		requisitos: fields.array(fields.text({ label: "Requisito" }), {
			label: "Requisitos para alquilar",
			itemLabel: (p) => p.value || "Requisito",
			validation: { length: { min: 1 } },
		}),

		disponibilidad: fields.select({
			label: "Disponibilidad",
			options: opciones("disponibilidadVehiculo"),
			defaultValue: "disponible",
		}),
		entrega: fields.multiselect({
			label: "Departamentos donde lo entregás",
			options: DEPARTAMENTOS.map((d) => ({ label: d.nombre, value: d.id })),
			defaultValue: ["san-salvador"],
		}),

		fotos: campoFotos("vehiculos"),
		portada: fields.integer({
			label: "¿Cuál es la foto principal?",
			description:
				"0 = la primera de la galería, 1 = la segunda, y así. Es la que se ve en el listado.",
			defaultValue: 0,
			validation: { isRequired: true, min: 0 },
		}),

		titulo: fields.text({
			label: "Título del anuncio",
			description: 'Ejemplo: "Toyota RAV4 2022 automática, ideal para carretera".',
			validation: { isRequired: true, length: { min: 10, max: 90 } },
		}),
		descripcionCorta: fields.text({
			label: "Resumen (se ve en el listado)",
			multiline: true,
			description: "Una o dos frases. Entre 40 y 200 caracteres.",
			validation: { isRequired: true, length: { min: 40, max: 200 } },
		}),
		descripcion: fields.text({
			label: "Descripción completa",
			multiline: true,
			description:
				"Estado del vehículo, equipamiento, para qué sirve mejor, condiciones. Dejá una línea en blanco entre párrafos.",
			validation: { isRequired: true, length: { min: 80 } },
		}),

		destacado: fields.checkbox({
			label: "Destacar en la página de inicio",
			defaultValue: false,
		}),
		orden: fields.integer({
			label: "Orden manual",
			description: "Menor número = aparece primero.",
			defaultValue: 0,
			validation: { isRequired: true },
		}),
		publicado: fields.date({
			label: "Fecha de publicación",
			validation: { isRequired: true },
		}),
		borrador: fields.checkbox({
			label: "Borrador (no se publica)",
			defaultValue: true,
			description:
				"Empezá en borrador, subí las fotos, y desmarcalo cuando esté listo.",
		}),
		seo: campoSeo,
	},
});

import { fields, singleton } from "@keystatic/core";

import { DEPARTAMENTOS } from "../../lib/geo/el-salvador";

/**
 * Contact details singleton.
 *
 * Phone, WhatsApp, address, hours and social links. Everything the contact
 * page and the site footer read from.
 */
export const contacto = singleton({
	label: "Datos de contacto",
	path: "src/data/contacto/",
	format: { data: "json" },
	previewUrl: "/contacto/",
	schema: {
		telefono: fields.text({
			label: "Teléfono",
			description: "Formato exacto: +503 7777-7777",
			validation: {
				isRequired: true,
				pattern: {
					regex: /^\+503 \d{4}-\d{4}$/,
					message: "Usá el formato +503 7777-7777",
				},
			},
		}),
		whatsapp: fields.text({
			label: "WhatsApp (solo números)",
			description:
				"Código de país y número, sin espacios ni signos. Ejemplo: 50377777777",
			validation: {
				isRequired: true,
				pattern: {
					regex: /^503\d{8}$/,
					message: "Debe ser 503 seguido de 8 dígitos",
				},
			},
		}),
		correo: fields.text({
			label: "Correo electrónico",
			validation: {
				isRequired: true,
				pattern: {
					regex: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
					message: "Ingresá un correo válido",
				},
			},
		}),
		direccion: fields.text({
			label: "Dirección de la oficina",
			multiline: true,
			validation: { isRequired: true, length: { min: 10 } },
		}),
		departamento: fields.select({
			label: "Departamento",
			options: DEPARTAMENTOS.map((d) => ({ label: d.nombre, value: d.id })),
			defaultValue: "ahuachapan",
		}),
		distrito: fields.text({
			label: "Distrito",
			description:
				"Tiene que pertenecer al departamento de arriba (por ejemplo, san-pedro-puxtla en Ahuachapán).",
			defaultValue: "san-pedro-puxtla",
			validation: { isRequired: true },
		}),
		horario: fields.array(
			fields.object({
				dias: fields.text({
					label: "Días",
					description: 'Ejemplo: "Lunes a viernes"',
					validation: { isRequired: true },
				}),
				horas: fields.text({
					label: "Horas",
					description: 'Ejemplo: "8:00 a.m. – 5:00 p.m."',
					validation: { isRequired: true },
				}),
			}),
			{
				label: "Horario de atención",
				itemLabel: (p) => `${p.fields.dias.value} — ${p.fields.horas.value}`,
				validation: { length: { min: 1 } },
			},
		),
		redes: fields.object(
			{
				facebook: fields.url({
					label: "Facebook",
					validation: { isRequired: false },
				}),
				instagram: fields.url({
					label: "Instagram",
					validation: { isRequired: false },
				}),
				tiktok: fields.url({ label: "TikTok", validation: { isRequired: false } }),
				linkedin: fields.url({
					label: "LinkedIn",
					validation: { isRequired: false },
				}),
			},
			{ label: "Redes sociales" },
		),
		motivosContacto: fields.array(
			fields.object({
				id: fields.text({
					label: "Identificador",
					description: "Sin espacios ni tildes. Ejemplo: consulta-legal",
					validation: {
						isRequired: true,
						pattern: {
							regex: /^[a-z0-9-]+$/,
							message: "Solo minúsculas, números y guiones.",
						},
					},
				}),
				etiqueta: fields.text({
					label: "Texto que ve el visitante",
					validation: { isRequired: true },
				}),
			}),
			{
				label: "Opciones del formulario de contacto",
				itemLabel: (p) => p.fields.etiqueta.value || "Motivo",
				validation: { length: { min: 1 } },
			},
		),
	},
});

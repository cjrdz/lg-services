/**
 * Abrir y cerrar el menú de teléfono.
 *
 * Lo visual —el panel que se despliega, el fondo que se desvanece, el cruce
 * menú↔cerrar— es todo CSS (ver `.menu-movil` en global.css). Acá queda
 * solo lo que CSS no puede: el clic, Escape, y el scroll del fondo.
 *
 * Todo delegado en `document`, que es el único nodo que sobrevive a un cambio
 * de página del <ClientRouter />: así el menú se vuelve a montar cero veces
 * por navegación y no hay nada que re-enganchar.
 */

const PANEL = "[data-menu-panel]";
const BOTON = "[data-menu-boton]";
const FONDO = "[data-menu-fondo]";

function abierto(): boolean {
	return document.querySelector(PANEL)?.getAttribute("data-abierto") === "true";
}

function poner(valor: boolean): void {
	for (const el of document.querySelectorAll<HTMLElement>(`${PANEL}, ${FONDO}`)) {
		el.setAttribute("data-abierto", String(valor));
	}

	const boton = document.querySelector<HTMLElement>(BOTON);
	if (boton) {
		boton.setAttribute("aria-expanded", String(valor));
		const etiqueta = valor ? boton.dataset.labelCerrar : boton.dataset.labelAbrir;
		if (etiqueta) boton.setAttribute("aria-label", etiqueta);
	}

	// El panel tapa la página: dejar que el fondo siga scrolleando detrás es
	// el clásico "cierro el menú y aparecí en otra parte del artículo".
	document.body.style.overflow = valor ? "hidden" : "";
}

export function activarMenuMovil(): void {
	document.addEventListener("click", (evento) => {
		const destino = evento.target;
		if (!(destino instanceof Element)) return;

		if (destino.closest(BOTON)) return poner(!abierto());
		if (destino.closest(FONDO)) return poner(false);
		// Un enlace del panel navega: el menú no puede quedar abierto encima
		// de la página nueva.
		if (destino.closest(`${PANEL} a[href]`)) poner(false);
	});

	document.addEventListener("keydown", (evento) => {
		if (evento.key === "Escape" && abierto()) poner(false);
	});

	/*
	  El documento nuevo llega cerrado desde el servidor, pero `overflow:
	  hidden` vive en <body>, que la navegación reemplaza — y el estilo en
	  línea se iría con él si no lo soltáramos antes. Soltarlo acá deja la
	  página nueva scrolleable pase lo que pase.
	*/
	document.addEventListener("astro:before-swap", () => {
		document.body.style.overflow = "";
	});
}

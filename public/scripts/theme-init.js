// Runs before paint to avoid a flash of light theme.
// Loaded with is:inline in the <head>, so it never goes through the bundler.
(function () {
	// Mark that JavaScript is running. Styles that need to hide elements
	// before GSAP animates them in rely on this class.
	document.documentElement.classList.add("js");

	var raiz = document.documentElement;

	function esOscuro() {
		return raiz.classList.contains("dark");
	}

	/*
	  The button is drawn by src/components/ThemeToggle.astro and carries no
	  state of its own: which icon shows is decided by `.dark` in CSS. Only the
	  accessible name has to be kept in sync, and the two strings travel on the
	  element as data-* because this file is inline and can't read es.json.
	*/
	function sincronizarBotones() {
		var oscuro = esOscuro();
		var botones = document.querySelectorAll("[data-tema]");
		for (var i = 0; i < botones.length; i++) {
			var b = botones[i];
			var etiqueta = oscuro ? b.dataset.labelClaro : b.dataset.labelOscuro;
			if (etiqueta) b.setAttribute("aria-label", etiqueta);
			b.setAttribute("aria-pressed", oscuro ? "true" : "false");
		}
	}

	function aplicarTema() {
		try {
			var guardado = localStorage.getItem("theme");
			var oscuro =
				guardado === "dark" ||
				(guardado === null &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			raiz.classList.toggle("dark", oscuro);
		} catch {
			// localStorage blocked (private mode): stays on light theme.
		}
	}

	aplicarTema();

	/*
	  When navigating with <ClientRouter />, Astro replaces the document and
	  copies over the <html> attributes of the incoming one — which comes from
	  the server, and the server doesn't know the theme. Result: the .dark
	  class was lost and the site reverted to light on every navigation, even
	  though localStorage still said "dark".

	  `astro:after-swap` runs after the swap and BEFORE paint, so reapplying
	  it there causes no flash. The listener lives on `document`, which
	  survives the swap.
	*/
	document.addEventListener("astro:after-swap", function () {
		// The swap replaces <html> attributes; restore the JS flag so
		// GSAP-managed entrance styles stay active.
		raiz.classList.add("js");
		aplicarTema();
		sincronizarBotones();
	});

	document.addEventListener("astro:page-load", sincronizarBotones);
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", sincronizarBotones);
	} else {
		sincronizarBotones();
	}

	function guardar(oscuro) {
		raiz.classList.toggle("dark", oscuro);
		try {
			localStorage.setItem("theme", oscuro ? "dark" : "light");
		} catch {
			// Private mode or blocked storage: the theme simply doesn't persist.
		}
		sincronizarBotones();
	}

	/*
	  Durations and curves are read from the stylesheet instead of written
	  here: global.css is the only place in this project where motion values
	  are defined, and a literal `700` in a script is exactly the kind of
	  number that drifts away from the rest of the site.
	*/
	function token(nombre, respaldo) {
		var v = getComputedStyle(raiz).getPropertyValue(nombre).trim();
		return v || respaldo;
	}

	/*
	  LA UNIDAD HAY QUE MIRARLA. No es paranoia: global.css declara
	  `--duracion-tema: 700ms`, pero Tailwind MINIFICA los tokens de `@theme`
	  y lo que llega al navegador es `.7s`. Un `parseFloat()` a secas devuelve
	  0.7, y la API de animaciones cuenta en milisegundos — así que el barrido
	  del tema corría en siete décimas de milisegundo. No se veía como una
	  animación rápida: se veía como un destello, porque literalmente terminaba
	  antes del primer cuadro.

	  El valor puede llegar en `ms`, en `s` o minificado a `.7s`, y las tres
	  formas significan lo mismo.
	*/
	function duracionMs(nombre, respaldo) {
		var valor = token(nombre, respaldo);
		var n = parseFloat(valor);
		if (!isFinite(n)) n = parseFloat(respaldo);
		// "700ms" ya está en milisegundos; "0.7s" y ".7s" terminan en "s" a secas.
		return /ms\s*$/.test(valor) ? n : n * 1000;
	}

	function movimientoReducido() {
		return (
			raiz.getAttribute("data-motion") === "sistema" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		);
	}

	/*
	  The theme change as a circle opening from the button.

	  A theme switch used to be a hard cut: every color on the page repainted
	  on the next frame. This wraps it in a view transition and wipes the new
	  theme in from wherever the button is, so the change reads as one gesture
	  instead of a flash.

	  `data-vt="tema"` on <html> is what tells global.css this is a THEME
	  transition and not a page navigation: it silences the page fade and, more
	  importantly, drops every `view-transition-name` on the page. Those names
	  (the header, an icon mid-morph, a listing photo) would each be captured
	  as their own layer, and the circle — which only clips the root snapshot —
	  would wipe around them, leaving pieces of the old theme floating on top.

	  It is set BEFORE startViewTransition on purpose: the old state is
	  captured the moment that call is made, so an attribute set afterwards
	  would come too late for it.
	*/
	function alternar(boton) {
		var oscuro = !esOscuro();

		if (!document.startViewTransition || movimientoReducido()) {
			guardar(oscuro);
			return;
		}

		raiz.setAttribute("data-vt", "tema");
		var transicion = document.startViewTransition(function () {
			guardar(oscuro);
		});

		transicion.ready.then(function () {
			var caja = boton.getBoundingClientRect();
			var x = caja.left + caja.width / 2;
			var y = caja.top + caja.height / 2;

			/*
			  Arranca en el radio DEL BOTÓN, no en cero.

			  Desde cero el círculo nace de un punto invisible debajo del cursor
			  y los primeros cien milisegundos no se ven: el clic parecía no
			  hacer nada y después algo barría la pantalla. Empezando del tamaño
			  del botón, el cambio sale literalmente de la cosa que se apretó.
			*/
			var inicio = Math.max(caja.width, caja.height) / 2;

			// Llega a la esquina más lejana: ningún borde de la página se queda sin cubrir.
			var radio = Math.hypot(
				Math.max(x, window.innerWidth - x),
				Math.max(y, window.innerHeight - y),
			);

			var duracion = duracionMs("--duracion-tema", "700ms");
			var pseudo = "::view-transition-new(root)";

			var circulo = function (r) {
				return "circle(" + r + "px at " + x + "px " + y + "px)";
			};

			raiz.animate(
				{ clipPath: [circulo(inicio), circulo(radio)] },
				{
					duration: duracion,
					easing: token("--curva-suave", "cubic-bezier(0.4, 0, 0.2, 1)"),
					pseudoElement: pseudo,
				},
			);

			/*
			  Y el frente del círculo entra medio transparente.

			  Un clip-path tiene el borde perfectamente duro: lo que se veía era
			  una línea recortando la pantalla, que es la parte que hacía que el
			  efecto se leyera como barato. Con el tema nuevo arrancando en 0.55,
			  el tema viejo se transparenta debajo durante el primer tramo y los
			  dos se funden mientras el círculo avanza — el borde deja de ser un
			  corte y pasa a ser un frente que revela.

			  Dura una fracción del barrido, no un valor propio: lo que importa
			  es que resuelva temprano y el resto del recorrido ya se vea limpio.
			*/
			raiz.animate(
				{ opacity: [0.55, 1] },
				{
					duration: duracion * 0.4,
					easing: token("--curva-salida", "cubic-bezier(0.16, 1, 0.3, 1)"),
					pseudoElement: pseudo,
					fill: "backwards",
				},
			);
		});

		var limpiar = function () {
			raiz.removeAttribute("data-vt");
		};
		transicion.finished.then(limpiar, limpiar);
	}

	/*
	  Delegated, so it survives every <ClientRouter /> swap without rebinding:
	  one listener for the life of the document, however many times the header
	  is replaced.
	*/
	document.addEventListener("click", function (evento) {
		var boton = evento.target.closest && evento.target.closest("[data-tema]");
		if (boton) alternar(boton);
	});
})();

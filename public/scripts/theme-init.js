// Runs before paint to avoid a flash of light theme.
// Loaded with is:inline in the <head>, so it never goes through the bundler.
(function () {
	function aplicarTema() {
		try {
			var guardado = localStorage.getItem("theme");
			var oscuro =
				guardado === "dark" ||
				(guardado === null &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			document.documentElement.classList.toggle("dark", oscuro);
		} catch (e) {
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
	document.addEventListener("astro:after-swap", aplicarTema);
})();

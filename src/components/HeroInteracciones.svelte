<script lang="ts">
	import { onMount } from "svelte";
	import { cargarGsap } from "@/lib/gsap";

	onMount(async () => {
		const g = await cargarGsap();
		if (!g) return;

		const hero = document.querySelector('[data-hero="titulo"]')?.closest("section");
		if (!hero) return;

		const aura = hero.querySelector<HTMLElement>('[data-hero="aura"]');
		const imagen = hero.querySelector<HTMLElement>('[data-hero="imagen"]');
		const titulo = hero.querySelector<HTMLElement>('[data-hero="titulo"]');
		const subtitulo = hero.querySelector<HTMLElement>('[data-hero="subtitulo"]');
		const botones = hero.querySelector<HTMLElement>('[data-hero="botones"]');

		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduced) return;

		const { gsap, ScrollTrigger } = g;

		/*
		  Pointer parallax. The portrait and the backdrop move by different
		  amounts and in opposite directions, which is what makes them read as
		  two planes instead of one flat picture. Both go through quickTo, so
		  mousemove only sets a target value — no tween is created per event.

		  Only bound on a real pointer: on a phone this listener would never
		  fire, and on a hybrid device a stray touch shouldn't shift the hero.
		*/
		const conPuntero = window.matchMedia("(hover: hover)").matches;

		if (conPuntero && (imagen || aura)) {
			const mover = imagen
				? {
						x: gsap.quickTo(imagen, "x", { duration: 0.8, ease: "power2.out" }),
						y: gsap.quickTo(imagen, "y", { duration: 0.8, ease: "power2.out" }),
					}
				: null;

			const moverAura = aura
				? {
						x: gsap.quickTo(aura, "x", { duration: 1.4, ease: "power2.out" }),
						y: gsap.quickTo(aura, "y", { duration: 1.4, ease: "power2.out" }),
					}
				: null;

			hero.addEventListener("mousemove", (e) => {
				const rect = hero.getBoundingClientRect();
				const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
				const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
				mover?.x(x * -10);
				mover?.y(y * -10);
				// Opposite sign and a longer reach: the backdrop is "further away".
				moverAura?.x(x * 26);
				moverAura?.y(y * 18);
			});

			hero.addEventListener("mouseleave", () => {
				mover?.x(0);
				mover?.y(0);
				moverAura?.x(0);
				moverAura?.y(0);
			});
		}

		/*
		  Scroll parallax. The hero drifts up and dims as the page moves on,
		  but never to zero: text that vanishes while it's still on screen
		  reads as a rendering bug, not as an effect.
		*/
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: hero,
				start: "top top",
				end: "+=70%",
				scrub: 1.2,
			},
		});

		if (aura) {
			/*
			  Slowest layer, so the depth from the pointer holds while scrolling.
			  Only the position is animated: .hero-aura has a CSS transition on
			  opacity for its entrance, and scrubbing that same property would
			  put a 1.2s transition in front of every frame.
			*/
			tl.to(aura, { yPercent: 12, ease: "none" }, 0);
		}

		if (imagen) {
			// Slight overscale + upward movement keeps the portrait covering the frame
			// while creating a classic parallax effect (image moves up as page scrolls down).
			tl.to(imagen, { y: -20, ease: "none" }, 0);
		}

		if (titulo) {
			tl.to(titulo, { y: -40, opacity: 0.45, ease: "none" }, 0);
		}

		if (subtitulo) {
			tl.to(subtitulo, { y: -28, opacity: 0.35, ease: "none" }, 0);
		}

		if (botones) {
			tl.to(botones, { y: -18, opacity: 0.3, ease: "none" }, 0);
		}

		// Disable CSS transitions once the entrance animation is done.
		const maxEntranceDelay = 260 + 900;
		setTimeout(() => {
			hero
				.querySelectorAll(".hero-animable, .hero-animable-imagen")
				.forEach((el) => el.classList.add("hero-animacion-lista"));
		}, maxEntranceDelay);

		return () => {
			tl.kill();
			ScrollTrigger.getAll().forEach((st) => {
				if (st.trigger === hero) st.kill();
			});
		};
	});
</script>

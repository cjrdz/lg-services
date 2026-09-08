<script lang="ts">
	import { onMount } from "svelte";
	import { cargarGsap } from "@/lib/gsap";

	onMount(async () => {
		const g = await cargarGsap();
		if (!g) return;

		const hero = document.querySelector("[data-hero]")?.closest("section");
		if (!hero) return;

		const imagen = hero.querySelector<HTMLElement>('[data-hero="imagen"]');
		const titulo = hero.querySelector<HTMLElement>('[data-hero="titulo"]');
		const subtitulo = hero.querySelector<HTMLElement>('[data-hero="subtitulo"]');
		const botones = hero.querySelector<HTMLElement>('[data-hero="botones"]');

		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduced) return;

		const { gsap, ScrollTrigger } = g;

		// --- Mouse parallax on the portrait (subtle, keeps it inside frame) ---
		if (imagen) {
			const xTo = gsap.quickTo(imagen, "x", {
				duration: 0.8,
				ease: "power2.out",
			});
			const yTo = gsap.quickTo(imagen, "y", {
				duration: 0.8,
				ease: "power2.out",
			});

			hero.addEventListener("mousemove", (e) => {
				const rect = hero.getBoundingClientRect();
				const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
				const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
				xTo(x * -10);
				yTo(y * -10);
			});

			hero.addEventListener("mouseleave", () => {
				xTo(0);
				yTo(0);
			});
		}

		// --- Scroll-driven parallax / fade on the hero ---
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: hero,
				start: "top top",
				end: "+=70%",
				scrub: 1.2,
			},
		});

		if (imagen) {
			// Slight overscale + upward movement keeps the portrait covering the frame
			// while creating a classic parallax effect (image moves up as page scrolls down).
			tl.to(imagen, { y: -20, ease: "none" }, 0);
		}

		if (titulo) {
			tl.to(titulo, { y: -40, opacity: 0.25, ease: "none" }, 0);
		}

		if (subtitulo) {
			tl.to(subtitulo, { y: -28, opacity: 0.15, ease: "none" }, 0);
		}

		if (botones) {
			tl.to(botones, { y: -18, opacity: 0.05, ease: "none" }, 0);
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

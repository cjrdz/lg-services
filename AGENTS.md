# lg-services

Sitio de Lisbeth Gutiérrez (abogada, San Pedro Puxtla, Ahuachapán, El Salvador).
Tres verticales: **servicios legales**, **propiedades** (casas, apartamentos y
terrenos) y **vehículos en alquiler**, más blog y contacto.

Reemplaza a `../lg-blog`, cuyo contenido estaba escrito a mano en el frontmatter de
archivos `.astro`. Toma como referencia de arquitectura a `../jrdz.dev`.

**Ella edita el sitio, no un desarrollador.** Entra a `/keystatic`, llena formularios
en español y publica. No sabe git ni línea de comandos. Todo lo que se diseñe tiene
que sobrevivir a eso.

## Comandos

```
bun run dev            # servidor de desarrollo
bun run dev:clean      # idem, borrando antes las cachés de Vite y Astro
bun run dev:stop       # detenerlo  (el binario `astro` NO está en el PATH:
bun run dev:status     #  por eso `astro dev stop` a secas falla y hay que
bun run dev:logs       #  usar estos atajos o `bunx astro …`)
bun run smoke          # navegador real: verifica que las islas hidraten
bun run smoke http://localhost:8787   # idem contra el worker de producción
bun run smoke:cache    # regresión: hidratación con caché caliente
bun run browser:deps   # librerías de Chromium SIN sudo (una sola vez)
bun run media:gc       # informe de fotos huérfanas en R2 (no borra nada)
bun run verify         # lint:colors + astro check + tests + build  ← correr antes de commitear
bun run build
bun run deploy:check   # build + wrangler deploy --dry-run
bun run deploy
bun run cf-typegen     # regenerar worker-configuration.d.ts tras tocar wrangler.jsonc
```

Si arrancás el servidor de desarrollo en segundo plano: `astro dev --background`,
y se maneja con `astro dev stop`, `astro dev status`, `astro dev logs`.

## Reglas del proyecto

**Colores.** Los colores se definen SOLO en `src/styles/global.css`. En el resto del
código se usan tokens semánticos (`bg-background`, `text-muted-foreground`,
`border-border`). Nunca `bg-blue-100`, `text-black` ni hex sueltos: en lg-blog eso
quedó horneado a un tema y se volvía ilegible al cambiar a oscuro.
`bun run lint:colors` lo bloquea. Excepción puntual: comentario `color-literals-ok`
en la línea.

**URLs internas.** Siempre por `localizedUrl()` de `src/i18n/routing.ts`. Nunca
concatenar strings: así fue como lg-blog terminó generando `/blog/category/Derecho Civil`.

**Idiomas.** El sitio es español (es-SV) pero está preparado para inglés. Todas las
rutas viven en `src/pages/[...lang]/`; el segmento es opcional, así que un solo
archivo sirve `/contacto/` y `/en/contacto/`. Agregar inglés = cambiar `LOCALES` en
`src/i18n/config.ts` y agregar `en.json`. **Nunca duplicar archivos de página por
idioma** (es el error que tiene `jrdz.dev` en `src/pages/es/`).

**Contenido guarda IDs, no etiquetas.** `area: "derecho-laboral"`, no
`area: "Derecho Laboral"`. Las etiquetas visibles viven en `src/i18n/enums.ts`.

**Textos visibles.** Van en `src/i18n/es.json` y se leen con `t()`. No hardcodear
strings en componentes.

**Fotos de anuncios.** Van a Cloudflare R2, no al repo. Se suben desde `/estudio` y
en Keystatic se pega la ruta. Ver el plan para el porqué.

**Componentes.** `src/components/ui/` lo genera el CLI de shadcn-svelte: no editar a
mano.

**Íconos — dos componentes, no uno.**

| Dónde                           | Qué usar     | Costo                                        |
| ------------------------------- | ------------ | -------------------------------------------- |
| Archivos `.astro`               | `Icon.astro` | SVG en línea resuelto en el build. Cero JS.  |
| Ícono dentro de una isla Svelte | `morphicons` | Único componente de ícono que corre en islas |

Nunca poner `<Icon client:visible />` en una página `.astro`: cada uno crea una isla
que hidrata el runtime de Iconify para dibujar algo que no cambia nunca. La home
llegó a tener 14 islas por eso; con `Icon.astro` quedaron 2 (el toggle de tema y el
menú móvil, que sí son interactivos).

`Icon.astro` falla el build si el ícono no existe, así que un typo no llega a
producción como un hueco vacío.

**Movimiento.** Igual que los colores: las duraciones y curvas se definen SOLO
en `src/styles/global.css` (`--duracion-*`, `--curva-*`). La escala es corta a
propósito — en una interfaz sobria la animación confirma lo que pasó, no llama
la atención sobre sí misma.

| Qué                          | Cómo                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Entre páginas                | `<ClientRouter />` + `::view-transition-*`: un fundido, sin desplazar la página                                |
| Entrada de contenido         | clase `.aparece` con `@starting-style` — CSS puro, sin IntersectionObserver (lg-blog tenía uno por componente) |
| Tarjetas al pasar el cursor  | clase `.elevable`, 2 px y una sombra, solo con `@media (hover: hover)`                                         |
| Íconos que cambian de estado | `morphicons`                                                                                                   |

**No mezclar `.elevable` con `transition-colors`.** La utilidad de Tailwind
declara su propio `transition-property` y gana (utilities pesa más que
components), así que la elevación saltaba de golpe en vez de animarse. `.elevable`
ya incluye los colores.

**morphicons solo donde el cambio significa algo**: sol↔luna, menú↔cerrar,
copiar↔visto, buscar↔limpiar, enviar↔enviado. No es decoración; si el ícono no
cambia de estado, va `Icon.astro` (SVG en el build, cero JS).

**Tres cosas de configuración que NO hay que "limpiar".** Las tres se ven raras y
las tres tienen una razón verificada detrás:

1. `trailingSlash: "ignore"` — el cliente de Keystatic llama a sus rutas sin barra
   final (`/api/keystatic/github/login`). Con `"always"` dan 404 y el panel se
   rompe en producción, incluido el login. La canonicalización la hacen
   `localizedUrl()` + `<link rel="canonical">`, no el router.
2. `vite.ssr.noExternal` + `optimizeDeps` con `cookie` — es CommonJS puro y sin
   las dos cosas revienta con "exports is not defined" y el panel devuelve 500.
3. El adaptador de Cloudflare se aplica **solo al construir**. En desarrollo
   Keystatic corre en modo local y necesita `node:fs`, que workerd no da.
4. Los bindings de R2 se leen con `import { env } from "cloudflare:workers"`
   (ver `src/lib/media/bucket.ts`). **`Astro.locals.runtime.env` ya no existe**:
   en el adaptador v14 es un getter que LANZA un error. No falla en silencio,
   revienta la petición.

**En desarrollo, `/estudio` no puede funcionar — y lo dice.** Keystatic corre
en modo LOCAL (escribe al disco, sin login), así que sus rutas de OAuth de
GitHub no existen: `/api/keystatic/github/login` da 404. Y tampoco hay binding
de R2. La página detecta `import.meta.env.DEV` y explica eso, en vez de mostrar
un botón "Entrar con GitHub" que lleva a un 404.

`SignIn.svelte` también comprueba la ruta antes de ofrecerla (404 = no existe,
500 = falta la GitHub App), así que en una producción a medio configurar avisa
qué falta en lugar de abrir una ventana con un error.

**Probar `/estudio` necesita el worker compilado.** En `astro dev` no hay
binding de R2, así que las rutas `/api/media/*` responden con un mensaje claro
en vez de funcionar. El flujo es:

```
bun run build && bun run preview     # wrangler dev, con R2 local
```

**Fallo de hidratación con caché caliente (resuelto — no revertir el plugin).**

Síntoma: en el navegador fallan TODAS las islas a la vez, siempre en la primera
línea de su plantilla:

```
Failed to hydrate: TypeError: Cannot read properties of undefined (reading 'call')
    at ThemeToggle (ThemeToggle.svelte:40:2)
[astro-island] Error hydrating ... node.remove is not a function
```

Causa, ya reproducida y confirmada por control (con y sin el arreglo): cuando
Vite re-optimiza dependencias —cosa que hace **cada vez que cambia
`astro.config.mjs`**— el módulo fuente transformado cambia, porque lleva dentro
los `?v=` de las deps. Pero se servía con `ETag`, así que un navegador con la
página ya cargada revalidaba, recibía **304** y se quedaba con la versión vieja,
apuntando a bundles de la corrida anterior. Quedaban dos instancias del runtime
de Svelte y, como el estado de hidratación vive en el ámbito del módulo, se caía
la página entera.

Lo arregla `noCachearEnDev()` en `src/lib/vite-no-cache-deps.ts`: fuerza
`no-store` y borra `ETag`/`Last-Modified` en lo que sirve Vite en desarrollo.
Tiene que interceptar `writeHead`, porque el middleware de Vite corre después y
pisa la cabecera si se pone antes. Solo afecta a `astro dev`.

`node.remove is not a function` es ruido: el manejador de errores de Astro
fallando encima del error real, el del `.call`.

`bun run smoke:cache` reproduce la secuencia entera y es la regresión.

Por qué costó tanto encontrarlo: con caché fría NO pasa, así que las pruebas
headless normales (perfil nuevo en cada corrida) lo daban por bueno mientras el
navegador real se rompía. Descartado y comprobado que NO eran la causa: copias
duplicadas de `svelte`, `morphicons/svelte` con su propio runtime, HMR, tema
oscuro, ni `prefers-reduced-motion`.

**Las páginas legales arrancan en borrador, y el formulario lo respeta.** El
checkbox de contacto solo enlaza al aviso de privacidad si la página está
publicada: pedirle a alguien que acepte un documento que no puede leer no es
aceptable, y menos en un sitio de una abogada que recoge datos personales. El
contenido lo escribe Lisbeth; acá está la estructura.

**El build es la red de seguridad.** Las validaciones de zod en `src/content.config.ts`
corren en el build. Si Lisbeth publica algo inválido, el build de Cloudflare falla y
el despliegue anterior sigue en vivo. No debilitar esas validaciones.

## Documentación

- [Rutas y middleware](https://docs.astro.build/en/guides/routing/)
- [Colecciones de contenido](https://docs.astro.build/en/guides/content-collections/)
- [Componentes de framework](https://docs.astro.build/en/guides/framework-components/)
- [Internacionalización](https://docs.astro.build/en/guides/internationalization/)
- [Adaptador de Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Keystatic](https://keystatic.com/docs)
- [shadcn-svelte](https://www.shadcn-svelte.com/docs)

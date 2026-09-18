# lg-services

Sitio de Lisbeth Gutiérrez (abogada, San Salvador, San Salvador, El Salvador).
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

**Un ícono que cambia de estado no necesita una isla.** El cruce sol↔luna y
menú↔cerrar son dos `Icon.astro` superpuestos que se cruzan con `opacity`,
`rotate` y `scale` (`.tema-icono` y `.menu-icono` en `global.css`). Antes eran
`morphicons` dentro de islas de Svelte, y por estar las dos en la cabecera se
cargaban en TODAS las páginas: el runtime de Svelte (18.6 KB gzip) más el motor
de morph (7.8 KB) para dibujar cuatro formas que ya se conocen en el build. Una
página del blog pasó de 35.1 KB gzip de JavaScript a 8.4 — y no le queda ni una
isla.

Nunca poner `<Icon client:visible />` en una página `.astro`: cada uno crea una isla
que hidrata el runtime de Iconify para dibujar algo que no cambia nunca. La home
llegó a tener 14 islas por eso; hoy le queda **una**, el formulario de contacto.
Las islas que quedan en el sitio son cinco y las cinco hacen algo que CSS no
puede: el formulario de contacto, los filtros de anuncios, el acordeón de FAQ y,
en `/estudio`, el gestor de fotos y el login.

`Icon.astro` falla el build si el ícono no existe, así que un typo no llega a
producción como un hueco vacío.

**Movimiento.** Igual que los colores: las duraciones y curvas se definen SOLO
en `src/styles/global.css` (`--duracion-*`, `--curva-*`). La escala es corta a
propósito — en una interfaz sobria la animación confirma lo que pasó, no llama
la atención sobre sí misma. El único paso largo es `--duracion-entrada` (850ms),
para lo primero que alguien ve: la entrada del hero. Estaba escrito como `0.85s`
y `0.9s` sueltos dentro de las reglas del hero, el único valor de movimiento del
sitio que vivía fuera de ese bloque — que es como una escala deja de ser una
escala. `src/lib/gsap.ts` lo refleja como `DURACION_ENTRADA`.

Y si hace falta leer una duración desde JavaScript, se lee del stylesheet
(`getComputedStyle(...).getPropertyValue("--duracion-tema")`), no se copia el
número. `theme-init.js` lo hace así para el círculo del cambio de tema.

**Pero al leerla hay que mirar la unidad, y esto ya rompió una vez.** Tailwind
MINIFICA los tokens de `@theme`: `--duracion-tema: 700ms` llega al navegador
como `.7s`. Un `parseFloat()` a secas devuelve `0.7`, y la Web Animations API
cuenta en milisegundos — así que el barrido del tema corría en siete décimas de
milisegundo. No se veía como una animación rápida, se veía como un destello,
porque terminaba antes del primer cuadro. Y **en desarrollo no pasa**: ahí el
CSS no está minificado, el token llega como `700ms` y el `parseFloat()` acierta
de casualidad. Solo se rompe en producción.

Para eso está `duracionMs()` en `theme-init.js`, que acepta `700ms`, `0.7s` y
`.7s`. Cualquier duración que se lea desde JavaScript tiene que pasar por ahí.

| Qué                           | Cómo                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Entre páginas                 | `<ClientRouter />` + `::view-transition-*`: un fundido, sin desplazar la página                                |
| Cabecera y pie                | `transition:animate="none"`: no se desvanecen con la página, se quedan quietos                                 |
| Cambio de tema                | `startViewTransition` + un `clip-path` circular desde el botón, en `--duracion-tema` (ver `theme-init.js`)     |
| Elemento que se transforma    | `transition:name` compartido por las dos páginas (los íconos de área y de publicación; ver abajo)              |
| Entrada de contenido          | clase `.aparece` con `@starting-style` — CSS puro, sin IntersectionObserver (lg-blog tenía uno por componente) |
| Entrada escalonada            | `.aparece-escalonado` en el contenedor; los hijos animan solos, no hay que marcarlos                           |
| Revelado al hacer scroll      | `.revelar` / `.revelar-grupo` — `animation-timeline: view()`, cero JS                                          |
| Pasos de `Proceso`            | `.proceso-paso` aparece en su lugar y `.proceso-cuerpo` / `.proceso-ordinal` entran de costado                 |
| Tarjetas al pasar el cursor   | clase `.elevable`, 2 px y una sombra, solo con `@media (hover: hover)`                                         |
| Colores al pasar el cursor    | `.color-animado` en el hijo (nunca `transition-colors` sobre un `.elevable`)                                   |
| Flecha de "esto es un enlace" | `.flecha-tarjeta` (aparece al pasar el cursor) o `.flecha-desliza` (siempre visible, se desplaza)              |
| Foto de un anuncio            | `.zoom-foto` en el `<img>`, con el recorte en el contenedor: el marco no se mueve, se mueve lo de adentro      |
| Tarjeta → ficha de un anuncio | la foto crece hasta la portada; el nombre lo pone `src/lib/transicion-foto.ts`, uno solo por navegación        |
| Menú de teléfono              | `.menu-movil` + `data-abierto`, de `0fr` a `1fr`; la lógica en `src/lib/menu-movil.ts`, cero framework         |
| Panel que se pliega           | `.panel-plegable` + `data-abierto`, de `0fr` a `1fr` sin medir nada en JS                                      |
| Chips de filtro aplicado      | `.chip-filtro`, entran solos con `@starting-style`                                                             |
| Progreso de lectura           | `.barra-progreso` — `animation-timeline: scroll(root block)`, cero JS                                          |
| Íconos que cambian de estado  | dentro de una isla, `morphicons`; en la cabecera, dos `Icon.astro` cruzados en CSS                             |

**Las transiciones compartidas son cuatro cadenas, y no se cruzan.** Un
`view-transition-name` tiene que ser único en la página: si dos elementos lo
comparten, el navegador descarta la transición entera. Por eso cada recorrido
tiene su propio prefijo:

| Cadena         | Nombre                   | De dónde a dónde                                    |
| -------------- | ------------------------ | --------------------------------------------------- |
| Servicios      | `area-icono-<área>`      | home y `/servicios` → `/servicios/<área>`           |
| Áreas del blog | `blog-area-icono-<área>` | `/blog` → `/blog/<área>`                            |
| Publicaciones  | `entrada-icono-<slug>`   | tarjeta de `TarjetaEntrada` → cabecera del artículo |
| Fotos          | `foto-<sección>-<id>`    | tarjeta de un anuncio → portada de su ficha         |

El de las publicaciones va por publicación y **no** por área: en una grilla
puede haber dos entradas de la misma área — y en `/blog/<área>` están todas —
así que un nombre por área serían duplicados garantizados. Lo arma
`transicionEntrada()` en `src/lib/formato.ts`, que además cambia las barras del
slug por guiones, porque el nombre es un `<custom-ident>` y `/` no es válido
ahí.

El de las fotos lleva la sección adelante (`transicionFoto()`, mismo archivo)
porque una propiedad y un vehículo pueden compartir correlativo y en la home se
muestran las dos listas en la misma página.

**Y la cadena de las fotos se asigna en tiempo de navegación, no en el HTML.**
Un `view-transition-name` es un snapshot: ponérselo a las cien fotos de un
listado le pide al navegador cien capas cada vez que alguien se va de la página,
aunque vaya a `/contacto/` y ninguna exista del otro lado — y una foto con
nombre y sin pareja en el destino no se queda quieta, se anima sola.
`src/lib/transicion-foto.ts` lo resuelve marcando UNA sola foto por documento y
por navegación: `astro:before-preparation` conoce el destino y marca la tarjeta
que apunta ahí antes de que se capture el estado viejo, y `astro:after-swap`
marca en el documento nuevo la que apunta de vuelta — que es lo que hace que el
regreso también se vea. Al no depender de un clic funciona igual con el botón
"atrás", que es como se sale de una ficha la mitad de las veces. La portada de
la ficha sí lleva su nombre desde el servidor: es una sola.

**No hay limpieza en `astro:page-load`** y no es un olvido: ese evento llega con
la animación de entrada todavía corriendo, así que quitar el nombre ahí la
abortaría a media transición. Lo que sobre lo borra la navegación siguiente.

**El morph de esos íconos, sin CSS propio, se ve casi invisible.** El
navegador cruza el ícono viejo y el nuevo con `mix-blend-mode: plus-lighter`
por default — pensado para que dos formas que no coinciden no dejen una
costura oscura, pero sobre una insignia de un solo color lo que hace es
sumar luz: el ícono se ve lavado, casi blanco, durante toda la transición.
Encima, la caja que de verdad cambia de tamaño y posición (el pseudo-elemento
`group`) se queda en el default del navegador (0.25s `ease`), fuera de los
tokens de este archivo. `global.css` lo arregla con
`::view-transition-group(*)` / `::view-transition-old(*)` /
`::view-transition-new(*)`, usando `(*)` porque `entrada-icono-<slug>` no se
puede enumerar ahí — y un selector con nombre explícito, como
`::view-transition-old(root)`, le gana a `(*)` sin importar el orden, así
que no le toca nada al fundido de página.

El `mix-blend-mode: normal` de esa regla necesita `!important`: el navegador
aplica el `plus-lighter` con una animación de user-agent, y una animación le
gana a una declaración de autor normal en la cascada — comprobado en el
navegador, sin `!important` la regla compila pero no hace nada.

**Esa misma regla usa `--curva-suave`, no `--curva-salida` — a propósito.**
`--curva-salida` (`cubic-bezier(0.16, 1, 0.3, 1)`) es un ease-out muy
pronunciado: casi todo el recorrido pasa en el primer tercio de la duración y
el resto es solo asentarse. Le queda bien a algo que _aparece_ (`.aparece`,
la página entrando), pero en una caja que cambia de tamaño **y** de posición
a la vez, ese arranque brusco se ve como un salto en vez de un movimiento —
el primer intento de este morph usaba esa curva con `--duracion-normal`
(220ms) y se sentía "snappy" en vez de suave. `--curva-suave`
(`cubic-bezier(0.4, 0, 0.2, 1)`, ease-in-out estándar) reparte el recorrido
a lo largo de toda la duración, y con `--duracion-lenta` (380ms, la misma
que ya usa el fundido de página) alcanza a leerse como una transformación,
no un tic. La caja (`group`) y el cruce de íconos (`old`/`new`) comparten
duración para que terminen juntos.

**El revelado al hacer scroll NO usa JavaScript.** `.revelar` (un elemento) y
`.revelar-grupo` (una grilla: cada hijo entra solo, con un desfase por columna)
usan `animation-timeline: view()`, así que el navegador adelanta la animación
según la posición del scroll, en el compositor. La home montaba dos islas de
GSAP para exactamente esto.

También quita un modo de falla: la versión anterior escondía las tarjetas con
`.js .scroll-animable { opacity: 0 }` y confiaba en que GSAP volviera a
mostrarlas; si ese chunk no bajaba, la página quedaba en blanco y sin un solo
error en consola. Ahora el estado oculto vive en el keyframe y todo está dentro
de `@supports (animation-timeline: view())`, así que un navegador sin
animaciones por scroll simplemente muestra el contenido.

**En Firefox ese revelado no existe, y ahí entra GSAP.**
`animation-timeline: view()` solo está en Chrome/Edge 115+ y Safari 18.4+. Como
toda la regla vive dentro de su `@supports`, en Firefox cada `.revelar` del
sitio —que son más de veinte, entre blog, servicios, propiedades y vehículos—
era exactamente nada: el contenido correcto y completamente quieto.

El respaldo es `src/lib/revelar.ts`, que carga `BaseLayout` con un `<script>`.
Su lista `GRUPOS` tiene que reflejar lo que hace el CSS, eje por eje: `.revelar`
entra desde abajo y los pasos de `Proceso` entran de costado, y si acá se
animara todo en el mismo eje Firefox vería otra animación.
Es **el único lugar donde GSAP toca el scroll**, y no cuesta nada donde CSS ya
funciona: comprueba el soporte primero y se va, así que Chrome y Safari no bajan
un solo byte de GSAP.

(Antes había una isla `ProcesoPasos.svelte` que hacía esto para una sola
sección. Estaba huérfana —`Proceso.astro` nunca la importó— y el CSS del que
dependía, `.js .proceso-pasos > li` y `.gsap-fallo`, no existía. El respaldo
genérico cubre esa sección y las otras veinte.)

Tres cosas que hace a propósito, y cada una es un modo de falla que este
proyecto ya sufrió:

1. **Nunca esconde lo que ya se ve.** Solo toca elementos que ARRANCAN debajo
   del pliegue, así que no hay parpadeo de contenido que aparece y se va —
   exactamente por lo que se tiró el viejo `.js .scroll-animable { opacity: 0 }`.
2. **No esconde nada hasta estar seguro de que puede animarlo**: si el chunk
   falla o hay movimiento reducido, devuelve todo a la vista.
3. **Tiene un temporizador de rescate.** Si el chunk nunca resuelve, el
   contenido vuelve igual. Una página en blanco sin un error en consola es el
   peor final posible y es el que esto producía antes.

Dos detalles que no se pueden tocar sin romperlo:

- Anima `transform`, **no** `translate`: `translate` es de `.elevable` para su
  elevación al pasar el cursor, y una animación con `fill: both` le gana a una
  declaración normal — animar la misma propiedad mataría el hover de cada tarjeta.
- Con movimiento reducido hace falta `animation: none`, no una duración corta:
  una animación guiada por el scroll no tiene reloj, así que el
  `animation-duration: 0.01ms` general no la toca y el contenido se quedaría
  transparente.

`bun run smoke` verifica que las `.revelar` que están dentro de la pantalla sean
visibles: es la clase de fallo que no tira ningún error de consola.

**Ojo con `.js` en un selector que ya empieza en `:root`.** La clase la lleva
`<html>`, que ES `:root` — así que `:root[data-motion="sistema"] .js .algo` pide
un `.js` DENTRO de `<html>` y no coincide nunca. Va pegado:
`:root[data-motion="sistema"].js .algo`. Había una regla así, muerta, para el
acordeón de las FAQ.

La barra de progreso de los artículos usa la otra línea de tiempo,
`scroll(root block)`, que sigue la posición del scroll del documento en vez de
un elemento cruzando la pantalla. También va entera dentro de su `@supports`, y
con movimiento reducido **desaparece**: una barra que solo significa algo
mientras se mueve, quieta en cero, es una raya sin sentido arriba de la página.

**Los pasos de `Proceso` son una secuencia, no una grilla — y se mueven
distinto.** El resto del sitio revela hacia arriba: son tarjetas
independientes que aparecen. Estos tres son 01 → 02 → 03, y el movimiento
horizontal es el que dice "esto avanza" en lugar de "esto aparece". Entran
desde la derecha, que es el lado por el que se sigue leyendo y donde vive la
columna.

**Lo que se mueve es el CONTENIDO, no la fila.** La opacidad va en el `<li>` y
el desplazamiento en sus hijos, y la separación no es estética: el `<li>` lleva
la regla de arriba (`border-t`), así que con toda la fila deslizándose la línea
viajaba con ella y durante la entrada quedaba corta por la izquierda, con un
hueco de 30 px contra el borde de la columna — se leía como una fila mal
alineada, no como una fila llegando. Ahora la retícula aparece quieta en su
sitio y el contenido llega a ocuparla.

Ninguna de las dos partes anima las dos cosas: si el `<li>` y el hijo animaran
opacidad, una multiplicaría a la otra y la entrada se vería más oscura y más
tarde de lo que dicen los keyframes.

**El rango de estos pasos es `cover`, no `entry`, y ahí está la diferencia
entre verlo y no verlo.** Una animación de scroll no dura milisegundos: dura
PIXELES DE RECORRIDO, y cuántos son depende de la fase que se elija.

| Fase    | De dónde a dónde                                 | Cuánto scroll dura                         |
| ------- | ------------------------------------------------ | ------------------------------------------ |
| `entry` | el elemento empieza a entrar → terminó de entrar | **el alto del elemento**                   |
| `cover` | el elemento toca la pantalla → sale por arriba   | **alto del elemento + alto de la ventana** |

Un paso mide 135 px, así que `entry 5%` → `entry 55%` le daba 55 px de scroll
para empezar y terminar: menos que un golpe de rueda. La animación corría
perfecta y nadie la veía nunca, porque para cuando el paso aparecía en pantalla
ya estaba puesto. Con `cover 0%` → `cover 30%` el mismo recorrido pasa a ~280 px
— medido en el navegador. La animación no cambió; cambió cuánto scroll ocupa.

**Y termina en 30 %, no más tarde, por geometría.** Al 30 % de `cover` el borde
de arriba del paso queda al ~65 % de la altura de la ventana, y esa proporción
casi no se mueve aunque la ventana cambie de alto, porque el paso mide poco al
lado de la pantalla. O sea: el paso termina de aparecer justo cuando entra en la
zona donde uno lo está leyendo. Con el rango llegando al 54 % pasaba lo que se
ve en cualquier pantalla alta — el último paso todavía a media opacidad cuando
ya estaba entero a la vista y perfectamente legible. Estirar el rango para que
la animación _se note_ y estirarlo hasta que _termine tarde_ son dos cosas
distintas, y el 30 % es la línea entre ellas.

Medido con 5 pasos y tres ventanas distintas (1280×800, 1223×1650, 692×1553):
los quince llegan a opacidad 1 con su borde superior entre el 59 % y el 67 % de
la ventana.

**No hay desfase escrito por paso, y no es un olvido.** Cada `<li>` tiene su
propia línea de tiempo `view()`, que depende de dónde está en la página, así que
02 entra después de 01 porque está más abajo. Un desfase a mano encima de eso
hacía las dos cosas mal: llegaba tarde (era parte de por qué el último paso
quedaba translúcido) y estaba capado al tercero — `i === 1 ? "7%" : "14%"`—, así
que con cinco pasos el tercero, el cuarto y el quinto habrían entrado todos
juntos. Sin él, la secuencia funciona con los pasos que sean: Lisbeth agrega un
cuarto en /keystatic y entra en su turno, sin tocar CSS.

`.revelar` sigue en `entry` y está bien: ahí lo que entra son tarjetas grandes,
y el alto de la tarjeta ya es recorrido de sobra.

**Cuidado con `truncate` dentro de una grilla.** `truncate` implica
`white-space: nowrap`, y ese ancho mínimo sube por toda la cadena de padres:
un hijo de grilla tiene `min-width: auto` y no puede achicarse por debajo del
ancho mínimo de su contenido. Una tarjeta del blog con el subtema recortado
corría la página 83 px a la derecha en un teléfono. Hace falta `min-w-0` en el
texto **y en la tarjeta**, no solo en uno de los dos.

**No mezclar `.elevable` con `transition-colors`.** La utilidad de Tailwind
declara su propio `transition-property` y gana (utilities pesa más que
components), así que la elevación saltaba de golpe en vez de animarse. `.elevable`
ya incluye los colores.

Es la misma trampa que hace que una clase de `@layer components` **no pueda
esconder** un elemento que lleva utilidades de Tailwind: un `display: none`
ahí pierde contra `flex`. Por eso la barra de acción de las fichas se oculta
con `lg:hidden` en el elemento y no desde `global.css` — verificado en el
navegador, no deducido.

**Prefetch: "hover" para todo, "viewport" solo para el menú.**
`<ClientRouter />` lo enciende solo, pero en "hover" — y en un teléfono no hay
hover, así que ahí no adelantaba nada. Los cinco enlaces del menú llevan
`data-astro-prefetch="viewport"` y se bajan antes de que nadie haga clic.
"viewport" para todo sería lo contrario de una mejora: un listado con cien
anuncios pediría cien páginas que nadie abrió.

**El listado de anuncios: dos sistemas de animación, uno a la vez.** La grilla
sale con `.revelar-grupo`, así que la primera pasada por la lista se revela
sola. En cuanto alguien filtra, la isla le saca la clase y GSAP Flip pasa a ser
el dueño de la grilla. No pueden convivir: el revelado es una animación CSS con
`fill: both`, y eso le gana al `transform` en línea que escribe Flip.

**morphicons solo donde el cambio significa algo Y ya hay una isla**:
copiar↔visto, buscar↔limpiar, enviar↔enviado, abrir↔cerrar en el acordeón. No es
decoración; si el ícono no cambia de estado, va `Icon.astro` (SVG en el build,
cero JS). Y si cambia de estado pero el componente NO necesita ser una isla por
otra razón —sol↔luna, menú↔cerrar— tampoco: dos `Icon.astro` superpuestos y un
cruce en CSS hacen lo mismo sin bajar 26 KB para conseguirlo.

**GSAP — animación con JS solo cuando vale la pena.** Se usa en islas Svelte
para animaciones que CSS no puede hacer bien: secuencias de entrada, cambios de
layout filtrados, y revelado en scroll. No reemplaza `.aparece`, `.elevable` ni
las view transitions; las complementa.

- Entrá siempre por `src/lib/gsap.ts`: registra plugins, define easings y
  respeta `prefers-reduced-motion`.
- **Un plugin por vez.** `cargarGsap()` trae el núcleo (gsap + CustomEase, que
  son las curvas de `global.css`); `cargarFlip()` y `cargarScrollTrigger()`
  agregan el suyo. Había un solo punto de entrada que los traía todos, así que
  una página de listados —que usa Flip y nada más— bajaba ScrollTrigger también:
  17 KB gzip de un plugin que ahí no se llama nunca.
- GSAP se carga con dynamic imports dentro de `onMount` (o de un efecto cliente)
  para no romper el prerender de Cloudflare, que prohíbe I/O asíncrona en
  el scope global.
- Nunca importar `gsap`, `Flip` o `ScrollTrigger` directamente en el top level
  de un componente que Astro pueda renderizar en el servidor.
- Las duraciones y curvas usan las constantes exportadas por `src/lib/gsap.ts`,
  que reflejan los tokens de `global.css`.

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

**La misma familia de fallo tenía una segunda puerta, y estuvo abierta hasta
que apareció esto en la consola:**

```
client.svelte.js:2  GET /node_modules/.vite/deps/svelte_internal_client.js?v=0099c066
                    net::ERR_ABORTED 504 (Outdated Optimize Dep)
```

El plugin solo miraba `/node_modules/.vite/deps/`. Pero los bundles
pre-optimizados no son los únicos que llevan los `?v=` adentro: el punto de
entrada del renderer de Svelte —`/node_modules/@astrojs/svelte/dist/client.svelte.js`,
que carga CADA isla— es un módulo servido por Vite con los imports ya
reescritos, y salía con `Cache-Control: max-age=31536000,immutable` y un `ETag`,
llevando dentro `deps/svelte_internal_client.js?v=<hash>`. El navegador se
guardaba UN AÑO un archivo que apunta al hash de esa corrida del optimizador; en
cuanto Vite re-optimiza, ese hash deja de existir. Por eso el matcher es todo
`/node_modules/` y no solo la carpeta de deps.

**Y había un tercer camino al mismo 504, por el otro lado: el servidor.**

```
GET /node_modules/.vite/deps/gsap.js?v=6bbc6f6f
net::ERR_ABORTED 504 (Outdated Optimize Dep)
```

Todo lo que este sitio carga bajo demanda llega por un import DINÁMICO: GSAP
desde `onMount` (`src/lib/gsap.ts`) y el componente de cada isla cuando hidrata.
Vite no ve nada de eso al arrancar, así que lo descubría a mitad de sesión — y
descubrir una dependencia nueva significa RE-OPTIMIZAR, o sea un hash `?v=`
nuevo para todo el lote. La página abierta seguía pidiendo el hash viejo, que ya
no existe.

No es el bug de la caché caliente aunque el mensaje se parezca: aquel era el
navegador guardándose un módulo viejo; este es el servidor moviendo los hashes
por abajo. Se arregla declarando esas dependencias en `vite.optimizeDeps.include`
(ver `astro.config.mjs`), y entonces el optimizador corre una sola vez al
arrancar.

Reproducido y verificado: `bun run smoke` fallaba en /propiedades/ y /vehiculos/
—las dos páginas con filtros, que son las únicas que cargan GSAP— con 504 en
`gsap` y `gsap_CustomEase`; con las dependencias declaradas, tres arranques en
frío seguidos dan cero rutas con problemas.

**Y por eso `smoke:cache` ahora empieza revisando cabeceras, sin navegador.**
Los tres pasos con navegador prueban el SÍNTOMA (las islas no hidratan); el paso
0 prueba la CAUSA: cualquier módulo que Vite sirva con los `?v=` adentro tiene
que salir `no-store` y sin `ETag`. Comprobado en los dos sentidos — con el
matcher viejo el paso 0 falla y nombra el archivo, mientras los tres pasos con
navegador siguen pasando. Es decir: la prueba de navegador NUNCA habría
encontrado esto.

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

**El área de una entrada está escrita dos veces, y las dos tienen que decir lo
mismo.** El panel le pide a Lisbeth el prefijo de la dirección
(`derecho-laboral/despido-injustificado`) Y el área de una lista. La URL sale del
prefijo; la miga de pan, la insignia y el índice de área salen del campo. Si no
coinciden, el artículo queda publicado en una dirección que su propio índice no
lista — o peor, bajo un área que no existe, con la ficha viva y el índice de
arriba en 404.

Eso zod **no** lo puede validar: el `schema` de una colección recibe el
frontmatter y nunca el id del archivo. La comparación vive en
`verificarAreaDeEntrada()`, dentro de `getEntradas()` en `src/lib/contenido.ts`,
y rompe el build. Solo aplica a entradas publicadas, que es cuando importa: un
borrador con el área cruzada no rompe nada hasta que se despublica, y ahí falla
el build y el despliegue anterior se queda en vivo.

El mensaje va en ASCII sin acentos a propósito: viaja por una cabecera de error
del prerender de Cloudflare que no los acepta y los deja ilegibles.

**El subtema también se valida contra SU área.** El select del panel ofrece los
32 subtemas de las siete áreas en una sola lista, así que "Divorcio" en un
artículo de tributario estaba a un clic. Ahora cada opción lleva su área adelante
(`Derecho de Familia › Divorcio`) y el `superRefine` de `content.config.ts` lo
rechaza en el build si no calza. Keystatic no puede filtrar un select por el
valor de otro sin convertir el campo en un `conditional`, y eso cambia la FORMA
de lo que se escribe al archivo (`{ discriminant, value }`): habría que migrar
todas las entradas.

**Un índice de área sin artículos no se indexa.** Las siete áreas generan su
página exista o no contenido adentro. Con las entradas migradas todavía en
borrador eso eran ocho direcciones en el sitemap que decían "Aún no hay
publicaciones" — contenido delgado, y ocho sobre un sitio de veinte páginas es
la proporción que hace que Google desconfíe del resto. La página sigue existiendo
y enlazada desde `/blog`; lo que no hace es pedir que la indexen, y el `noindex`
se cae solo con el primer artículo.

**`/contacto/` va al sitemap a mano.** Es la única página con `prerender = false`
(sin JavaScript el endpoint responde 303 y vuelve con `?envio=ok`, y una página
estática no puede leer eso en el servidor). El sitemap se arma con lo que quedó
en disco, así que esa página —de las dos o tres que más importan en un negocio
local— no aparecía. Va por `customPages` en `astro.config.mjs`.

## Documentación

- [Rutas y middleware](https://docs.astro.build/en/guides/routing/)
- [Colecciones de contenido](https://docs.astro.build/en/guides/content-collections/)
- [Componentes de framework](https://docs.astro.build/en/guides/framework-components/)
- [Internacionalización](https://docs.astro.build/en/guides/internationalization/)
- [Adaptador de Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Keystatic](https://keystatic.com/docs)
- [shadcn-svelte](https://www.shadcn-svelte.com/docs)

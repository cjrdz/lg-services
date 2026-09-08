# Configurar R2 (fotos de anuncios)

El código está escrito y probado contra el worker compilado. Falta crear los
recursos en Cloudflare: unos 10 minutos.

**Todavía no hay dominio propio**, así que esta guía va por la URL que
Cloudflare da gratis (`pub-<hash>.r2.dev`). Al final está exactamente qué
cambiar el día que compres el dominio — es **una línea**.

---

## Antes de empezar

### R2 pide un método de pago

El plan gratuito alcanza de sobra (10 GB de almacenamiento y **salida gratis**,
que es lo caro en otros proveedores), pero Cloudflare exige una tarjeta
registrada para habilitar R2. Es el único requisito que no puedo resolver yo.

Cuenta estimada para este sitio: **US$0/mes** hasta unas ~2.500 fotos.

### Nombres de los buckets

Están en `wrangler.jsonc` como `lg-services-media` (producción) y
`lg-services-media-dev` (pruebas locales). Si preferís otros, decime y los
cambio en un solo lugar.

---

## 1. Crear los buckets

```bash
bunx wrangler r2 bucket create lg-services-media
bunx wrangler r2 bucket create lg-services-media-dev
```

## 2. Activar la URL pública

En el panel de Cloudflare:

1. **R2** → bucket `lg-services-media` → **Settings**
2. **Public Development URL** → _Allow Access_
3. Copiá la URL que aparece. Se ve así:
   `https://pub-a1b2c3d4e5f6.r2.dev`

## 3. Pegarla en la configuración

En `wrangler.jsonc` hay un marcador. Reemplazalo:

```jsonc
"vars": {
  "PUBLIC_MEDIA_BASE_URL": "https://pub-a1b2c3d4e5f6.r2.dev"   // ← la tuya
}
```

Ese es **el único lugar** donde se define. Todas las URLs de fotos —
`<R2Image>`, las tarjetas del listado, las miniaturas de `/estudio` — salen de
`r2Url()` en `src/lib/media/r2.ts`, que lee de ahí.

> **Va en `wrangler.jsonc`, no en `.env`.** El plugin de Cloudflare inyecta las
> `vars` de wrangler en el build, y **le ganan** a cualquier variable de
> entorno del shell. Probar con `PUBLIC_MEDIA_BASE_URL=... bun run build` no
> hace nada. (El `R2_PUBLIC_BASE_URL` de `.env.example` es otra cosa: lo usan
> solo los scripts locales de mantenimiento.)

Mientras diga `PENDIENTE-…`, las fotos de anuncios simplemente **no se
dibujan** — `r2Url()` devuelve vacío y `<R2Image>` no emite `<img>`. Es a
propósito: mejor un hueco que un `<img>` roto apuntando a una dirección
inventada.

> **Qué esperar de `r2.dev`:** funciona bien y es gratis, pero Cloudflare la
> limita por tasa y no la recomienda para tráfico de producción. Además, al no
> ser una zona de tu cuenta, no hay caché configurable, ni analítica, ni WAF.
> Para arrancar y para que Lisbeth cargue sus primeros anuncios está perfecto.

## 4. Regla de ciclo de vida en `trash/` — no te la saltes

Borrar una foto en `/estudio` **no la borra**: la copia a `trash/<fecha>/` y
recién después quita el original. Esta regla es lo que hace que ese respaldo se
limpie solo.

En el panel: **R2** → bucket → **Settings** → **Object lifecycle rules** →
_Add rule_

- Nombre: `expirar-papelera`
- Prefijo: `trash/`
- Acción: _Delete objects_ a los **30 días**

Sin esta regla la papelera crece para siempre. Con ella, "borré la que no era"
es recuperable durante un mes.

## 5. Confirmar

```bash
bun run cf-typegen      # regenera los tipos del binding
bun run deploy:check    # debe listar env.MEDIA como R2 Bucket
```

---

## Probar el estudio

`astro dev` **no** tiene binding de R2 (corre en Node, sin el adaptador de
Cloudflare), así que `/api/media/*` responde con un mensaje explicando eso en
vez de funcionar a medias. Para probar de verdad hace falta el worker
compilado:

```bash
bun run build && bun run preview
```

Eso levanta `wrangler dev` con un R2 **local** en `.wrangler/`: podés subir
fotos sin tocar la nube ni gastar cuota.

Para pasar de la pantalla de entrada hace falta sesión de GitHub, y eso depende
de la GitHub App — que es la fase 6. Mientras tanto se puede comprobar que la
protección funciona:

```bash
curl -s "localhost:8787/api/media/list?vertical=propiedades"    # 401 sin sesión
```

---

## Cuando compres el dominio

El cambio de fotos es **una línea**. Lo demás es el dominio del sitio.

### 1. Meter el dominio en Cloudflare

Comprarlo donde sea y apuntar los nameservers a Cloudflare (o comprarlo
directamente en Cloudflare Registrar, que evita el paso).

### 2. Conectar el bucket a un subdominio

**R2** → bucket → **Settings** → **Custom Domains** → _Connect Domain_ →
`cdn.tudominio.com`

Después, **desactivá** la Public Development URL para que cada foto tenga una
sola dirección canónica.

### 3. Cambiar la línea

```jsonc
// wrangler.jsonc
"PUBLIC_MEDIA_BASE_URL": "https://cdn.tudominio.com"
```

Las fotos ya subidas **no se mueven**: en el contenido se guarda solo la ruta
(`media/propiedades/casa-x/k7x2f9a1`), nunca la URL completa. Por eso cambiar
el dominio no obliga a reeditar ningún anuncio. Ese fue el motivo del diseño.

### 4. Y el dominio del SITIO (aparte del de las fotos)

Ojo con esto, que es fácil de pasar por alto. Hoy `astro.config.mjs` tiene:

```js
site: "https://lisbethgutierrez.com";
```

Eso alimenta la URL canónica, el sitemap, los hreflang y las imágenes de Open
Graph. Mientras el sitio viva en `*.workers.dev`, esos valores apuntan a un
dominio que todavía no es tuyo: **los buscadores no van a indexar bien y al
compartir por WhatsApp la vista previa va a salir sin imagen.**

Dos caminos:

- **Si vas a desplegar ya**, cambiá `site` por la URL de workers.dev que te dé
  Cloudflare, y volvé a cambiarla cuando tengas el dominio.
- **Si el despliegue puede esperar** al dominio (recomendado), dejalo como está
  y no hay nada que hacer.

Esto no bloquea nada de R2: podés crear los buckets y subir fotos hoy mismo.

---

## Lo que ya está hecho y verificado

- `wrangler.jsonc` con el binding `MEDIA` y `nodejs_compat`; `deploy --dry-run`
  lo lista correctamente.
- `/api/media/{upload,list,delete}` — 401 sin sesión, 403 desde otro origen.
- `/estudio` con generación de WebP en el navegador (5 anchos), reintentos
  idempotentes, aviso de sin conexión, wake lock, deduplicación por SHA-256 y
  mensaje específico para HEIC de iPhone.
- Colección `propiedades` en Keystatic, con validaciones cruzadas que hacen
  fallar el build (portada inexistente, terreno con habitaciones, alquiler con
  precio total, distrito de otro departamento).

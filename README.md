# lg-services

Sitio de **Lisbeth Gutiérrez** — asesoría legal, propiedades y alquiler de vehículos
en El Salvador.

Reemplaza a `lg-blog`. La diferencia de fondo: aquí el contenido lo edita ella misma
desde `/keystatic`, sin tocar git ni la terminal.

## Stack

Astro 7 · Svelte 5 · Tailwind v4 · shadcn-svelte · Keystatic 6 · Cloudflare Workers + R2

## Requisitos

- Node 22.12+
- Bun 1.4+

## Empezar

```bash
bun install
cp .env.example .env    # llenar cuando toque configurar Keystatic
bun run dev             # http://localhost:4321
```

El panel de administración vive en `/keystatic` (modo local en desarrollo, modo
GitHub en producción).

## Comandos

| Comando                | Qué hace                                                       |
| ---------------------- | -------------------------------------------------------------- |
| `bun run dev`          | Servidor de desarrollo                                         |
| `bun run verify`       | Colores + tipos + tests + build. **Correr antes de commitear** |
| `bun run build`        | Build de producción                                            |
| `bun run deploy:check` | Build + `wrangler deploy --dry-run`                            |
| `bun run deploy`       | Build y despliegue a Cloudflare                                |
| `bun run cf-typegen`   | Regenerar tipos del Worker tras editar `wrangler.jsonc`        |

## Estructura

```
src/
├─ pages/[...lang]/     Todas las rutas. El segmento de idioma es opcional:
│                       un solo archivo sirve /contacto/ y /en/contacto/.
├─ i18n/                config (LOCALES), routing (localizedUrl), textos
├─ components/
│  └─ ui/               Generado por shadcn-svelte — no editar a mano
├─ lib/
└─ styles/global.css    ÚNICO lugar donde se definen colores
```

Las convenciones del proyecto están en [`AGENTS.md`](./AGENTS.md).

## Despliegue

Cloudflare Workers con assets estáticos. Las fotos de los anuncios viven en un bucket
R2 (`MEDIA`), servido desde un dominio propio — no desde la URL `pub-*.r2.dev`.

```bash
bunx wrangler r2 bucket create lg-services-media
bunx wrangler secret put KEYSTATIC_SECRET
bun run deploy
```

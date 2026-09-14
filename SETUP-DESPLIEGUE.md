# Desplegar a Cloudflare

El sitio ya funciona entero en local. Falta conectarlo a Cloudflare y a GitHub
para que Lisbeth pueda publicar sola.

**Dominio: `gutierrezgroup.blog`, comprado en Porkbun.** `PUBLIC_SITE_URL` en
`wrangler.jsonc` ya apunta ahí. Falta el lado de infraestructura, que no vive
en el repo:

1. Cloudflare → **Workers & Pages** → `lg-services` → **Settings** → **Domains
   & Routes** → **Add** → Custom domain → `gutierrezgroup.blog`.
2. Cloudflare te da los registros DNS a poner. Se cargan en **Porkbun** (el
   dominio no necesita pasar a los nameservers de Cloudflare para esto: un
   registro custom domain de Workers funciona con Porkbun como DNS, o podés
   mover los nameservers a Cloudflare si preferís administrar el DNS ahí).
3. Repetir para `www.gutierrezgroup.blog` si vas a servir ambos, o agregar una
   redirección de `www` → apex (o al revés) en Cloudflare.

Hasta que ese paso quede hecho, el Worker sigue respondiendo también en su URL
de `*.workers.dev` — sirve para seguir probando mientras el DNS propaga.

---

## Orden

1. Desplegar (para tener un Worker en Cloudflare)
2. Conectar `gutierrezgroup.blog` como dominio propio del Worker (Cloudflare +
   DNS en Porkbun)
3. Crear la GitHub App de Keystatic
4. Configurar el correo del formulario
5. R2 para las fotos → `SETUP-R2.md`

---

## 1. Desplegar por primera vez

```bash
bunx wrangler login          # abre el navegador
bun run deploy
```

Al final imprime la URL de `*.workers.dev`. Sirve para probar mientras el
dominio propio no esté conectado todavía.

## 2. Conectar el dominio propio

`PUBLIC_SITE_URL` en `wrangler.jsonc` ya está en `https://gutierrezgroup.blog`
— **no es cosmético**: de ahí salen la URL canónica, el sitemap, los hreflang y
la imagen de Open Graph, así que hasta que el dominio responda de verdad, esos
valores apuntan a algo que todavía no sirve la página (Google indexaría mal,
WhatsApp no traería vista previa).

Para que responda: seguir los tres pasos de arriba (Cloudflare → Domains &
Routes → Add → `gutierrezgroup.blog`, y cargar los registros DNS que da
Cloudflare en Porkbun). No hace falta volver a tocar `wrangler.jsonc` ni
volver a desplegar solo por esto.

## 3. GitHub App para Keystatic

Esto es lo que le permite a Lisbeth publicar sin tocar git: entra a
`/keystatic`, edita, guarda, y Keystatic commitea por ella.

1. Entrá a `https://<tu-url>/keystatic`
2. Te va a ofrecer conectar el repo. Seguí el asistente: crea una GitHub App a
   tu nombre y te pide autorizarla sobre `cjrdz/lg-services`.
3. Al terminar te da tres valores. Cargalos como **secretos del Worker** (no en
   `wrangler.jsonc`, que va al repo):

```bash
bunx wrangler secret put KEYSTATIC_GITHUB_CLIENT_ID
bunx wrangler secret put KEYSTATIC_GITHUB_CLIENT_SECRET
bunx wrangler secret put KEYSTATIC_SECRET          # openssl rand -hex 32
```

4. El slug de la App sí es público y va en `wrangler.jsonc`:

```jsonc
"PUBLIC_KEYSTATIC_GITHUB_APP_SLUG": "el-slug-que-te-dio"
```

5. `bun run deploy`

### Darle acceso a Lisbeth

`/estudio` y `/keystatic` preguntan lo mismo: _¿esta persona puede hacer push al
repo?_ Así que alcanza con:

**GitHub → `cjrdz/lg-services` → Settings → Collaborators → Add people**, con su
cuenta de GitHub y permiso **Write**.

Un solo login para el panel y para el subidor de fotos. Para quitarle el acceso,
se la saca de colaboradores y listo.

## 4. Correo del formulario de contacto

El formulario ya valida, ya frena bots con un honeypot y ya funciona sin
JavaScript. Lo único que falta es por dónde sale el correo.

### Resend (funciona sin dominio)

1. Cuenta en [resend.com](https://resend.com) y una API key.
2. `bunx wrangler secret put RESEND_API_KEY`
3. `bun run deploy`

> **Límite mientras no haya dominio:** sin un dominio verificado, Resend solo
> deja enviar desde `onboarding@resend.dev` **y solo al correo de la cuenta**.
> Sirve para comprobar que el circuito anda, no para producción. Con dominio:
> verificarlo en Resend y cambiar `REMITENTE` en `src/lib/server/correo.ts`.

**Hasta entonces, el canal real es WhatsApp** — que en El Salvador es el que la
gente usa igual. Sin `RESEND_API_KEY` el formulario responde 503 y la interfaz
manda a WhatsApp con un mensaje claro, en vez de fingir que se envió. (El sitio
anterior sí fingía: mostraba "¡Mensaje enviado con éxito!" sin mandar nada.)

### Turnstile (opcional, contra spam)

Sin esto el formulario igual anda; el honeypot frena a los bots simples.

1. Cloudflare → **Turnstile** → Add site → `gutierrezgroup.blog` (y tu URL de
   `*.workers.dev` mientras el dominio propio no esté conectado)
2. La clave pública va en `wrangler.jsonc`:
   ```jsonc
   "PUBLIC_TURNSTILE_SITE_KEY": "0x4AAA..."
   ```
3. La secreta como secreto:
   ```bash
   bunx wrangler secret put TURNSTILE_SECRET_KEY
   ```

Si no hay clave pública, el widget ni se dibuja y no se carga su script.

## 5. Fotos (R2)

Ver **`SETUP-R2.md`**. Hasta que esté, los anuncios muestran "Sin foto" en vez
de imágenes rotas.

---

## Comprobar que quedó bien

```bash
bun run verify                          # tipos, tests, build, enlaces
bun run deploy:check                    # valida el Worker sin publicar
bun run smoke https://<tu-url>          # navegador real contra producción
```

A mano, en el navegador:

- [ ] `/keystatic` → entra con GitHub y lista servicios, propiedades, vehículos
- [ ] `/estudio` → entra con la misma sesión (no pide login aparte)
- [ ] `/contacto/` → enviar **con JavaScript desactivado** y ver el aviso
- [ ] Compartir la home por WhatsApp y ver que la vista previa trae imagen

---

## Secretos y variables, resumidos

| Nombre                             | Dónde            | Para qué                                    |
| ---------------------------------- | ---------------- | ------------------------------------------- |
| `KEYSTATIC_GITHUB_CLIENT_ID`       | secreto          | Login del panel                             |
| `KEYSTATIC_GITHUB_CLIENT_SECRET`   | secreto          | Login del panel                             |
| `KEYSTATIC_SECRET`                 | secreto          | Firma de la sesión (`openssl rand -hex 32`) |
| `RESEND_API_KEY`                   | secreto          | Correo del formulario                       |
| `TURNSTILE_SECRET_KEY`             | secreto          | Anti-spam (opcional)                        |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | `wrangler.jsonc` | Login del panel                             |
| `PUBLIC_SITE_URL`                  | `wrangler.jsonc` | Canónicas, sitemap, Open Graph              |
| `PUBLIC_MEDIA_BASE_URL`            | `wrangler.jsonc` | Fotos de anuncios (R2)                      |
| `PUBLIC_TURNSTILE_SITE_KEY`        | `wrangler.jsonc` | Anti-spam (opcional)                        |

Regla: **`PUBLIC_*` va en `wrangler.jsonc`** (termina en el navegador, no es
secreto). **El resto va con `wrangler secret put`** y nunca al repo.

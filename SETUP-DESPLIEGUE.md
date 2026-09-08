# Desplegar a Cloudflare (sin dominio propio)

El sitio ya funciona entero en local. Falta conectarlo a Cloudflare y a GitHub
para que Lisbeth pueda publicar sola.

Esta guía asume **todavía sin dominio**: se despliega a `*.workers.dev`, que es
gratis y sirve para trabajar. En `SETUP-R2.md` está qué cambiar el día que
compres el dominio.

---

## Orden

1. Desplegar (para saber cuál es la URL)
2. Fijar `PUBLIC_SITE_URL` con esa URL
3. Crear la GitHub App de Keystatic
4. Configurar el correo del formulario
5. R2 para las fotos → `SETUP-R2.md`

---

## 1. Desplegar por primera vez

```bash
bunx wrangler login          # abre el navegador
bun run deploy
```

Al final imprime la URL. Va a verse así:

```
https://lg-services.<tu-subdominio>.workers.dev
```

Anotala: se usa en los pasos 2 y 3.

## 2. Fijar la URL del sitio

En `wrangler.jsonc`, reemplazá el marcador:

```jsonc
"PUBLIC_SITE_URL": "https://lg-services.<tu-subdominio>.workers.dev"
```

**No es cosmético.** De ahí salen la URL canónica, el sitemap, los hreflang y la
imagen de Open Graph. Mientras diga `PENDIENTE-…`, esos valores apuntan a
`lisbethgutierrez.com`, un dominio que todavía no es tuyo: Google indexaría mal
y al compartir por WhatsApp la vista previa saldría sin imagen.

Después: `bun run deploy` otra vez.

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

1. Cloudflare → **Turnstile** → Add site → tu dominio de workers.dev
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

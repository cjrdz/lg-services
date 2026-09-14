# Configurar Cloudflare Access (candado extra sobre /keystatic y /estudio)

Todo lo de esta guía se hace **en el dashboard de Cloudflare**, no toca ni una
línea del repo. Es gratis hasta 50 usuarios. Tiempo estimado: 15-20 minutos.

## Qué resuelve esto y qué NO resuelve

**Sí resuelve:**

- Que una laptop compartida o perdida no sea, por sí sola, la puerta al
  panel: antes de llegar siquiera a la pantalla de Keystatic, hay que pasar
  un login aparte.
- Un segundo factor (código por correo, o TOTP/llave si querés exigirlo)
  independiente de la cuenta de GitHub.
- Que solo dos correos puntuales puedan entrar — lo controlás vos, sin
  depender de quién sea colaborador en GitHub.

**NO resuelve** (y es importante tenerlo claro antes de empezar): Keystatic
sigue necesitando una cuenta de GitHub para poder guardar cambios — así
está construido `keystatic.config.ts`, en modo `github`. Con esto, Lisbeth
va a pasar por **dos pantallas de login**, no una:

1. Cloudflare Access (correo + código) — la que agrega esta guía.
2. "Sign in with GitHub" de Keystatic — la que ya existe hoy.

Sacar la cuenta de GitHub del medio por completo es un cambio más grande
(migrar Keystatic a modo "Cloud"), que queda fuera de esta guía a propósito.

---

## Antes de empezar

- Necesitás ser el dueño de la cuenta de Cloudflare donde vive el Worker
  `lg-services`.
- El dominio `gutierrezgroup.blog` ya tiene que estar conectado como Custom
  Domain del Worker (paso ya hecho — ver `SETUP-DESPLIEGUE.md`). Access se
  aplica sobre ese mismo dominio, sin tocar nada del DNS en Porkbun.

---

## 1. Activar Zero Trust (solo la primera vez)

1. Dashboard de Cloudflare → **Zero Trust** (menú lateral).
2. Si es la primera vez, pide elegir un **nombre de equipo** (team name) —
   cualquier cosa sirve, por ejemplo `gutierrezgroup`. Queda como
   `https://gutierrezgroup.cloudflareaccess.com`, la pantalla de login que va
   a ver Lisbeth.
3. Elegí el plan **Free** (hasta 50 usuarios — de sobra para 2).

## 2. Habilitar "One-Time PIN" como método de login

Zero Trust → **Settings** → **Authentication** → **Login methods** → _Add
new_ → **One-Time PIN**.

Con esto alcanza: Lisbeth escribe su correo, le llega un código de 6 dígitos,
lo pone y entra. No necesita crear cuenta en ningún lado nuevo.

> Opcional, si más adelante querés exigir un segundo factor además del
> correo: en el mismo lugar podés agregar Google, GitHub o cualquier
> proveedor SSO como método adicional, y luego pedirlo en la política del
> paso 3 con una regla "Require".

## 3. Crear una política reusable con los 2 correos

Zero Trust → **Access** → **Policies** → _Add a policy_.

- **Nombre:** `Panel de administración` (o el que prefieras).
- **Acción:** `Allow`.
- **Reglas → Include:** `Emails` → escribí los 2 correos exactos (el tuyo y
  el de Lisbeth).
- Guardala como **política reusable** (checkbox "reusable policy" o similar
  según la versión del dashboard) para no tener que repetir los correos 4
  veces en el paso siguiente.

## 4. Crear la aplicación (o las 4 aplicaciones) de Access

Esto protege las rutas exactas que menciona el comentario en
`src/lib/server/auth.ts`: **las cuatro, no una sola** — si falta una, esa
queda con la puerta de atrás abierta.

Zero Trust → **Access** → **Applications** → _Add an application_ →
**Self-hosted**.

- **Application domain:** `gutierrezgroup.blog`
- **Path:** `/keystatic`

Si el dashboard te deja agregar más de un dominio/ruta a la misma aplicación
(botón tipo "+ Add public hostname" dentro del mismo formulario), agregá ahí
mismo las otras tres:

- `gutierrezgroup.blog` — `/api/keystatic`
- `gutierrezgroup.blog` — `/estudio`
- `gutierrezgroup.blog` — `/api/media`

Si tu versión del dashboard solo permite **una** ruta por aplicación, repetí
este paso 4 veces (una app por ruta) y asignale a las cuatro la **misma**
política reusable del paso 3 — no hace falta volver a escribir los correos.

En **Session Duration**, elegí algo corto (por ejemplo `24 hours` o
`1 day`) — es el control real contra "se quedó la sesión abierta en una
laptop compartida": cuando expira, hay que pasar por Access de nuevo.

## 5. Guardar y publicar

Al guardar la aplicación, Cloudflare la activa al instante — no hace falta
`bun run deploy` ni tocar `wrangler.jsonc`. Access vive en la capa de
Cloudflare, delante del Worker.

---

## Comprobar que quedó bien

Desde un navegador **sin sesión** (ventana privada):

```bash
curl -sI https://gutierrezgroup.blog/keystatic/   | head -1   # debe ser 302 hacia cloudflareaccess.com
curl -sI https://gutierrezgroup.blog/estudio/     | head -1   # ídem
curl -s  https://gutierrezgroup.blog/api/media/list | head -c 200   # bloqueado antes de llegar al Worker
```

A mano, en el navegador:

- [ ] Entrar a `https://gutierrezgroup.blog/keystatic/` sin sesión → redirige
      a la pantalla de Cloudflare Access, no al panel.
- [ ] Iniciar sesión con uno de los 2 correos permitidos → recibe el código
      por correo → al validarlo, **ahora sí** aparece Keystatic — y ahí
      todavía hace falta tocar "Sign in with GitHub" para poder guardar
      cambios. Eso sigue igual que antes.
- [ ] Probar con un correo que **no** esté en la política → Access lo
      rechaza antes de mostrar nada del sitio.
- [ ] Repetir la primera comprobación con `/estudio/`.
- [ ] Navegar el sitio público (`/`, `/servicios`, `/blog`, etc.) sin sesión
      → nada de esto debería pedir login. Si algo público empieza a pedir
      Access, revisar que el **Path** de la aplicación quedó como
      `/keystatic`, `/api/keystatic`, `/estudio` y `/api/media` — nunca `/`
      ni vacío.

---

## Para quitarle el acceso a alguien

Zero Trust → **Access** → **Policies** → editar `Panel de administración` →
sacar su correo de la lista. No hace falta tocar GitHub ni el repo para esta
parte — aunque, si esa persona también tenía acceso de "Sign in with
GitHub", record que **eso se revoca aparte** (GitHub → repo → Collaborators),
como ya explica `SETUP-DESPLIEGUE.md`.

---

## Si más adelante querés sacar la cuenta de GitHub del todo

Esta guía deja resuelto el candado de entrada. Para que Lisbeth deje de
necesitar una cuenta de GitHub incluso para el paso de **guardar contenido**
(no solo para entrar), hace falta migrar Keystatic de modo `github` a modo
`cloud` (Keystatic Cloud) — un cambio de arquitectura aparte, que incluye
reescribir cómo `/estudio` valida quién puede subir fotos
(`src/lib/server/auth.ts`), porque ya no existiría el cookie
`keystatic-gh-access-token` en el que se apoya hoy. Si en algún momento
querés encarar eso, es una tarea separada — avisame y lo planeamos.

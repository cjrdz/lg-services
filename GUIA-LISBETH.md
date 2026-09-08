# Guía para publicar en el sitio

Todo se hace desde el panel, en el navegador. No hace falta instalar nada ni
saber de programación.

**Panel:** `https://<direccion-del-sitio>/keystatic`
**Subir fotos:** `https://<direccion-del-sitio>/estudio`

Entrás a los dos con tu cuenta de GitHub. Es el mismo usuario y la misma
contraseña para ambos.

---

## Antes que nada: no le podés romper nada

Cada vez que guardás, el sitio revisa lo que escribiste antes de publicarlo. Si
algo no cuadra —un precio en cero, una foto que falta, un distrito que no
pertenece al departamento que elegiste— **no se publica y el sitio se queda como
estaba**. No hay forma de que una equivocación tuya deje la página caída.

Así que probá tranquila.

---

## Publicar una propiedad

Son dos pasos, en este orden: **primero las fotos, después el anuncio.**

### 1. Subir las fotos

1. Entrá a **`/estudio`**.
2. En «Sección» elegí **Propiedades**.
3. En «Nombre del anuncio» escribí algo que lo identifique:
   _Casa en Santa Tecla 3 habitaciones_. No importan las mayúsculas ni las
   tildes; abajo te muestra la carpeta que va a usar.
4. Arrastrá las fotos, o tocá **Elegir fotos**.
5. Esperá a que cada una diga **listo**.

Podés hacerlo desde el celular. Si se corta la señal, avisa y sigue sola cuando
vuelve. Si subís dos veces la misma foto, se da cuenta y no la repite.

> Las fotos se achican solas antes de subirse, así que no te preocupes por el
> tamaño ni por el plan de datos.

### 2. Copiar las rutas

Al lado de cada foto hay un botón **Copiar**. Copia una _ruta_, que se ve así:

```
media/propiedades/casa-santa-tecla-3h/k7x2f9a1
```

Es la dirección interna de la foto. **No es un enlace para abrir en el
navegador**: es lo que hay que pegar en el panel.

### 3. Crear el anuncio

1. Entrá a **`/keystatic`** → **Propiedades** → **+ Nueva**.
2. Llená los datos. Los que más importan:
   - **Código**: `P-0001`, `P-0002`… Sirve para que un cliente te lo mencione
     por teléfono.
   - **¿Se vende o se alquila?** y **El precio es…** tienen que coincidir:
     venta → precio total, alquiler → renta mensual.
   - **Departamento** y **Distrito**: al elegir el departamento, el distrito te
     muestra solo los que le corresponden.
   - **Galería**: por cada foto, **Añadir**, pegá la ruta que copiaste, y
     escribí qué se ve _(«Fachada frontal con jardín»)_. Esa descripción la usan
     Google y los lectores de pantalla.
   - **Foto principal**: `0` es la primera de la galería, `1` la segunda.
3. Dejá **Borrador** marcado mientras la armás.
4. Cuando esté lista, desmarcá **Borrador** y guardá.

El sitio se actualiza solo en un minuto más o menos.

---

## Publicar un vehículo

Igual que una propiedad, pero en **`/estudio`** elegís **Vehículos** y en el
panel entrás a **Vehículos**.

Dos cosas que el sitio no te va a dejar guardar, porque casi siempre son un
error de tipeo:

- Una **tarifa semanal** más cara que siete días sueltos.
- Una **tarifa mensual** más cara que treinta días sueltos.

Si elegís **kilometraje limitado**, tenés que decir cuántos kilómetros incluye
por día.

---

## Cuando se vende o se alquila algo

**No lo borres.** Abrí el anuncio y cambiá **Estado**:

- Propiedades: _Vendido_ o _Alquilado_
- Vehículos: _Alquilado_ o _En mantenimiento_

Deja de aparecer en el listado, pero conserva su dirección web. Sirve para que
alguien que lo tenía guardado no se encuentre con un error, y para mostrar lo
que ya se movió.

---

## Escribir en el blog

1. **`/keystatic`** → **Blog** → **+ Nueva**.
2. **Título** y **Dirección web**: la dirección va como `área/nombre-del-articulo`,
   por ejemplo `derecho-laboral/despido-injustificado`. La primera parte tiene
   que ser la misma área que elegís abajo.
3. **Resumen / descripción para Google**: entre 70 y 160 caracteres. Es el texto
   gris que sale debajo del título en los resultados de búsqueda. Si te pasás o
   no llegás, el panel te avisa.
4. Escribí el contenido.
5. Desmarcá **Borrador** cuando esté listo.

---

## Cambiar los datos de contacto

**`/keystatic`** → **Sitio** → **Datos de contacto**.

El teléfono va exactamente así: `+503 7777-7777`. El de WhatsApp va solo con
números, sin espacios ni signos: `50377777777`.

---

## Esconder una sección entera

**`/keystatic`** → **Sitio** → **Configuración general** → **Secciones visibles**.

Desmarcá _Propiedades_, _Vehículos_ o _Blog_ y esa sección desaparece del menú y
del inicio, sin borrar nada. Volver a marcarla la trae de vuelta tal como
estaba.

---

## Si algo sale mal

**Guardé y no aparece en el sitio.**
Fijate que **Borrador** esté desmarcado. Si lo está, esperá un par de minutos:
el sitio tarda un momento en actualizarse.

**Una foto sale como «Sin foto».**
La ruta está mal. Volvé a `/estudio` y copiala con el botón **Copiar** — no la
escribas a mano ni pegues la dirección de la barra del navegador.

**Borré una foto que no era.**
Se puede recuperar durante 30 días. Avisale a Jonathan.

**El panel no me deja entrar.**
Revisá que estés con la cuenta de GitHub correcta.

---

## Lo que conviene no tocar

En **Configuración general** hay campos marcados como técnicos. Si los cambiás
sin querer, el sitio puede dejar de mostrar las fotos. Ante la duda, preguntá
antes.

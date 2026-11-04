# Multijugador online: UI lista, backend pendiente

Issues: [#63 Auth](https://github.com/Jgmaza/hold-the-box/issues/63) · [#66 Salas](https://github.com/Jgmaza/hold-the-box/issues/66) · [#68 Micro](https://github.com/Jgmaza/hold-the-box/issues/68) · (sync de la partida: [#67](https://github.com/Jgmaza/hold-the-box/issues/67))

## Qué ya está

Menú → **Multijugador** abre `apps/src/ui/online.js`:

```
correo → "revisa tu correo" → nombre (3–16) → lobby (crear sala / unirse con código) → sala (P1/P2, LISTO, micro)
```

- **Local** no cambia y no pide login.
- **Celular / tablet** (rama `issue/mobile-touch`): cada jugador juega en su aparato, así que ahí no aparece Local y Multijugador es el botón principal. En partida hay joystick (mitad izquierda), saltar (abajo a la derecha) y pausa. Hoy el táctil mueve a P1; cuando exista #67 debe mover al jugador de `room.me`. Para probar sin #67: `?level=muelle` en el celular. Detalle en [`celular.md`](./celular.md).
- Hoy la UI usa un **backend demo** (`apps/src/online/demoBackend.js`, se ve la etiqueta **DEMO**):
  - el enlace mágico "se abre" solo a los 2,5 s;
  - `admin`, `jose` y `holdthebox` salen como nombres ocupados;
  - al crear sala llega un "Invitado" a los 2,5 s; al unirte, la sala tiene un "Anfitrion". El compañero marca LISTO 1,2 s después de ti.
- **Micro real**: `apps/src/online/voice.js` pide permiso, silencia/activa y mide el nivel de voz (el anillo verde del avatar). Lo que falta es mandar ese audio al otro PC.
- Cuando los dos están LISTO la sala lo muestra, pero no arranca partida: eso es #67.

## Qué falta (necesita acceso al proyecto de Supabase → Jose)

### 1. Login con enlace mágico (#63)

1. Dashboard → **Authentication → Providers → Email**: activo, con *magic link*.
2. **Authentication → URL Configuration**: Site URL `https://jgmaza.github.io/hold-the-box/` y en Redirect URLs agregar también `http://localhost:5173/`.
3. **SMTP propio** (Resend, Brevo…): el correo de Supabase por defecto manda muy pocos por hora y en la expo no alcanza.
4. Tabla de perfiles. Propuesta (mismas reglas que `apps/src/online/validate.js`):

```sql
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username) between 3 and 16),
  constraint profiles_username_chars check (username ~ '^[A-Za-z0-9_]+$')
);
create unique index profiles_username_unique on public.profiles (lower(username));

alter table public.profiles enable row level security;
create policy "perfiles visibles" on public.profiles for select using (true);
create policy "mi perfil" on public.profiles for insert with check (auth.uid() = user_id);
create policy "editar mi perfil" on public.profiles for update using (auth.uid() = user_id);
```

### 2. Salas (#66)

Propuesta sin tabla: **Supabase Realtime**, un canal `room:<CÓDIGO>` con *presence*. Cada jugador publica `{ id, username, host, ready }`.
- `full`: ya hay 2 en el canal. `not_found`: no hay nadie en el canal (el anfitrión se fue).
- Si el anfitrión sale, la sala se cierra (`room.closed = true`) y la UI vuelve al lobby con "La sala se cerró".

### 3. Voz (#68)

WebRTC P2P entre los dos PCs, con la señalización (offer / answer / ICE) por *broadcast* en el mismo canal de la sala.
- `VoiceChat.stream` es el audio del micro: se agrega al `RTCPeerConnection` y el silencio ya funciona (apaga la pista).
- STUN gratis (`stun:stun.l.google.com:19302`). En redes de eventos/colegios suele hacer falta **TURN** (Metered, Twilio…): es un servicio con costo, **decisión de Jose**.

## Cómo conectarlo

1. `npm i @supabase/supabase-js` en `apps/`.
2. Crear `apps/src/online/supabaseBackend.js` que cumpla el contrato de abajo.
3. En `apps/src/online/index.js` exportar ese backend en vez del demo (por ejemplo, si existe `VITE_SUPABASE_ANON_KEY`). La UI no cambia.

## Contrato que usa la UI

```js
online = { demo?: boolean, auth, rooms }

// auth: estado que se lee directo + aviso cuando cambia
auth.session            // { userId, email } | null
auth.profile            // { username } | null
auth.onChange(fn)       // → función para dejar de escuchar
await auth.sendMagicLink(email) // { ok: true } | { ok: false, error: 'invalid_email' | 'rate_limited' | 'network' }
await auth.setUsername(name)    // { ok: true } | { ok: false, error: 'invalid' | 'taken' | 'no_session' | 'network' }
await auth.signOut()

// salas
await rooms.create()     // { ok: true, room } | { ok: false, error: 'no_session' | 'network' }
await rooms.join(code)   // { ok: true, room } | { ok: false, error: 'invalid_code' | 'not_found' | 'full' | 'no_session' | 'network' }

room.code                // 'QU2ZY' (5 caracteres de ROOM_ALPHABET, sin O/0/I/1)
room.level               // 'muelle' en el MVP
room.me                  // id del jugador local
room.players             // [{ id, username, host, ready }], anfitrión primero (P1)
room.closed              // true si se cerró
room.onChange(fn)        // → función para dejar de escuchar
room.setReady(bool)
room.leave()
```

Los textos de cada `error` están en `ERRORS` de `apps/src/ui/online.js`. Tests: `apps/test/online.test.js`.

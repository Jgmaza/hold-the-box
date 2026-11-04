# Multijugador online: UI lista, backend pendiente

Issues: [#63 Auth](https://github.com/Jgmaza/hold-the-box/issues/63) · [#66 Salas](https://github.com/Jgmaza/hold-the-box/issues/66) · [#68 Micro](https://github.com/Jgmaza/hold-the-box/issues/68) · (sync de la partida: [#67](https://github.com/Jgmaza/hold-the-box/issues/67))

## Qué ya está

Menú → **Multijugador** abre `apps/src/ui/online.js`:

```
correo → "revisa tu correo" → nombre (3–16) → lobby (crear sala / unirse con código) → sala (P1/P2, LISTO, micro)
```

- **Local** no cambia y no pide login.
- **Invitado** (rama `issue/63-guest-login`, propuesta para comparar): en la pantalla del correo hay "Jugar como invitado". Solo pide el nombre. En el lobby el invitado ve "Guardar con correo": agrega su correo y queda con **el mismo usuario y nombre**. Idea: el multijugador se juega como invitado y el correo solo se pide para entrar al ranking (#64).
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
4. Si se usa invitado: **Authentication → Sign In / Providers → Allow anonymous sign-ins**. Conviene activar CAPTCHA (o límite por IP) para que no creen miles de cuentas, y borrar de vez en cuando los anónimos viejos que nunca guardaron correo. Guardar la cuenta es `supabase.auth.updateUser({ email })`: Supabase manda el correo de confirmación y el `user_id` no cambia, así que el perfil se conserva.
5. Tabla de perfiles. Propuesta (mismas reglas que `apps/src/online/validate.js`):

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
auth.session            // { userId, email, guest } | null   (guest: true = anónimo, email: null)
auth.profile            // { username } | null
auth.onChange(fn)       // → función para dejar de escuchar
await auth.sendMagicLink(email) // { ok: true } | { ok: false, error: 'invalid_email' | 'rate_limited' | 'network' }
await auth.signInAsGuest()      // { ok: true } | { ok: false, error: 'rate_limited' | 'network' }
await auth.linkEmail(email)     // invitado → con correo; al confirmar, session.guest = false con el mismo userId
                                // { ok: true } | { ok: false, error: 'invalid_email' | 'rate_limited' | 'no_session' | 'network' }
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

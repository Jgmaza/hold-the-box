// Qué pantalla del multijugador toca según la sesión, el perfil y la sala.
//   email (o invitado) → sent ("revisa tu correo") → username → lobby → room
//   Invitado que guarda su cuenta: lobby → email → sent → lobby (mismo usuario y nombre)

/**
 * @param {{ session: object|null, profile: {username?: string}|null, sentTo?: string|null,
 *           editingName?: boolean, linking?: boolean, room?: {closed?: boolean}|null }} s
 * @returns {'email'|'sent'|'username'|'lobby'|'room'}
 */
export function onlineStep({ session, profile, sentTo = null, editingName = false, linking = false, room = null }) {
  if (room && !room.closed) return 'room';
  if (!session || (linking && session.guest)) return sentTo ? 'sent' : 'email';
  if (!profile?.username || editingName) return 'username';
  return 'lobby';
}

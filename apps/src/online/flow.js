// Qué pantalla del multijugador toca según la sesión, el perfil y la sala.
//   email → sent ("revisa tu correo") → username → lobby → room

/**
 * @param {{ session: object|null, profile: {username?: string}|null, sentTo?: string|null,
 *           editingName?: boolean, room?: {closed?: boolean}|null }} s
 * @returns {'email'|'sent'|'username'|'lobby'|'room'}
 */
export function onlineStep({ session, profile, sentTo = null, editingName = false, room = null }) {
  if (room && !room.closed) return 'room';
  if (!session) return sentTo ? 'sent' : 'email';
  if (!profile?.username || editingName) return 'username';
  return 'lobby';
}

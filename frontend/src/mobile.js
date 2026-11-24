// ¿Celular o tablet? Para la expo solo se juega en PC (dos jugadores en un teclado).
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i;

/**
 * ?mobile fuerza la pantalla de celular (para verla desde el PC) y ?desktop fuerza el juego.
 * @param {{ search?: string, userAgent?: string, coarsePointer?: boolean, finePointer?: boolean }} env
 */
export function isMobileDevice({ search = '', userAgent = '', coarsePointer = false, finePointer = false } = {}) {
  const params = new URLSearchParams(search);
  if (params.has('mobile')) return true;
  if (params.has('desktop')) return false;
  if (MOBILE_UA.test(userAgent)) return true;
  // iPadOS se presenta como Mac: lo delata que solo tiene pantalla táctil.
  return coarsePointer && !finePointer;
}

export function detectMobile(win = window) {
  return isMobileDevice({
    search: win.location.search,
    userAgent: win.navigator.userAgent,
    coarsePointer: win.matchMedia('(pointer: coarse)').matches,
    finePointer: win.matchMedia('(any-pointer: fine)').matches,
  });
}

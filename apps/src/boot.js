// Entrada de la página: en celular muestra "Próximamente" sin descargar el juego; en PC arranca main.js.
import { detectMobile } from './mobile.js';

if (detectMobile()) {
  const { showComingSoon } = await import('./ui/comingSoon.js');
  showComingSoon(document.body);
} else {
  await import('./main.js');
}

// Pantalla de celular: logo de Hold the Box + "muy pronto". El juego no se carga.
import './theme.css';
import './menu.css';
import './comingSoon.css';

const TEMPLATE = /* html */ `
  <main class="cs">
    <div class="m-logo-wrap">
      <div class="m-rays"></div>
      <div class="m-logo">
        <span class="l1">HOLD THE</span>
        <span class="l2">BOX</span>
      </div>
    </div>
    <p class="cs-soon">¡Muy pronto<br />en celular!</p>
    <p class="cs-text">Por ahora se juega en <b>PC</b>: dos jugadores, un teclado y una caja que no pueden soltar.</p>
    <footer class="cs-credit">Game Jam 2026 · Better Together</footer>
  </main>`;

/** Reemplaza el canvas y los contenedores del juego por la pantalla de "muy pronto". */
export function showComingSoon(root) {
  for (const id of ['app', 'ui', 'menu']) document.getElementById(id)?.remove();
  root.insertAdjacentHTML('beforeend', TEMPLATE);
}

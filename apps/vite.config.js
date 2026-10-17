import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const deliveriesDir = fileURLToPath(new URL('../deliveries', import.meta.url));
const deliveriesModule = fileURLToPath(new URL('./src/view/deliveries.js', import.meta.url));

/** Recarga el juego cuando alguien agrega/borra un archivo en deliveries/ (está fuera de apps/). */
function watchDeliveries() {
  return {
    name: 'watch-deliveries',
    configureServer(server) {
      server.watcher.add(deliveriesDir);
      const onChange = (file) => {
        if (!file.startsWith(deliveriesDir)) return;
        const mod = server.moduleGraph.getModuleById(deliveriesModule);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('change', (file) => file.endsWith('PALETTE.md') && onChange(file));
    },
  };
}

export default defineConfig({
  // Rutas relativas: dist/ funciona en cualquier carpeta (itch.io, GitHub Pages, un USB...).
  base: './',
  plugins: [watchDeliveries()],
  server: {
    // Permite leer ../deliveries (PNG, audio y paleta del equipo).
    fs: { allow: ['..'] },
    open: false,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000, // PlayCanvas pesa ~2 MB sin comprimir
  },
  test: {
    include: ['test/**/*.test.js'],
  },
});

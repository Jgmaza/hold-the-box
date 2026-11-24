// Servicios online que usa la UI (ui/online.js). Por ahora usa la demo;
// para conectar otro basta con exportar aquí un objeto con el mismo contrato que demoBackend.js.
import { createDemoBackend } from './demoBackend.js';

export const online = createDemoBackend();

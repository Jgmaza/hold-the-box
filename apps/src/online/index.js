// Servicios online que usa la UI (ui/online.js). Mientras no exista el backend con Supabase se usa la demo;
// para conectarlo basta con exportar aquí un objeto con el mismo contrato (docs/online.md).
import { createDemoBackend } from './demoBackend.js';

export const online = createDemoBackend();

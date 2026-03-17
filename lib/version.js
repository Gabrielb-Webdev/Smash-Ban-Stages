// Fuente única de verdad para la versión de la aplicación web.
// Para subir versión: cambiar este archivo + package.json y hacer commit.
// Convención: MAJOR.MINOR  (ej: 1.1 → 1.2 al agregar features, 1.1 → 2.0 al cambiar arquitectura)

export const APP_VERSION = '1.1';

// CommonJS export para next.config.js
if (typeof module !== 'undefined') module.exports = { APP_VERSION: '1.1' };

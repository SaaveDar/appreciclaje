// src/app/app.config.ts

import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';

// 👇 Importa y registra el idioma español
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs); // ✅ Activa el idioma español en Angular

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),

    // ✅ Define el idioma global como español (Perú)
    { provide: LOCALE_ID, useValue: 'es-PE' } // puedes usar 'es' si lo prefieres más general
  ]
};

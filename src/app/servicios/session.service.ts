// src/app/servicios/session.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { Router } from '@angular/router';

import { interval, Subscription } from 'rxjs';
import { AuthService } from '../servicios/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.initSessionListeners();
    }
  }

  private initSessionListeners() {
    // Cerrar sesión al cerrar o recargar navegador
    window.addEventListener('beforeunload', () => {
      this.logoutUser();
    });

    // Detectar cuando la pestaña se oculta (minimizar o cambiar de pestaña)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logoutUser();
      } else {
        this.loginUser();
      }
    });

    // Detectar pérdida de foco (opcional)
    window.addEventListener('blur', () => {
      this.logoutUser();
    });

    // Detectar enfoque (opcional)
    window.addEventListener('focus', () => {
      this.loginUser();
    });
  }

  private logoutUser() {
    const usuario = this.authService.usuarioActualValue;
    if (usuario?.correo) {
      this.authService.actualizarEstadoDesconectado(usuario.correo).subscribe();
    }
  }

  private loginUser() {
    const usuario = this.authService.usuarioActualValue;
    if (usuario?.correo) {
      this.authService.actualizarEstadoEnLinea(usuario.correo).subscribe();
    }
  }
}

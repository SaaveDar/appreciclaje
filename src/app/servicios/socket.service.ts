// src/app/servicios/socket.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | undefined;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      this.socket = io('http://localhost:3000'); // Cambia por tu backend
    }
  }

  escucharCambiosTiposResiduos(): Observable<any> {
    return new Observable((observer) => {
      if (!this.isBrowser || !this.socket) {
        console.warn('SocketService: No se puede escuchar, no es navegador o no hay conexión socket.');
        return;
      }

      this.socket.on('tipos-residuos-actualizado', (data) => {
        observer.next(data);
      });
    });
  }
}

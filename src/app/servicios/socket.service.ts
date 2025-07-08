// src/app/servicios/socket.service.ts
/*
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
*/
// socket.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private apiUrl = 'https://www.comunidadvapps.com/api.php?consulta=tipos-residuos';

  constructor(private http: HttpClient) {}

  escucharCambiosTiposResiduos(): Observable<any> {
    // Cada 5 segundos consulta la API
    return interval(5000).pipe(
      switchMap(() => this.http.get<any[]>(this.apiUrl))
    );
  }
}

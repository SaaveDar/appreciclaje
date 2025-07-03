// src/app/servicios/socket.service.ts
import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket = io('http://localhost:3000'); // Cambia la URL si tu backend está en otro lugar

  escucharCambiosTiposResiduos(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('tipos-residuos-actualizado', (data) => {
        observer.next(data);
      });
    });
  }
}

// src/app/servicios/juego.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class JuegoService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  obtenerProgreso(usuario_id: number) {
    return this.http.get<any>(`${this.apiUrl}/progreso/${usuario_id}`);
  }
}

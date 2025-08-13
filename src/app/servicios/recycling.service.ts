import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class RecyclingService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.apiUrl = ''; // Inicializar con un valor por defecto
    if (isPlatformBrowser(this.platformId)) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.apiUrl = 'http://localhost:3000/api'; // Ruta de tu server.js en desarrollo
      } else {
        this.apiUrl = 'https://comunidadvmapps.com/api.php'; // Ruta en producción
      }
    }
  }

  getHistorialReciclaje(userId: number): Observable<any> {
    // ⚠️ Se cambia de query param a URL param para que coincida con server.js
    return this.http.get(`${this.apiUrl}/historial-reciclaje/${userId}`);
  }

  postRegistroReciclaje(formData: FormData): Observable<any> {
    // ⚠️ Se elimina el query param 'accion' para que coincida con server.js
    return this.http.post(`${this.apiUrl}/registrar-reciclaje`, formData);
  }

  getPermisoReciclaje(userId: number): Observable<any> {
    // ⚠️ Se cambia de query param a URL param para que coincida con server.js
    return this.http.get(`${this.apiUrl}/permiso-reciclaje/${userId}`);
  }

  updatePermisoReciclaje(userId: number, estado: 'activo' | 'inactivo'): Observable<any> {
    // Esta URL ya era correcta
    return this.http.post(`${this.apiUrl}/actualizar-permiso-reciclaje`, { usuario_id: userId, estado });
  }
}
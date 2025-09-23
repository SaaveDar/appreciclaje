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
    if (this.apiUrl.includes('api.php')) {
        return this.http.get(`${this.apiUrl}?consulta=historial-reciclaje&id=${userId}`);
    } else {
        return this.http.get(`${this.apiUrl}/historial-reciclaje/${userId}`);
    }
}

  postRegistroReciclaje(formData: FormData): Observable<any> {
    if (this.apiUrl.includes('api.php')) {
        return this.http.post(`${this.apiUrl}?consulta=registrar-reciclaje`, formData);
    } else {
        return this.http.post(`${this.apiUrl}/registrar-reciclaje`, formData);
    }
}

 getPermisoReciclaje(userId: number): Observable<any> {
    // CORRECCIÓN: Usar la URL correcta para producción (api.php)
    if (this.apiUrl.includes('api.php')) {
      return this.http.get(`${this.apiUrl}?consulta=permiso-reciclaje&id=${userId}`);
    } else {
      // Ruta para localhost (server.js)
      return this.http.get(`${this.apiUrl}/permiso-reciclaje/${userId}`);
    }
  }

  updatePermisoReciclaje(userId: number, estado: 'activo' | 'inactivo'): Observable<any> {
    const body = { usuario_id: userId, estado };
    if (this.apiUrl.includes('api.php')) {
        return this.http.post(`${this.apiUrl}?consulta=actualizar-permiso-reciclaje`, body);
    } else {
        return this.http.post(`${this.apiUrl}/actualizar-permiso-reciclaje`, body);
    }
}


// Obtener historial de TODOS los usuarios (solo admin)
getHistorialTodos(): Observable<any[]> {
  if (this.apiUrl.includes('api.php')) {
    // Producción (PHP)
    return this.http.get<any[]>(`${this.apiUrl}?consulta=historial-todos`);
  } else {
    // Localhost (Node.js con server.js)
    return this.http.get<any[]>(`${this.apiUrl}/historial-todos`);
  }
}

// Obtener todos los usuarios (para combobox admin)
getUsuarios(): Observable<any[]> {
  if (this.apiUrl.includes('api.php')) {
    // Producción (PHP)
    return this.http.get<any[]>(`${this.apiUrl}?consulta=usuarios`);
  } else {
    // Localhost (Node.js con server.js)
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`);
  }
}


getHistorialPorUsuario(usuarioId?: number | null): Observable<any[]> {

  if (this.apiUrl.includes('api.php')) {
    // Producción (PHP)
    let url = `${this.apiUrl}?consulta=usuarios_x_id`;
    if (usuarioId) url += `&usuarioId=${usuarioId}`;
    return this.http.get<any[]>(url);
  } else {
    // Localhost (Node.js con server.js)
    let url = `${this.apiUrl}/usuarios_x_id`;
    if (usuarioId) url += `?usuarioId=${usuarioId}`;
    return this.http.get<any[]>(url);
  }
}




}
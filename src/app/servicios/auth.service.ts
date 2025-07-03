import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs'; // Importar Observable

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isBrowser: boolean;
  usuario$ = new BehaviorSubject<any>(null); // ⬅️ Observable para el usuario

  // URL base de tu servidor Node.js
  private readonly NODE_API_URL = 'http://localhost:3000/api'; // Ajusta esto para producción (ej. https://tudominio.com/api)

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Solo si es navegador, recuperar usuario
    if (this.isBrowser) {
      const usuarioGuardado = sessionStorage.getItem('usuario');
      if (usuarioGuardado) {
        this.usuario$.next(JSON.parse(usuarioGuardado));
      }
    }
  }

  registrarUsuario(data: any): Observable<any> {
    // ✅ Ahora apunta al endpoint de Node.js
    return this.http.post(`${this.NODE_API_URL}/registrar`, data);
  }

  loginUsuario(data: any): Observable<any> {
    // ✅ Ahora apunta al endpoint de Node.js
    return this.http.post(`${this.NODE_API_URL}/login`, data);
  }

  // Puedes añadir un método para guardar el token si lo necesitas para rutas protegidas
  guardarToken(token: string) {
    if (this.isBrowser) {
      sessionStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (this.isBrowser) {
      return sessionStorage.getItem('token');
    }
    return null;
  }

  actualizarUsuario(usuario: any) {
    if (this.isBrowser) {
      sessionStorage.setItem('usuario', JSON.stringify(usuario));
      this.usuario$.next(usuario);
    }
  }

  limpiarUsuario() {
    if (this.isBrowser) {
      sessionStorage.removeItem('usuario');
      sessionStorage.removeItem('token'); // Asegurarse de limpiar el token también
      this.usuario$.next(null);
    }
  }
}
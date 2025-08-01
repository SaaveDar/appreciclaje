import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isBrowser: boolean;
  usuario$ = new BehaviorSubject<any>(null);

  private readonly API_URL = this.isLocalhost()
    ? 'http://localhost:3000/api'
    : 'https://comunidadvapps.com/api.php'; // Solo en producción con PHP

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      const usuarioGuardado = sessionStorage.getItem('usuario');
      if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);
        this.usuario$.next(usuario);

        // ✅ Al recuperar el usuario, actualiza el estado a "en línea"
        this.actualizarEstadoEnLinea(usuario.correo);
      }

      // Detecta cambios de sesión en otras pestañas
      interval(5000).subscribe(() => {
        const usuarioActual = sessionStorage.getItem('usuario');
        const usuarioParsed = usuarioActual ? JSON.parse(usuarioActual) : null;
        const actual = this.usuario$.value;
        if (JSON.stringify(actual) !== JSON.stringify(usuarioParsed)) {
          this.usuario$.next(usuarioParsed);
        }
      });
    }
  }

  private isLocalhost(): boolean {
    return typeof window !== 'undefined' && window.location.hostname === 'localhost';
  }

  registrarUsuario(data: any): Observable<any> {
    const url = this.isLocalhost()
      ? `${this.API_URL}/registrar`
      : `${this.API_URL}?consulta=registrar`;

    return this.http.post(url, data);
  }

  loginUsuario(data: any): Observable<any> {
    const url = this.isLocalhost()
      ? `${this.API_URL}/login`
      : `${this.API_URL}?consulta=login`;

    return this.http.post(url, data);
  }

  guardarToken(token: string) {
    if (this.isBrowser) {
      sessionStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    return this.isBrowser ? sessionStorage.getItem('token') : null;
  }

  actualizarUsuario(usuario: any) {
    if (this.isBrowser) {
      sessionStorage.setItem('usuario', JSON.stringify(usuario));
      this.usuario$.next(usuario);

      // ✅ Actualiza el estado a "en línea" también cuando se actualiza manualmente
      if (usuario?.correo) {
        this.actualizarEstadoEnLinea(usuario.correo);
      }
    }
  }

  limpiarUsuario() {
    if (this.isBrowser) {
      this.guardarUltimaConexion();

      const usuario = this.usuario$.value;
      if (usuario?.correo) {
        this.actualizarEstadoDesconectado(usuario.correo);
      }

      sessionStorage.removeItem('usuario');
      sessionStorage.removeItem('token');
      this.usuario$.next(null);
    }
  }

  guardarUltimaConexion() {
    if (this.isBrowser) {
      const ahora = new Date().toISOString();
      sessionStorage.setItem('ultimaConexion', ahora);
    }
  }

  getUltimaConexion(): string | null {
    return this.isBrowser ? sessionStorage.getItem('ultimaConexion') : null;
  }

  actualizarEstadoEnLinea(correo: string): void {
    const body = {
      accion: 'actualizar-estado',
      correo: correo,
      estado: 'en linea'
    };

    const url = this.API_URL.includes('api.php') ? this.API_URL : `${this.API_URL}/estado`;

    this.http.post<any>(url, body).subscribe({
      next: () => console.log('✅ Estado actualizado: en línea'),
      error: err => console.error('❌ Error al actualizar estado:', err)
    });
  }

  actualizarEstadoDesconectado(correo: string): void {
    const body = {
      accion: 'actualizar-estado',
      correo: correo,
      estado: 'desconectado'
    };

    const url = this.API_URL.includes('api.php') ? this.API_URL : `${this.API_URL}/estado`;

    this.http.post<any>(url, body).subscribe({
      next: () => console.log('📴 Estado actualizado: desconectado'),
      error: err => console.error('❌ Error al actualizar desconexión:', err)
    });
  }
}

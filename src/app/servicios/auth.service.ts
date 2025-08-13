// src/app/servicios/auth.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams  } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isBrowser: boolean;
  usuario$ = new BehaviorSubject<any>(null);

  private readonly API_URL = this.isLocalhost()
    ? 'http://localhost:3000/api'
    : 'https://comunidadvmapps.com/api.php';

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

        this.actualizarEstadoEnLinea(usuario.correo).subscribe();
      }

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

    return new Observable(observer => {
      this.http.post<any>(url, data).subscribe({
        next: (response) => {
          if (response.usuario) {
            sessionStorage.setItem('usuario', JSON.stringify(response.usuario));
            sessionStorage.setItem('token', response.token);
            this.usuario$.next(response.usuario);

            this.actualizarEstadoEnLinea(response.usuario.correo).subscribe(() => {
              const usuarioActualizado = { ...response.usuario, en_linea: 1 };
              this.usuario$.next(usuarioActualizado);
              observer.next(response);
              observer.complete();
            });
          } else {
            observer.error('Respuesta de login inválida');
          }
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
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

      if (usuario?.correo) {
        this.actualizarEstadoEnLinea(usuario.correo).subscribe();
      }
    }
  }

  limpiarUsuario() {
    if (this.isBrowser) {
      this.guardarUltimaConexion();

      const usuario = this.usuario$.value;
      if (usuario?.correo) {
        this.actualizarEstadoDesconectado(usuario.correo).subscribe();
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

  // ✅ CORREGIDO: Ahora devuelve el Observable para que el componente se suscriba
  actualizarEstadoEnLinea(correo: string): Observable<any> {
    const body = {
      correo: correo,
      estado: 'en linea'
    };

    const url = this.API_URL.includes('api.php')
      ? `${this.API_URL}?consulta=actualizar-estado`
      : `${this.API_URL}/estado`;

    return this.http.post<any>(url, body).pipe(
      tap(() => console.log('✅ Estado actualizado: en línea')),
      catchError(err => {
        console.error('❌ Error al actualizar estado:', err);
        return of(null);
      })
    );
  }

  // ✅ CORREGIDO: Ahora devuelve el Observable para que el componente se suscriba
  actualizarEstadoDesconectado(correo: string): Observable<any> {
    const body = {
      correo: correo,
      estado: 'desconectado'
    };

    const url = this.API_URL.includes('api.php')
      ? `${this.API_URL}?consulta=actualizar-estado`
      : `${this.API_URL}/estado`;

    return this.http.post<any>(url, body).pipe(
      tap(() => console.log('📴 Estado actualizado: desconectado')),
      catchError(err => {
        console.error('❌ Error al actualizar desconexión:', err);
        return of(null);
      })
    );
  }

 cambiarContrasena(data: { id_usuario: number, nueva_contrasena: string }): Observable<any> {
  const url = this.isLocalhost()
    ? `${this.API_URL}/cambiar-contrasena` // Node.js en localhost
    : `${this.API_URL}?consulta=cambiar-contrasena`; // api.php en Producción

  return this.http.post<any>(url, data).pipe(
    tap(() => console.log('🔒 Contraseña actualizada en backend')),
    catchError(err => {
      console.error('❌ Error al cambiar contraseña:', err);
      return of(null);
    })
  );
}

solicitarRecuperacion(correo: string): Observable<any> {
  const url = this.API_URL.includes('api.php')
    ? `${this.API_URL}?consulta=recuperar-contrasena`
    : `${this.API_URL}/recuperar-contrasena`;

  // Change the body to a JSON object
  const body = { correo: correo };

  // Remove the custom Content-Type header as Angular sets 'application/json' by default
  return this.http.post<any>(url, body);
}



}
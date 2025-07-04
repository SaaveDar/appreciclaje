// src/app/servicios/auth.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isBrowser: boolean;
  usuario$ = new BehaviorSubject<any>(null);

  // ✅ URL base correcta para tu API PHP
  private readonly API_URL = 'https://comunidadvapps.com/api.php';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Recuperar usuario guardado
    if (this.isBrowser) {
      const usuarioGuardado = sessionStorage.getItem('usuario');
      if (usuarioGuardado) {
        this.usuario$.next(JSON.parse(usuarioGuardado));
      }
    }
  }

  // ✅ Registro apunta a tu api.php con consulta=registrar
  registrarUsuario(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}?consulta=registrar`, data);
  }

  // ✅ Login apunta a tu api.php con consulta=login
  loginUsuario(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}?consulta=login`, data);
  }

  // ✅ Métodos locales (sin cambios)
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
    }
  }

  limpiarUsuario() {
    if (this.isBrowser) {
      sessionStorage.removeItem('usuario');
      sessionStorage.removeItem('token');
      this.usuario$.next(null);
    }
  }
}

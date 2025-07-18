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

  private readonly API_URL = this.isLocalhost()
    ? 'http://localhost:3000/api' // Node.js local
    : 'https://comunidadvapps.com/api.php'; // PHP en producción

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // ✅ Solo acceder a sessionStorage si es navegador
    if (this.isBrowser) {
      const usuarioGuardado = sessionStorage.getItem('usuario');
      if (usuarioGuardado) {
        this.usuario$.next(JSON.parse(usuarioGuardado));
      }
    }
  }

  private isLocalhost(): boolean {
    return typeof window !== 'undefined' && window.location.hostname === 'localhost';
  }

  registrarUsuario(data: any): Observable<any> {
    const url = this.isLocalhost()
      ? `${this.API_URL}/registrar` // Node
      : `${this.API_URL}?consulta=registrar`; // PHP

    return this.http.post(url, data);
  }

  loginUsuario(data: any): Observable<any> {
    const url = this.isLocalhost()
      ? `${this.API_URL}/login` // Node
      : `${this.API_URL}?consulta=login`; // PHP

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

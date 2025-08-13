import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CursosService {
  private isBrowser: boolean;
  private API_URL: string;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.API_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api'
        : 'https://comunidadvmapps.com/api.php';
    } else {
      // ⚠️ En SSR puedes definir la URL por defecto (externa)
      this.API_URL = 'https://comunidadvmapps.com/api.php';
    }
  }

  listarCursosPorCorreo(correo: string): Observable<any[]> {
  const body = { correo: correo };
  const url = this.API_URL.includes('api.php')
    ? `${this.API_URL}?consulta=listar-cursos_id`
    : `${this.API_URL}/listar-cursos_id`;

  return this.http.post<any[]>(url, body);  // POST correcto
}

listarTodosLosCursos(): Observable<any[]> {
  const url = this.API_URL.includes('api.php')
    ? `${this.API_URL}?consulta=listar-todos-los-cursos`
    : `${this.API_URL}/listar-todos-los-cursos`;

  return this.http.get<any[]>(url);  // GET correcto
}


registrarSesion(sesionData: any): Observable<any> {
  const url = this.API_URL.includes('api.php')
    ? `${this.API_URL}?consulta=registrar-sesion`
    : `${this.API_URL}/registrar-sesion`;

  return this.http.post(url, sesionData);
}


 editarSesion(sesionData: any): Observable<any> {
    const url = this.API_URL.includes('api.php')
      ? `${this.API_URL}?consulta=editar-sesion`
      : `${this.API_URL}/editar-sesion`;

    return this.http.post(url, sesionData);
  }

}

// src/app/servicios/tipos-residuos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

export interface TipoResiduo {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url: string;
  images1?: string;
  images2?: string;
  images3?: string;
  images4?: string;
  images5?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TiposResiduosService {
  private apiUrl = 'https://comunidadvmapps.com/api.php?consulta=tipos-residuos';

  private tiposResiduosCache: TipoResiduo[] | null = null;
  private tiposResiduos$: Observable<TipoResiduo[]> | null = null;

  constructor(private http: HttpClient) {}

  obtenerTipos(): Observable<TipoResiduo[]> {
    // ✔️ Si ya hay datos en caché, devolverlos
    if (this.tiposResiduosCache) {
      return of(this.tiposResiduosCache);
    }

    // ✔️ Si hay una petición en curso, devolverla
    if (this.tiposResiduos$) {
      return this.tiposResiduos$;
    }

    // ✔️ Hacer la solicitud a la API y guardar en caché
    this.tiposResiduos$ = this.http.get<TipoResiduo[]>(this.apiUrl).pipe(
      tap(data => {
        this.tiposResiduosCache = data;
        this.tiposResiduos$ = null; // Limpiar la referencia cuando termine
      }),
      shareReplay(1) // ✔️ Comparte el resultado si hay múltiples suscriptores
    );

    return this.tiposResiduos$;
  }
}

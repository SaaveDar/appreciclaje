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
  //private apiUrl = 'http://localhost:3000/api/tipos-residuos';
  private apiUrl = 'https://comunidadvapps.com/api/tipos-residuos';
  private tiposResiduosCache: TipoResiduo[] | null = null;
  private tiposResiduos$: Observable<TipoResiduo[]> | null = null;

  constructor(private http: HttpClient) {}

  obtenerTipos(): Observable<TipoResiduo[]> {
    if (this.tiposResiduosCache) {
      return of(this.tiposResiduosCache);
    }

    if (this.tiposResiduos$) {
      return this.tiposResiduos$;
    }

    this.tiposResiduos$ = this.http.get<TipoResiduo[]>(this.apiUrl).pipe(
      tap(data => {
        this.tiposResiduosCache = data;
        this.tiposResiduos$ = null;
      }),
      shareReplay(1)
    );

    return this.tiposResiduos$;
  }
}
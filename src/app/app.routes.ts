// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { MapaComponent } from './mapa/mapa.component';
import { JuegoComponent } from './juego/juego.component';
import { NoticiasComponent } from './noticias/noticias.component';
import { PerfilComponent } from './perfil/perfil.component';
// 👇 ya NO necesitas importar CategoriasComponent aquí
// import { CategoriasComponent } from './categorias/categorias.component';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  {
    path: 'categorias',
    loadComponent: () =>
      import('./categorias/categorias.component').then(m => m.CategoriasComponent)
  },
  { path: 'mapa', component: MapaComponent },
  { path: 'juego', component: JuegoComponent },
  { path: 'noticias', component: NoticiasComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: '**', redirectTo: 'inicio' }
];

// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { MapaComponent } from './mapa/mapa.component';
import { JuegoComponent } from './juego/juego.component';
import { NoticiasComponent } from './noticias/noticias.component';
import { PerfilComponent } from './perfil/perfil.component';
import { CursosComponent } from './cursos/cursos.component';
import { HistorialReciclajeComponent } from './historial-reciclaje/historial-reciclaje.component';

// 👇 ya NO necesitas importar CategoriasComponent aquí
// import { CategoriasComponent } from './categorias/categorias.component';

export const routes: Routes = [
  //{ path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '', component: InicioComponent },
  //{ path: 'inicio', component: InicioComponent },
  {
    path: 'categorias',
    loadComponent: () =>
      import('./categorias/categorias.component').then(m => m.CategoriasComponent)
  },
  { path: 'inicio', component: InicioComponent },
  {
    path: 'nosotros',
    loadComponent: () =>
      import('./nosotros/nosotros.component').then(m => m.NosotrosComponent)
  },

  { path: 'mapa', component: MapaComponent },
  { path: 'juego', component: JuegoComponent },
  { path: 'noticias', component: NoticiasComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: 'cursos', component: CursosComponent },
  { path: 'historial-reciclaje', component: HistorialReciclajeComponent },
  //{ path: '**', redirectTo: 'inicio' }
  { path: '**', redirectTo: '', pathMatch: 'full' } // 
];

import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SafeUrlPipe } from '../servicios/safe-url.pipe';
import { AuthService } from '../servicios/auth.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule, SafeUrlPipe],
  templateUrl: './noticias.component.html',
  styleUrls: ['./noticias.component.css']
})
export class NoticiasComponent {
  urlActual: string = 'https://elpais.com/noticias/reciclaje/';
  usuarioLogueado: any = null;
  mostrarLocales = false;


  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    if (isPlatformBrowser(this.platformId)) {
      // Mostrar usuario guardado si ya estaba logueado
      /*
      const usuarioGuardado = sessionStorage.getItem('usuario');
      if (usuarioGuardado) {
        this.usuarioLogueado = JSON.parse(usuarioGuardado);
        this.cdr.detectChanges();
      }*/

      // Escuchar cambios automáticos al loguear o cerrar sesión
      this.authService.usuario$.subscribe(usuario => {
        this.usuarioLogueado = usuario;
        this.cdr.detectChanges(); // Forzar actualización de la vista
      });
    }
  }

  mostrarNoticia(
  tipo: 'internacional' | 'nacional' | 'regional' | 'local' | 'paijan' | 'trujillo'
) {
  if (tipo === 'local') {
    this.mostrarLocales = !this.mostrarLocales;
    return;
  }

  // Ocultar subbotones si se selecciona otra categoría
  this.mostrarLocales = false;

  switch (tipo) {
    case 'internacional':
      this.urlActual = 'https://elpais.com/noticias/reciclaje/';
      break;
    case 'nacional':
      this.urlActual =
        'https://inforegion.pe/reciclaje-en-peru-los-desafios-del-2025-y-las-claves-para-un-sistema-sostenible/';
      break;
    case 'regional':
      this.urlActual =
        'https://www.regionlalibertad.gob.pe/noticiaS/regionales/15234-el-gore-donara-y-sembrara-3000-mil-arboles-para-recuperar-las-areas-verdes-en-trujillo';
      break;
    case 'paijan':
      this.urlActual =
        'https://rpp.pe/peru/actualidad/la-libertad-iniciaran-plan-piloto-de-reciclaje-de-basura-en-paijan-noticia-390249';
      break;
    case 'trujillo':
      this.urlActual =
        'https://diariocorreo.pe/edicion/la-libertad/trujillo-87-recicladores-son-formalizados-por-segat-la-libertad-peru-noticia/';
      break;
  }
}

}

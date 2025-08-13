import { Component, OnInit } from '@angular/core';
import { AuthService } from '../servicios/auth.service';
import { CursosService } from '../servicios/cursos.service';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; // <-- Importa DomSanitizer y SafeResourceUrl
import { FormsModule } from '@angular/forms';  // <-- Añade esto

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule],
  templateUrl: './cursos.component.html',
  styleUrls: ['./cursos.component.css']
})
export class CursosComponent implements OnInit {
  cursos: any[] = [];
  cursoSeleccionado: any = null;
  // Nueva variable para controlar la visibilidad de los detalles
  mostrarDetalles: boolean = true; 
  videoUrlSanitizado: { [key: number]: SafeResourceUrl } = {};
  tipoUsuario: string = ''; // Para guardar el tipo de usuario logueado
  mostrarModalAgregarSesion: boolean = false; // Para controlar el modal

  // Variables
modalAbierto = false;
nuevaSesion = {
  id_curso: '',
  sesion: '',
  subtitulo: '',
  descripcion: '',
  contenido: '',
  url_imagen: '',
  video: '',
  estado: '1'
};

  // NUEVAS VARIABLES para el modal de mensajes de éxito/error
  mostrarModalMensaje = false;
  modalMensaje = '';
  modalTipo: 'success' | 'error' = 'success';

usuario: any; // (ya tienes este en AuthService)
//cursoSeleccionado: any; // (cuando el admin da clic en un curso)

modalEdicionAbierto = false; // Controla la visibilidad del modal de edición
sesionEditada: any = {}; // Objeto para guardar los datos de la sesión a editar


  constructor(
    private authService: AuthService,
    private cursosService: CursosService,
    private sanitizer: DomSanitizer // <-- Inyecta DomSanitizer
  ) {}

  ngOnInit(): void {
  this.authService.usuario$.subscribe(usuario => {
  if (usuario && usuario.correo) {
    this.tipoUsuario = usuario.tipo_usuario;  // <-- Aquí ya será correcto

    if (this.tipoUsuario === 'administrador' || this.tipoUsuario === 'docente') {
      this.cursosService.listarTodosLosCursos().subscribe(data => {
        this.procesarCursos(data);
      });
    } else {
      this.cursosService.listarCursosPorCorreo(usuario.correo).subscribe(data => {
        this.procesarCursos(data);
      });
    }
  }
});


}

abrirModalEdicionSesion(sesion: any) {
    this.sesionEditada = { ...sesion }; // Copia los datos para no modificar el original directamente
    this.modalEdicionAbierto = true;
  }

  cerrarModalEdicion() {
    this.modalEdicionAbierto = false;
  }

  guardarSesionEditada() {
    this.cursosService.editarSesion(this.sesionEditada).subscribe({
      next: (res) => {
        this.mostrarMensaje('✅ Sesión actualizada correctamente', 'success');
        this.cerrarModalEdicion();
        this.actualizarCursoSeleccionado(this.cursoSeleccionado.id);
      },
      error: (err) => {
        console.error('❌ Error al actualizar la sesión', err);
        this.mostrarMensaje('❌ Error al actualizar la sesión. Por favor, inténtelo de nuevo.', 'error');
      }
    });
  }

procesarCursos(data: any[]) {
  const cursosMap = new Map();

  data.forEach((item: any) => {
    if (!cursosMap.has(item.id)) {
      cursosMap.set(item.id, {
        id: item.id,
        nombre: item.nombre,
        duracion: item.duracion,
        horario: item.horario,
        precio: item.precio,
        modalidad: item.modalidad,
        extra: item.extra,
        sesiones: []
      });
    }

    if (item.sesion) {
      cursosMap.get(item.id).sesiones.push({
        id_sesion: item.id_sesion,
        sesion: item.sesion,
        orden: item.orden,
        subtitulo: item.subtitulo,
        descripcion: item.descripcion,
        contenido: item.contenido,
        url_imagen: item.url_imagen,
        video: item.video
      });
    }
  });

  this.cursos = Array.from(cursosMap.values());

  this.cursos.forEach(curso => {
    if (curso.sesiones && curso.sesiones.length > 0) {
      curso.sesiones.sort((a: any, b: any) => a.sesion - b.sesion);
    }
  });
}


verCurso(curso: any) {
    this.cursoSeleccionado = curso;
    this.mostrarDetalles = true;

    if (this.cursoSeleccionado.sesiones && this.cursoSeleccionado.sesiones.length > 0) {
      this.cursoSeleccionado.sesiones.sort((a: any, b: any) => a.sesion - b.sesion);

      this.cursoSeleccionado.sesiones.forEach((sesion: any) => {
        if (sesion.contenido) {
          sesion.contenidoLista = sesion.contenido.split(/\. Módulo /);
          for (let i = 1; i < sesion.contenidoLista.length; i++) {
            sesion.contenidoLista[i] = 'Módulo ' + sesion.contenidoLista[i];
          }
        } else {
          sesion.contenidoLista = [];
        }

        // Solo sanitiza una vez la URL del video por sesión
        if (sesion.video && !this.videoUrlSanitizado[sesion.sesion]) {
          const videoId = sesion.video.split('/').pop();
          const embedUrl = `https://www.youtube.com/embed/${videoId}`; // <-- Si deseas autoplay agrega ?autoplay=1&mute=1
          this.videoUrlSanitizado[sesion.sesion] = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
        }
      });

      // Inicializa el estado expandir/contraer de las sesiones
      this.sesionesExpandir = {};
      this.cursoSeleccionado.sesiones.forEach((sesion: any) => {
        this.sesionesExpandir[sesion.sesion] = false;
      });
    }
  }

  getVideoUrlPorSesion(sesionNumero: number): SafeResourceUrl {
    return this.videoUrlSanitizado[sesionNumero];
  }

// Nuevo método para alternar la visibilidad de los detalles
alternarDetalles() {
  this.mostrarDetalles = !this.mostrarDetalles;
}

trackByCurso(index: number, curso: any): number {
  return curso.id;
}

sesionesExpandir: { [key: number]: boolean } = {};  // Controlar expandir/contraer por número de sesión
alternarSesion(sesionNumero: number) {
  this.sesionesExpandir[sesionNumero] = !this.sesionesExpandir[sesionNumero];
}


abrirModalRegistroSesion(curso: any) {
  this.nuevaSesion = {
    id_curso: curso.id,
    sesion: '',
    subtitulo: '',
    descripcion: '',
    contenido: '',
    url_imagen: '',
    video: '',
    estado: '1'
  };
  this.modalAbierto = true;
}

cerrarModal() {
  this.modalAbierto = false;
}

/** 
registrarSesion() {
  this.cursosService.registrarSesion(this.nuevaSesion).subscribe({
    next: (res) => {
      alert('✅ Sesión registrada correctamente');
      this.cerrarModal();
      // Refrescar sesiones del curso (opcional)
      this.verCurso(this.cursoSeleccionado); 
    },
    error: (err) => {
      console.error('❌ Error al registrar sesión', err);
      alert('Error al registrar sesión');
    }
  });
}
*/

actualizarCursoSeleccionado(idCurso: number) {
  // Llamamos a listarTodosLosCursos() porque es LEFT JOIN, pero filtramos en el front.
  this.cursosService.listarTodosLosCursos().subscribe(data => {
    const cursoActualizado = data.filter((c: any) => c.id === idCurso);
    if (cursoActualizado.length > 0) {
      // Procesamos la data como en procesarCursos(), pero solo para este curso
      const sesiones = cursoActualizado
        .filter((item: any) => item.sesion)
        .map((item: any) => ({
          id_sesion: item.id_sesion,
          sesion: item.orden,
          subtitulo: item.subtitulo,
          descripcion: item.descripcion,
          contenido: item.contenido,
          url_imagen: item.url_imagen,
          video: item.video,
          orden:item.orden
        }));

      this.cursoSeleccionado.sesiones = sesiones;
      this.verCurso(this.cursoSeleccionado);  // Vuelve a procesar sanitizaciones y renderizar
    }
  });
}


registrarSesion() {
  this.cursosService.registrarSesion(this.nuevaSesion).subscribe({
    next: (res) => {
      //alert('✅ Sesión registrada correctamente');
      this.mostrarMensaje('✅ Sesión registrada correctamente', 'success');
      this.cerrarModal();

      // Volver a listar las sesiones actualizadas del curso seleccionado
      this.actualizarCursoSeleccionado(this.cursoSeleccionado.id);
    },
    error: (err) => {
      console.error('❌ Error al registrar sesión', err);
      //alert('Error al registrar sesión');
      this.mostrarMensaje('❌ Error al registrar sesión. Por favor, inténtelo de nuevo.', 'error');
    }
  });
}

// NUEVO: Método para mostrar el modal de mensajes
  mostrarMensaje(mensaje: string, tipo: 'success' | 'error') {
    this.modalMensaje = mensaje;
    this.modalTipo = tipo;
    this.mostrarModalMensaje = true;
  }

  // NUEVO: Método para cerrar el modal de mensajes
  cerrarModalMensaje() {
    this.mostrarModalMensaje = false;
  }

}
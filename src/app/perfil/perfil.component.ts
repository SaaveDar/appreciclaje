// src/app/perfil/perfil.component.ts

import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  nombreUsuario = '';
  apellidoUsuario = '';
  correoUsuario = '';
  edad = '';
  tipoDocumento = '';
  documento = '';
  fechaRegistro = '';
  tipoUsuario = '';
  mostrarTablaCanje = false;


  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  cursosCertificados: string[] = [];

  puntaje = 0;
  nivel = 1;
  medallas = '';
  cursosDisponibles: string[] = [];

  mostrarTablaUsuarios = false;
  mostrarCursos = false;

  filtroNombre = '';
  cantidadFilas = 10;

  cursos: any[] = [];
  cursosFiltrados: any[] = [];

  nuevoCurso = {
    nombre: '',
    duracion: '',
    horario: '',
    precio: null as number | null,
    modalidad: '',
    extra: '',
    estado: 'activo'
  };

  mostrarTablaCursos = false;

  private isBrowser: boolean;
  private apiUrl: string;

  mensajeModal = '';
  mostrarModal = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // 🔁 Detectar si es localhost o dominio
    if (this.isBrowser && window.location.hostname === 'localhost') {
      this.apiUrl = 'http://localhost:3000/api'; // Node.js local
    } else {
      this.apiUrl = 'https://comunidadvapps.com/api.php'; // PHP remoto
    }
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const usuario = sessionStorage.getItem('usuario');
    if (!usuario) return;

    const userData = JSON.parse(usuario);
    const userId = userData.id;
    this.tipoUsuario = userData.tipo_usuario || 'estandar';

    // 🔍 Obtener perfil
    const perfilUrl = this.apiUrl.includes('api.php')
      ? `${this.apiUrl}?accion=perfil&id=${userId}`
      : `${this.apiUrl}/perfil/${userId}`;

    this.http.get<any>(perfilUrl).subscribe({
      next: perfil => {
        this.nombreUsuario = perfil.nombre ?? '';
        this.apellidoUsuario = perfil.apellido ?? '';
        this.correoUsuario = perfil.correo ?? '';
        this.tipoDocumento = perfil.tipo_documento ?? '';
        this.documento = perfil.documento ?? '';
        this.fechaRegistro = perfil.fecha_registro ?? '';
        this.tipoUsuario = perfil.tipo_usuario ?? 'estandar';
        this.edad = this.calcularEdad(perfil.fecha_nacimiento);

        if (this.tipoUsuario === 'estandar') {
          this.listarCursos();
        }
      },
      error: err => {
        console.error('❌ Error al cargar perfil:', err);
      }
    });

    // 🎮 Obtener progreso
    const progresoUrl = this.apiUrl.includes('api.php')
      ? `${this.apiUrl}?accion=progreso&usuario_id=${userId}`
      : `${this.apiUrl}/progreso/${userId}`;

    this.http.get<any>(progresoUrl).subscribe({
      next: progreso => {
        this.puntaje = progreso.puntaje ?? 0;
        this.nivel = progreso.nivel ?? 1;
        this.medallas = progreso.medallas ?? '';
        //this.cargarCursos();
      },
      error: () => {
        this.puntaje = 0;
        this.nivel = 1;
        this.medallas = '';
      }
    });
  }

  calcularPuntosRequeridos(precio: number): number {
  if (precio >= 200) return 800;
  if (precio >= 150) return 600;
  if (precio >= 100) return 400;
  if (precio >= 50) return 200;
  if (precio >= 25) return 100;
  if (precio >= 12.5) return 50;
  return 0; // Por defecto, si es menor a 12.5
}

  calcularEdad(fechaNacimiento: string): string {
    if (!fechaNacimiento) return '';

    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();

    let años = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();
    let dias = hoy.getDate() - nacimiento.getDate();

    if (dias < 0) {
      meses--;
      dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
    }

    if (meses < 0) {
      años--;
      meses += 12;
    }

    return `${años} años, ${meses} meses, ${dias} días`;
  }



  mostrarMensaje(mensaje: string) {
    this.mensajeModal = mensaje;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  verUsuarios() {
  // Limpiar la tabla de cursos antes de mostrar la tabla de usuarios
  this.mostrarTablaCursos = false;
  
  const url = this.apiUrl.includes('api.php')
    ? `${this.apiUrl}?accion=listar-usuarios`
    : `${this.apiUrl}/usuarios`;

  this.http.get<any[]>(url).subscribe({
    next: datos => {
      this.usuarios = datos;
      this.filtrarUsuarios();
      this.mostrarTablaUsuarios = true;  // Mostrar la tabla de usuarios
      this.mostrarCursos = false; // Asegúrate de ocultar la vista de cursos
    },
    error: err => console.error('❌ Error al listar usuarios:', err)
  });
}

verCursosCertificados() {
  // Limpiar la tabla de usuarios antes de mostrar la tabla de cursos
  this.mostrarTablaUsuarios = false;
  
  this.cursosCertificados = [
    'Certificado en Reciclaje Básico ♻️',
    'Certificado en Gestión de Residuos 🗑️',
    'Certificación en Educación Ambiental 🌱'
  ];
  
  this.mostrarCursos = true;  // Mostrar la tabla de cursos
  this.mostrarTablaUsuarios = false;  // Asegúrate de ocultar la vista de usuarios
}


  listarCursos() {
    const url = this.apiUrl.includes('api.php')
      ? `${this.apiUrl}?accion=listar-cursos`
      : `${this.apiUrl}/cursos`;

    this.http.get<any[]>(url).subscribe({
      next: datos => {
        this.cursos = datos;
        this.filtrarCursos();

        if (this.tipoUsuario !== 'estandar') {
          this.mostrarTablaCursos = true;
          this.mostrarTablaUsuarios = false;
        }
      },
      error: err => console.error('❌ Error al listar cursos:', err)
    });
  }

  registrarCurso() {
    const url = this.apiUrl.includes('api.php')
      ? `${this.apiUrl}?accion=registrar-curso`
      : `${this.apiUrl}/cursos`;

    this.http.post<any>(url, this.nuevoCurso).subscribe({
      next: respuesta => {
        this.mostrarMensaje(respuesta.mensaje || '✅ Curso registrado con éxito');
        this.listarCursos();
        this.nuevoCurso = {
          nombre: '',
          duracion: '',
          horario: '',
          precio: null,
          modalidad: '',
          extra: '',
          estado: 'activo'
        };
      },
      error: err => {
        const mensajeError = err.error?.error || '❌ Error al registrar curso';
        this.mostrarMensaje(mensajeError);
      }
    });
  }

  filtrarCursos() {
    const filtro = this.filtroNombre.trim().toLowerCase();
    let filtrados = this.cursos;

    if (filtro) {
      filtrados = filtrados.filter(c => c.nombre.toLowerCase().includes(filtro));
    }

    this.cursosFiltrados = filtrados.slice(0, this.cantidadFilas);
  }

  filtrarUsuarios() {
    const nombreFiltro = this.filtroNombre.trim().toLowerCase();
    let filtrados = this.usuarios;

    if (nombreFiltro) {
      filtrados = filtrados.filter(u =>
        u.nombre.toLowerCase().includes(nombreFiltro) ||
        u.apellido.toLowerCase().includes(nombreFiltro)
      );
    }

    this.usuariosFiltrados = filtrados.slice(0, this.cantidadFilas);
  }

  canjearCurso(curso: any) {
  const puntosNecesarios = this.calcularPuntosRequeridos(curso.precio);

  if (this.puntaje < puntosNecesarios) {
    this.mostrarMensaje(`❌ Necesitas ${puntosNecesarios} puntos para canjear este curso`);
    return;
  }

  this.puntaje -= puntosNecesarios;
  this.mostrarMensaje(`🎁 Has canjeado el curso: ${curso.nombre}`);
}


  validarPrecio() {
    if (this.nuevoCurso.precio === null || this.nuevoCurso.precio === undefined) return;
    if (this.nuevoCurso.precio < 1) {
      this.nuevoCurso.precio = null;
    }
  }

  // ➕ Botones según roles
  esAdmin(): boolean {
    return this.tipoUsuario === 'administrador';
  }

  esDocente(): boolean {
    return this.tipoUsuario === 'docente';
  }

  puedeVerUsuarios(): boolean {
    return this.tipoUsuario === 'administrador';
  }

  puedeVerCursos(): boolean {
    return this.tipoUsuario === 'administrador' || this.tipoUsuario === 'docente';
  }
}

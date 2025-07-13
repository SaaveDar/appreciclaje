// perfil.component.ts
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
  // ✅ Añadido para diferenciar entorno (local o producción)
  private isBrowser: boolean = false;
  private apiUrl: string = '';

  // 👤 Datos personales
  nombreUsuario = '';
  apellidoUsuario = '';
  correoUsuario = '';
  edad = '';
  tipoDocumento = '';
  documento = '';
  fechaRegistro = '';
  tipoUsuario = '';

  // 🧑‍🤝‍🧑 Usuarios y filtros
  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  filtroNombre = '';
  cantidadFilas = 10;

  // 🎓 Cursos
  cursosCertificados: string[] = [];
  cursosDisponibles: string[] = [];
  cursos: any[] = [];
  cursosFiltrados: any[] = [];

  // 🧾 Nuevo curso
  nuevoCurso = {
    nombre: '',
    duracion: '',
    horario: '',
    precio: null as number | null,
    modalidad: '',
    extra: '',
    estado: 'activo'
  };

  // 🎮 Progreso
  puntaje = 0;
  nivel = 1;
  medallas = '';

  // 👁️ Flags UI
  mostrarTablaUsuarios = false;
  mostrarTablaCursos = false;
  mostrarCursos = false;

  // 💬 Modal
  mensajeModal = '';
  mostrarModal = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  isLocalhost(): boolean {
    return typeof window !== 'undefined' && window.location.hostname === 'localhost';
  }

  mostrarMensaje(mensaje: string) {
    this.mensajeModal = mensaje;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (!this.isBrowser) return;

    // ✅ Inicializar apiUrl aquí (cuando ya se puede usar this)
    this.apiUrl = this.isLocalhost()
      ? 'http://localhost:3000/api'
      : 'https://comunidadvapps.com/api.php';

    const usuario = sessionStorage.getItem('usuario');
    if (!usuario) return;

    const userData = JSON.parse(usuario);
    const userId = userData.id;
    this.tipoUsuario = userData.tipo_usuario || 'estandar';

    // 🔍 Obtener perfil
    const perfilUrl = this.isLocalhost()
  ? `${this.apiUrl}/perfil/${userId}` // Node.js local
  : `${this.apiUrl}?accion=perfil&id=${userId}`; // PHP en producción

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

    // 👇 Si es usuario estándar, carga los cursos al iniciar
    if (this.tipoUsuario === 'estandar') {
      this.listarCursos();
    }
  },
  error: err => {
    console.error('❌ Error al cargar perfil:', err);
  }
});


    // 🎮 Obtener progreso
const progresoUrl = this.isLocalhost()
  ? `${this.apiUrl}/progreso/${userId}`        // Node.js
  : `${this.apiUrl}?accion=progreso&id=${userId}`; // PHP

this.http.get<any>(progresoUrl).subscribe({
  next: progreso => {
    this.puntaje = progreso.puntaje ?? 0;
    this.nivel = progreso.nivel ?? 1;
    this.medallas = progreso.medallas ?? '';
    this.cargarCursos();
  },
  error: () => {
    this.puntaje = 0;
    this.nivel = 1;
    this.medallas = '';
  }
});

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

  cargarCursos() {
    this.cursosDisponibles = [];
    if (this.puntaje >= 100) this.cursosDisponibles.push('Curso básico de reciclaje ♻️');
    if (this.puntaje >= 300) this.cursosDisponibles.push('Curso de manejo de residuos sólidos 🗑️');
    if (this.puntaje >= 500) this.cursosDisponibles.push('Certificación en Gestión Ambiental 🌱');
  }

  verUsuarios() {
    this.http.get<any[]>(`${this.apiUrl}?accion=listar-usuarios`).subscribe({
      next: datos => {
        this.usuarios = datos;
        this.filtrarUsuarios();
        this.mostrarTablaUsuarios = true;
        this.mostrarCursos = false;
      },
      error: err => console.error('❌ Error al listar usuarios:', err)
    });
  }

  listarCursos() {
    this.http.get<any[]>(`${this.apiUrl}?accion=listar-cursos`).subscribe({
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
    this.http.post<any>(`${this.apiUrl}?accion=registrar-curso`, this.nuevoCurso).subscribe({
      next: respuesta => {
        this.mostrarMensaje(respuesta.mensaje || '✅ Curso registrado con éxito');
        this.listarCursos();
        this.nuevoCurso = {
          nombre: '', duracion: '', horario: '', precio: null,
          modalidad: '', extra: '', estado: 'activo'
        };
      },
      error: err => {
        const mensajeError = err.error?.error || '❌ Error al registrar curso';
        this.mostrarMensaje(mensajeError);
      }
    });
  }

  canjearCurso(curso: any) {
    if (this.puntaje < 100) {
      this.mostrarMensaje('❌ No tienes puntos suficientes para canjear este curso');
      return;
    }

    this.mostrarMensaje(`🎁 Has canjeado el curso: ${curso.nombre}`);
    this.puntaje -= 100;
    this.cargarCursos();
  }

  validarPrecio() {
    if (this.nuevoCurso.precio !== null && this.nuevoCurso.precio < 1) {
      this.nuevoCurso.precio = null;
    }
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

  // Roles
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

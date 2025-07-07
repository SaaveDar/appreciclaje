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
  nombreUsuario = '';
  apellidoUsuario = '';
  correoUsuario = '';
  edad = '';
  tipoDocumento = '';
  documento = '';
  fechaRegistro = '';
  tipoUsuario = '';

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

  // ➕ Cursos desde la BD
  cursos: any[] = [];
  cursosFiltrados: any[] = [];

  // ➕ Datos del nuevo curso
  nuevoCurso = {
    nombre: '',
    duracion: '',
    horario: '',
    precio: null as number | null,
    //precio: 0,
    modalidad: '',
    extra: '',
    estado: 'activo'
  };

  mostrarTablaCursos = false;

  private isBrowser: boolean;

  //private apiUrl = 'https://comunidadvapps.com/api.php'; // si usas el backend PHP
  private apiUrl = 'http://localhost:3000/api'; // si usas un backend Node.js (server.js)

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // ➕ Para mostrar/ocultar los botones
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

  ngOnInit(): void {
    
    if (!this.isBrowser) return;

    const usuario = sessionStorage.getItem('usuario');
    if (!usuario) return;

    const userData = JSON.parse(usuario);
    const userId = userData.id;
    this.tipoUsuario = userData.tipo_usuario || 'estandar';

    // 🔍 Obtener perfil
    //this.http.get<any>(`${this.apiUrl}?accion=perfil&id=${userId}`).subscribe({
    this.http.get<any>(`${this.apiUrl}/perfil/${userId}`).subscribe({
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
    //this.http.get<any>(`${this.apiUrl}?accion=progreso&id=${userId}`).subscribe({
    this.http.get<any>(`${this.apiUrl}?accion=progreso&id=${userId}`).subscribe({
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
    //this.http.get<any>(`${this.apiUrl}?accion=perfil&id=${userId}`).subscribe({
    this.http.get<any[]>(`${this.apiUrl}/usuarios`).subscribe({
      next: datos => {
        this.usuarios = datos;
        this.filtrarUsuarios();
        this.mostrarTablaUsuarios = true;
        this.mostrarCursos = false;
      },
      error: err => console.error('❌ Error al listar usuarios:', err)
    });
  }

  verCursosCertificados() {
    this.cursosCertificados = [
      'Certificado en Reciclaje Básico ♻️',
      'Certificado en Gestión de Residuos 🗑️',
      'Certificación en Educación Ambiental 🌱'
    ];
    this.mostrarCursos = true;
    this.mostrarTablaUsuarios = false;
  }

    // ➕ Listar cursos
  listarCursos() {
  //this.http.get<any[]>(`${this.apiUrl}?accion=listar-cursos`).subscribe({
  this.http.get<any[]>(`${this.apiUrl}/cursos`).subscribe({
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


  

  // ➕ Registrar nuevo curso
  registrarCurso() {
      //this.http.get<any>(`${this.apiUrl}?accion=perfil&id=${userId}`).subscribe({
    this.http.post(`${this.apiUrl}/cursos`, this.nuevoCurso).subscribe({
      next: () => {
        alert('✅ Curso registrado con éxito');
        this.listarCursos();
        this.nuevoCurso = { nombre: '', duracion: '', horario: '', precio: 0, modalidad: '', extra: '', estado: 'activo' };
      },
      error: err => console.error('❌ Error al registrar curso:', err)
    });
  }

  // ➕ Filtrar cursos
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
  if (this.puntaje < 100) {
    alert('❌ No tienes puntos suficientes para canjear este curso');
    return;
  }

  // Aquí puedes hacer la lógica para descontar puntos o registrar el canje
  alert(`🎁 Has canjeado el curso: ${curso.nombre}`);

  // Ejemplo: restar puntos por cada curso
  this.puntaje -= 100;
  this.cargarCursos();
}

validarPrecio() {
  if (this.nuevoCurso.precio === null || this.nuevoCurso.precio === undefined) return;

  // ✅ Si es menor a 1, lo resetea a vacío
  if (this.nuevoCurso.precio < 1) {
    this.nuevoCurso.precio = null;
  }
}


}

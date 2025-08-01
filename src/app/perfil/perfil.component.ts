// src/app/perfil/perfil.component.ts

import { Component, OnInit, Inject, PLATFORM_ID , OnDestroy, HostListener } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { Router } from '@angular/router';

import { interval, Subscription } from 'rxjs';
import { AuthService } from '../servicios/auth.service'; // Ajusta la ruta según tu estructura


@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, QRCodeComponent, ZXingScannerModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit, OnDestroy {
  @HostListener('window:beforeunload', ['$event'])
onBeforeUnload() {
  const usuario = sessionStorage.getItem('usuario');
  if (usuario) {
    const correo = JSON.parse(usuario).correo;
    if (correo && this.apiUrl.includes('localhost')) {
      navigator.sendBeacon(`http://localhost:3000/api/usuario/desconectar`, JSON.stringify({ correo }));
    } else if (correo) {
      navigator.sendBeacon(`https://comunidadvapps.com/api.php?accion=desconectar`, JSON.stringify({ correo }));
    }
  }
}


  cursosCanjeados: any[] = [];
  actualizacionSub!: Subscription;



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
    private router: Router, // ✅ nuevo
    private authService: AuthService, // ✅ Agrega esto
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

  mostrarCursosCanjeados = false;
  usuarioLogueado: any = null;
  isLoggedIn: boolean = false;

  usuarioActual: any = null; // ✅ Declarar la propiedad
  ultimaConexion: string | null = null;

  verEstadoEnTiempoReal(correo: string) {
  if (!correo || !this.isBrowser) return;

  this.actualizacionSub = interval(10000).subscribe(() => {
    const url = this.apiUrl.includes('api.php')
      ? `${this.apiUrl}?accion=estado-en-linea&correo=${correo}`
      : `${this.apiUrl}/usuario/estado/${correo}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        // Puedes usar esto para actualizar alguna vista en vivo si deseas
        console.log('📡 Estado en tiempo real:', res.estado);
      },
      error: () => {
        console.warn('⚠️ Error al obtener estado en tiempo real');
      }
    });
  });
}


  ngOnInit(): void {
  this.authService.usuario$.subscribe(usuario => {
    this.usuarioActual = usuario;

    if (!usuario) {
      this.ultimaConexion = this.authService.getUltimaConexion();
      this.router.navigate(['/inicio']);
      return;
    }

    if (!this.isBrowser) return;

    // ✅ Actualizar estado en línea y monitorear en tiempo real al usuario actual
    this.authService.actualizarEstadoEnLinea(usuario.correo);
    this.verEstadoEnTiempoReal(usuario.correo);

    const userId = usuario.id;
    this.tipoUsuario = usuario.tipo_usuario || 'estandar';

    // ✅ Cargar perfil completo
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

        if (this.tipoUsuario === 'administrador') {
          this.generarQR();
          this.verUsuarios(); // 🔁 Carga usuarios

          // ✅ Actualizar tabla de usuarios cada 10 segundos
          this.actualizacionSub = interval(10000).subscribe(() => {
            this.verUsuarios(); // Actualiza usuarios y estados en línea
          });
        }

        if (this.tipoUsuario === 'estandar') {
          this.listarCursos();
          this.obtenerCursosCanjeados();
        }
      },
      error: err => {
        console.error('❌ Error al cargar perfil:', err);
      }
    });

    const progresoUrl = this.apiUrl.includes('api.php')
      ? `${this.apiUrl}?accion=progreso&usuario_id=${userId}`
      : `${this.apiUrl}/progreso/${userId}`;

    this.http.get<any>(progresoUrl).subscribe({
      next: progreso => {
        this.puntaje = progreso.puntaje ?? 0;
        this.nivel = progreso.nivel ?? 1;
        this.medallas = progreso.medallas ?? '';
      },
      error: () => {
        this.puntaje = 0;
        this.nivel = 1;
        this.medallas = '';
      }
    });
  });
}



  generarQR() {
  const bono = {
    tipo: 'bono',
    puntos: 150,
    fecha: new Date().toISOString(), // Actualiza fecha cada vez
    token: Math.random().toString(36).substring(2, 10) // Token aleatorio para variar visual del QR
  };

  this.qrData = JSON.stringify(bono);
  console.log('📦 QR generado:', this.qrData); // Depuración opcional
}

  ngOnDestroy(): void {
    if (this.actualizacionSub) {
      this.actualizacionSub.unsubscribe();
    }
  }

  obtenerCursosCanjeados() {
  if (!this.isBrowser) return; // 🛡️ Previene SSR error

  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const usuarioId = usuario.id;

  if (!usuarioId) {
    console.warn('⚠️ No se encontró usuario logueado');
    return;
  }

  const url = this.apiUrl.includes('api.php')
    ? `${this.apiUrl}?accion=cursos-canjeados&usuario_id=${usuarioId}`
    : `${this.apiUrl}/cursos-canjeados/${usuarioId}`;

  this.http.get<any[]>(url).subscribe({
    next: (data) => {
      this.cursosCanjeados = data;
    },
    error: (err) => {
      console.error('❌ Error al obtener cursos canjeados:', err);
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

  puedeCanjearAlgunCurso(): boolean {
  return this.cursosFiltrados.some(curso => this.puntaje >= this.calcularPuntosRequeridos(curso.precio));
}


  canjearCurso(curso: any) {
  const puntosNecesarios = this.calcularPuntosRequeridos(curso.precio);

  if (this.puntaje < puntosNecesarios) {
    this.mostrarMensaje(`❌ Necesitas ${puntosNecesarios} puntos para canjear este curso`);
    return;
  }

  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const usuario_id = usuario.id;

  if (!usuario_id) {
    this.mostrarMensaje('⚠️ No se encontró información del usuario. Inicia sesión nuevamente.');
    return;
  }

  const payload = {
    usuario_id,
    curso_id: curso.id,
    puntos_utilizados: puntosNecesarios
  };

  const url = this.apiUrl.includes('api.php')
    ? `${this.apiUrl}?accion=canjear-curso`
    : `${this.apiUrl}/canjear-curso`;

  this.http.post<any>(url, payload).subscribe({
    next: res => {
      this.puntaje -= puntosNecesarios;
      this.obtenerCursosCanjeados(); // 🔁 ACTUALIZACIÓN INMEDIATA
      this.mostrarMensaje(res.mensaje || '🎁 Curso canjeado con éxito');
    },
    error: err => {
      console.error('❌ Error al canjear:', err);
      this.mostrarMensaje(err.error?.mensaje || err.error?.error || '❌ Error al registrar el canje');
    }
  });
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

  
  obtenerProgreso() {
  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const userId = usuario.id;

  const progresoUrl = this.apiUrl.includes('api.php')
    ? `${this.apiUrl}?accion=progreso&usuario_id=${userId}`
    : `${this.apiUrl}/progreso/${userId}`;

  this.http.get<any>(progresoUrl).subscribe({
    next: progreso => {
      this.puntaje = progreso.puntaje ?? 0;
      this.nivel = progreso.nivel ?? 1;
      this.medallas = progreso.medallas ?? '';
    },
    error: () => {
      this.puntaje = 0;
      this.nivel = 1;
      this.medallas = '';
    }
  });
}
mensajeQR = '';
qrData: string = '';

escanearQR(): void {
  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const usuario_id = usuario.id;

  this.http.post<any>(this.apiUrl + '?accion=escanear-qr', {
    usuario_id: usuario_id,
    puntos: 150
  }).subscribe({
    next: (res) => {
      this.mensajeQR = res.mensaje;
      this.obtenerProgreso(); // actualiza puntos
    },
    error: (err) => {
      this.mensajeQR = err.error?.mensaje || 'Error al escanear QR';
    }
  });
}


codigoEscaneado = '';
camaraActiva = false;
ultimaFechaEscaneo = ''; // Se puede almacenar en localStorage
formatoQR = [BarcodeFormat.QR_CODE];


procesarCodigoQR(resultado: string) {
  const hoy = new Date().toISOString().split('T')[0]; // Solo YYYY-MM-DD
  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const usuario_id = usuario.id;

  const claveLocalStorage = `qr-escaneado-${usuario_id}`;

  const ultimaEscaneo = localStorage.getItem(claveLocalStorage);

  if (ultimaEscaneo === hoy) {
    this.mensajeQR = '⚠️ Ya escaneaste un QR hoy. Intenta mañana.';
    return;
  }

  try {
    const data = JSON.parse(resultado);
    if (data.tipo === 'bono' && data.puntos === 150) {
      this.http.post<any>(this.apiUrl + '?accion=escanear-qr', {
        usuario_id: usuario_id,
        puntos: 150
      }).subscribe({
        next: (res) => {
          this.mensajeQR = res.mensaje;
          localStorage.setItem(claveLocalStorage, hoy); // Guarda fecha de escaneo
          this.obtenerProgreso();
        },
        error: (err) => {
          this.mensajeQR = err.error?.mensaje || '❌ Error al registrar puntos.';
        }
      });
    } else {
      this.mensajeQR = '❌ QR inválido.';
    }
  } catch (e) {
    this.mensajeQR = '❌ No se pudo leer el código.';
  }

  this.camaraActiva = false; // Detener cámara luego de escanear
}


 

getEstadoConexion(usuario: any): string {
  // ✅ Si está en línea según base de datos
  if (usuario.en_linea === 1) {
    return '🟢 En línea';
  }

  // Si no tiene último acceso
  if (!usuario.ultima_conexion) return 'Sin registro';

  const ultima = new Date(usuario.ultima_conexion);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const esMismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (esMismoDia(ultima, hoy)) {
    return '🟡 Última conexión: hoy';
  } else if (esMismoDia(ultima, ayer)) {
    return '🟡 Última conexión: ayer';
  } else {
    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    };
    return `🔴 Última conexión: ${ultima.toLocaleDateString('es-ES', opciones)}`;
  }
}

obtenerTiempoTranscurrido(fechaString: string): string {
  if (!fechaString) return '';

  const fechaConexion = new Date(fechaString);
  const ahora = new Date();
  const diferenciaMs = ahora.getTime() - fechaConexion.getTime();

  const segundos = Math.floor(diferenciaMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (dias > 0) {
    return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
  } else if (horas > 0) {
    return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
  } else if (minutos > 0) {
    return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
  } else {
    return `Hace ${segundos} segundo${segundos !== 1 ? 's' : ''}`;
  }
}

}

import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  nombreUsuario: string = '';
  apellidoUsuario: string = '';
  correoUsuario: string = '';
  edad: string = '';
  tipoDocumento: string = '';
  documento: string = '';
  fechaRegistro: string = '';
  tipoUsuario: string = '';

  puntaje: number = 0;
  nivel: number = 1;
  medallas: string = '';
  cursosDisponibles: string[] = [];

  private isBrowser: boolean;
  private apiUrl: string = 'https://comunidadvapps.com/api.php';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const usuario = sessionStorage.getItem('usuario');
    if (!usuario) return;

    const userData = JSON.parse(usuario);

    // 🔍 Cambiar a ?accion=perfil&id=...
    this.http.get<any>(`${this.apiUrl}?accion=perfil&id=${userData.id}`).subscribe({
      next: perfil => {
        this.nombreUsuario = perfil.nombre ?? '';
        this.apellidoUsuario = perfil.apellido ?? '';
        this.correoUsuario = perfil.correo ?? '';
        this.tipoDocumento = perfil.tipo_documento ?? '';
        this.documento = perfil.documento ?? '';
        this.fechaRegistro = perfil.fecha_registro ?? '';
        this.tipoUsuario = perfil.tipo_usuario ?? 'estandar';
        this.edad = this.calcularEdad(perfil.fecha_nacimiento);
      },
      error: err => {
        console.error('❌ Error al cargar perfil:', err);
      }
    });

    // ✔️ Esto aún no lo tienes implementado en PHP, así que fallará si no existe la ruta
    this.obtenerProgreso(userData.id);
  }

  private obtenerProgreso(userId: number) {
    this.http.get<any>(`${this.apiUrl}?accion=progreso&id=${userId}`).subscribe({
      next: progreso => {
        this.puntaje = progreso.puntaje ?? 0;
        this.nivel = progreso.nivel ?? 1;
        this.medallas = progreso.medallas ?? '';
        this.cargarCursos();
      },
      error: () => {
        console.warn('⚠️ No se pudo cargar el progreso, asignando valores por defecto');
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
}

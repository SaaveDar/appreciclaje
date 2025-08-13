import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecyclingService } from '../servicios/recycling.service';
import { AuthService } from '../servicios/auth.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-historial-reciclaje',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-reciclaje.component.html',
  styleUrls: ['./historial-reciclaje.component.css'],
  providers: [RecyclingService]
})
export class HistorialReciclajeComponent implements OnInit, OnDestroy {

  historial: any[] = [];
  mostrarFormulario = false;
  usuarioActual: any;
  permisoReciclaje: boolean = false;
  permisoSubscription!: Subscription;

  nuevoRegistro = {
    categoria: '',
    residuo: '',
    peso_kg: null as number | null,
    foto: null as File | null,
  };

  private isBrowser: boolean;

  constructor(
    private recyclingService: RecyclingService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Detectar si estamos en navegador
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      // ⛔ Evitar ejecución en SSR/prerender
      return;
    }

    this.authService.usuario$.subscribe(usuario => {
      this.usuarioActual = usuario;
      if (this.usuarioActual) {
        this.obtenerHistorial();
        this.obtenerPermisoReciclaje();
      } else {
        this.historial = [];
        this.permisoReciclaje = false;
      }
    });

    // 🔄 Refrescar permiso cada 10 segundos
    this.permisoSubscription = interval(10000).subscribe(() => {
      if (this.usuarioActual) {
        this.obtenerPermisoReciclaje();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.permisoSubscription) {
      this.permisoSubscription.unsubscribe();
    }
  }

  obtenerHistorial(): void {
    if (!this.usuarioActual || !this.isBrowser) {
      this.historial = [];
      return;
    }
    this.recyclingService.getHistorialReciclaje(this.usuarioActual.id).subscribe({
      next: (data) => {
        this.historial = data || [];
      },
      error: (err) => {
        console.error('Error al obtener historial', err);
        this.historial = [];
      }
    });
  }

  obtenerPermisoReciclaje(): void {
    if (!this.usuarioActual || !this.isBrowser) {
      this.permisoReciclaje = false;
      return;
    }
    this.recyclingService.getPermisoReciclaje(this.usuarioActual.id).subscribe({
      next: (permiso: any) => {
        this.permisoReciclaje = permiso.estado === 'activo';
      },
      error: (err) => {
        console.error('Error al obtener permiso de reciclaje', err);
        this.permisoReciclaje = false;
      }
    });
  }

  onFileSelected(event: any): void {
    if (!this.isBrowser) return;
    this.nuevoRegistro.foto = event.target.files[0];
  }

  enviarRegistro(): void {
    if (!this.usuarioActual || !this.nuevoRegistro.foto || !this.isBrowser) return;

    const formData = new FormData();
    formData.append('usuario_id', this.usuarioActual.id);
    formData.append('categoria', this.nuevoRegistro.categoria);
    formData.append('residuo', this.nuevoRegistro.residuo);
    formData.append('peso_kg', this.nuevoRegistro.peso_kg!.toString());
    formData.append('foto', this.nuevoRegistro.foto, this.nuevoRegistro.foto.name);

    this.recyclingService.postRegistroReciclaje(formData).subscribe({
      next: (res) => {
        console.log('Registro enviado con éxito', res);
        this.obtenerHistorial();
        this.resetFormulario();
        this.mostrarFormulario = false;
      },
      error: (err) => console.error('Error al enviar registro', err)
    });
  }

  resetFormulario(): void {
    this.nuevoRegistro = {
      categoria: '',
      residuo: '',
      peso_kg: null,
      foto: null,
    };
  }

  solicitarPermiso(): void {
    console.log('Solicitando permiso al administrador');
  }
}

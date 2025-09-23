import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, Pipe, PipeTransform, AfterViewInit  } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecyclingService } from '../servicios/recycling.service';
import { AuthService } from '../servicios/auth.service';
import { Subscription, interval } from 'rxjs';
import { SessionService } from '../servicios/session.service';
// 👇 importa tu pipe
import { FiltroTablaPipe } from '../pipes/filtro-tabla.pipe';
import Chart from 'chart.js/auto';
declare var $: any; // ✅ Para usar jQuery/Select2

@Component({
  selector: 'app-historial-reciclaje',
  standalone: true,
  imports: [CommonModule, FormsModule, FiltroTablaPipe],
  templateUrl: './historial-reciclaje.component.html',
  styleUrls: ['./historial-reciclaje.component.css'],
  providers: [RecyclingService]
})


export class HistorialReciclajeComponent implements OnInit, OnDestroy, AfterViewInit  {

  historial: any[] = [];
  historialTodos: any[] = []; // 👈 historial de todos los usuarios (admin)
  mostrarFormulario = false;
  usuarioActual: any;
  permisoReciclaje: boolean = false;
  permisoSubscription!: Subscription;
  
  // Nuevas variables para el combobox
  mostrarComboUsuarios: boolean = false;
  usuarios: any[] = [];
  usuarioSeleccionadoId: number | null = null;
  

  historialFiltrado: any[] = [];

  graficoCircular: any;
  graficoBarras: any;

  coloresCategoria: any = {
    'plastico': '#d3d3d3',   // gris claro
    'papel': '#007bff',       // azul
    'vidrio': '#006400',      // verde oscuro
    'organico': '#8b4513',    // marrón
    'PELIGROSOS': '#ff0000',   // rojo
    'metales': '#ffff00',      // amarillo
    'electronico': '#ff0000'

  };


  nuevoRegistro = {
    categoria: '',
    residuo: '',
    peso_kg: null as number | null,
    foto: null as File | null,
  };

  filtroBusqueda: string = '';
  filtros = {
  usuario: '',
  correo: '',
  categoria: '',
  residuo: '',
  peso: '',
  fecha: ''
};

  imagenSeleccionada: string | null = null;

  private isBrowser: boolean;

  constructor(
    private recyclingService: RecyclingService,
    private authService: AuthService,
    private sessionService: SessionService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // ✅ Aquí defines initSelect2
  initSelect2() {
    $('#usuarioSelect').select2({
      placeholder: 'Buscar usuario...',
      allowClear: true,
      width: '100%' // Para que se adapte al contenedor
    });

    // Sincronizar con Angular [(ngModel)]
    $('#usuarioSelect').on('change', (event: any) => {
      this.usuarioSeleccionadoId = event.target.value;
      this.seleccionarUsuario();
    });
  }
  
  ngOnInit(): void {
  if (!this.isBrowser) {
    return;
  }

  this.authService.usuario$.subscribe(usuario => {
    this.usuarioActual = usuario;
    if (this.usuarioActual) {
      if (this.usuarioActual.tipo_usuario === 'administrador') {
        this.obtenerHistorialTodos();
        this.obtenerUsuarios(); // 👈 cargar lista de usuarios solo si es admin
      } else {
        this.obtenerHistorial();
      }
      this.obtenerPermisoReciclaje();
    } else {
      this.historial = [];
      this.historialTodos = [];
      this.permisoReciclaje = false;
    }
  });

  this.permisoSubscription = interval(10000).subscribe(() => {
    if (this.usuarioActual) {
      this.obtenerPermisoReciclaje();
    }
  });
}

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => {
        $('#usuarioSelect').select2({
          placeholder: "🔍 Buscar usuario...",
          width: '100%'
        }).on('change', (e: any) => {
          this.usuarioSeleccionadoId = Number($(e.target).val()) || null;
          this.seleccionarUsuario();
        });
      }, 500); // ⏳ dar tiempo a que Angular pinte el DOM
    }
   }

  ngOnDestroy(): void {
    if (this.permisoSubscription) {
      this.permisoSubscription.unsubscribe();
    }
  }

  abrirImagen(fotoUrl: string): void {
    if (!fotoUrl) return;
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://comunidadvmapps.com';
    this.imagenSeleccionada = fotoUrl.startsWith('http') ? fotoUrl : `${baseUrl}${fotoUrl}`;

    if (this.isBrowser) {
      const modalElement = document.getElementById('imagenModal');
      if (modalElement) {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      }
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

  obtenerHistorialTodos(): void {
    this.recyclingService.getHistorialTodos().subscribe({
      next: (data) => {
        this.historialTodos = data || [];
      },
      error: (err) => {
        console.error('Error al obtener historial de todos', err);
        this.historialTodos = [];
      }
    });
  }
  
  // Método para obtener todos los usuarios (para el combobox)
  obtenerUsuarios(): void {
    this.recyclingService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data || [];
        // 👇 reinicializar select2 después de que Angular pinte las <option>
      setTimeout(() => this.initSelect2(), 200);
      },
      error: (err) => {
        console.error('Error al obtener la lista de usuarios', err);
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
        if (permiso && typeof permiso.estado === 'boolean') {
          this.permisoReciclaje = permiso.estado;
        } else if (permiso && typeof permiso.estado === 'string') {
          this.permisoReciclaje = permiso.estado.toLowerCase() === 'activo';
        } else if (Array.isArray(permiso) && permiso.length > 0) {
          const estado = permiso[0].estado;
          this.permisoReciclaje = (typeof estado === 'boolean') ? estado : estado.toLowerCase() === 'activo';
        } else {
          this.permisoReciclaje = false;
        }
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

  errorMessages = {
    categoria: '',
    residuo: '',
    peso_kg: '',
    foto: ''
  };

  mensajeModal: string = '';

  enviarRegistro(): void {
    

    this.limpiarErrores();

    if (!this.nuevoRegistro.categoria) {
      this.errorMessages.categoria = 'Por favor selecciona una categoría.';
    }
    if (!this.nuevoRegistro.residuo) {
      this.errorMessages.residuo = 'Por favor ingresa el residuo.';
    }
    if (!this.nuevoRegistro.peso_kg || this.nuevoRegistro.peso_kg <= 0) {
      this.errorMessages.peso_kg = 'Por favor ingresa un peso válido.';
    }
    if (!this.nuevoRegistro.foto) {
      this.errorMessages.foto = 'Por favor sube una imagen PNG o JPG.';
    }

    if (this.errorMessages.categoria || this.errorMessages.residuo || this.errorMessages.peso_kg || this.errorMessages.foto) {
      return;
    }
    //if (!this.usuarioActual || !this.isBrowser) return;

    if (!this.usuarioActual || !this.nuevoRegistro.foto || !this.isBrowser) return;

    const formData = new FormData();
    formData.append('usuario_id', this.usuarioActual.id);
    formData.append('categoria', this.nuevoRegistro.categoria);
    formData.append('residuo', this.nuevoRegistro.residuo);
    formData.append('peso_kg', this.nuevoRegistro.peso_kg!.toString());
    formData.append('foto', this.nuevoRegistro.foto as File, (this.nuevoRegistro.foto as File).name);

    this.recyclingService.postRegistroReciclaje(formData).subscribe({
      next: (res) => {
        if (this.usuarioActual.tipo_usuario === 'administrador') {
          this.obtenerHistorialTodos();
        } else {
          this.obtenerHistorial();
        }
        this.resetFormulario();
        this.mostrarFormulario = false;
        this.mensajeModal = '✅ Registro guardado con éxito.';
        this.abrirModalMensaje();
      },
      error: (err) => {
        this.mensajeModal = '❌ Ocurrió un error al guardar el registro.';
        this.abrirModalMensaje();
      }
    });
  }

  abrirModalMensaje(): void {
    const modalElement = document.getElementById('mensajeModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  limpiarErrores(): void {
    this.errorMessages = { categoria: '', residuo: '', peso_kg: '', foto: '' };
  }

  resetFormulario(): void {
    this.nuevoRegistro = { categoria: '', residuo: '', peso_kg: null, foto: null };
  }


  // Método para actualizar gráficos
actualizarGraficos(usuarioId?: number) {
  this.recyclingService.getHistorialPorUsuario(usuarioId).subscribe({
    next: (data) => {
      const categorias = data.map(item => item.categoria);
      const pesos = data.map(item => item.total_peso);
      const colores = data.map(item => this.coloresCategoria[item.categoria] || '#000000');

      // Destruir gráficos anteriores si existen
      if (this.graficoCircular) this.graficoCircular.destroy();
      if (this.graficoBarras) this.graficoBarras.destroy();

      // Gráfico Circular
      const ctxCircular = document.getElementById('graficoCircular') as HTMLCanvasElement;
      this.graficoCircular = new Chart(ctxCircular, {
        type: 'doughnut',
        data: {
          labels: categorias,
          datasets: [{
            data: pesos,
            backgroundColor: colores
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });

      // Gráfico de Barras
      const ctxBarras = document.getElementById('graficoBarras') as HTMLCanvasElement;
      this.graficoBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
          labels: categorias,
          datasets: [{
            label: 'Total Peso (kg)',
            data: pesos,
            backgroundColor: colores
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });

    },
    error: (err) => {
      console.error('Error al cargar gráficos', err);
    }
  });
}

// Llamar al seleccionar usuario
seleccionarUsuario(): void {
  if (this.usuarioSeleccionadoId) {
    // Convertimos null a undefined
    this.recyclingService.getHistorialPorUsuario(this.usuarioSeleccionadoId ?? undefined).subscribe({
      next: (data) => {
        this.historialTodos = data || [];
        this.actualizarGraficos(this.usuarioSeleccionadoId ?? undefined); // 🔹 actualizar gráficos
      },
      error: (err) => {
        console.error('Error al obtener historial del usuario seleccionado', err);
        this.historialTodos = [];
      }
    });
  } else {
    // Si no hay usuario seleccionado, mostrar historial completo
    this.obtenerHistorialTodos();
    this.actualizarGraficos(); // 🔹 gráficos de todos los usuarios
  }
}


}
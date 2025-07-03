import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TiposResiduosService, TipoResiduo } from '../servicios/tipos-residuos.service';
import { SocketService } from '../servicios/socket.service';
import { interval, Subscription } from 'rxjs';
import {
  trigger,
  transition,
  style,
  animate
} from '@angular/animations';

@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideIn', [
      transition(':increment', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':decrement', [
        style({ opacity: 0, transform: 'translateX(-100%)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class CategoriasComponent implements OnInit, OnDestroy {
  tiposResiduos: TipoResiduo[] = [];
  tarjetasVolteadas: { [id: number]: boolean } = {};
  imagenIndex: { [id: number]: number } = {};
  carruseles: { [id: number]: Subscription } = {};
  cambiosSocket$: Subscription | undefined;
  cargando: boolean = true;
  isBrowser: boolean;

  constructor(
    private tiposService: TiposResiduosService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.cargarDatosIniciales();

      this.cambiosSocket$ = this.socketService.escucharCambiosTiposResiduos().subscribe((nuevosDatos: TipoResiduo[]) => {
        this.tiposResiduos = nuevosDatos;
        nuevosDatos.forEach(tipo => {
          this.imagenIndex[tipo.id] ??= 0;
          this.tarjetasVolteadas[tipo.id] ??= false;
        });
        this.cdr.detectChanges();
      });
    } else {
      // SSR: simula carga vacía o deja cargando = false si quieres
      this.cargando = false;
    }
  }

  cargarDatosIniciales(): void {
    this.cargando = true;

    this.tiposService.obtenerTipos().subscribe(data => {
      this.tiposResiduos = data;
      data.forEach(tipo => {
        this.imagenIndex[tipo.id] ??= 0;
        this.tarjetasVolteadas[tipo.id] ??= false;
      });

      // Solo navegador: medir tiempo
      if (this.isBrowser && 'performance' in window) {
        const tiempo = performance.now();
        console.log(`⏱ Carga completada en: ${tiempo.toFixed(2)} ms`);
      }

      this.cargando = false;
      this.cdr.detectChanges();
    });
  }

  trackById(index: number, item: TipoResiduo): number {
    return item.id;
  }

  ngOnDestroy(): void {
    this.cancelarTodosCarruseles();
    this.cambiosSocket$?.unsubscribe();
  }

  voltear(id: number): void {
    Object.keys(this.tarjetasVolteadas).forEach(key => {
      const intId = parseInt(key);
      if (intId !== id) {
        this.tarjetasVolteadas[intId] = false;
        this.cancelarCarrusel(intId);
      }
    });

    this.tarjetasVolteadas[id] = !this.tarjetasVolteadas[id];
    this.cdr.detectChanges();

    if (this.tarjetasVolteadas[id]) {
      this.iniciarCarrusel(id);
    } else {
      this.cancelarCarrusel(id);
    }
  }

  obtenerImagenes(tipo: TipoResiduo): string[] {
    return [
      tipo.images1, tipo.images2,
      tipo.images3, tipo.images4,
      tipo.images5
    ].filter((img): img is string => !!img);
  }

  getImagenActual(tipo: TipoResiduo): string {
    const imgs = this.obtenerImagenes(tipo);
    const idx = this.imagenIndex[tipo.id] % imgs.length;
    return imgs[idx] || '';
  }

  private iniciarCarrusel(id: number): void {
    if (!this.isBrowser || this.carruseles[id]) return;

    this.carruseles[id] = interval(4000).subscribe(() => {
      const tipo = this.tiposResiduos.find(t => t.id === id);
      if (!tipo) return;

      const totalImgs = this.obtenerImagenes(tipo).length;
      this.imagenIndex[id] = (this.imagenIndex[id] + 1) % totalImgs;
      this.cdr.detectChanges();
    });
  }

  private cancelarCarrusel(id: number): void {
    if (this.carruseles[id]) {
      this.carruseles[id].unsubscribe();
      delete this.carruseles[id];
    }
  }

  private cancelarTodosCarruseles(): void {
    Object.values(this.carruseles).forEach(sub => sub.unsubscribe());
    this.carruseles = {};
  }
}

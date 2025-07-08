import { Component, inject, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppComponent } from '../app.component'; // ✅ importa para controlar el modal

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements AfterViewInit, OnDestroy {
  private appComponent = inject(AppComponent); // ✅ inyección directa del componente raíz

  slides = [
    {
      imagen: 'assets/images/slider/imagen1.jpg',
      titulo: 'EcoConciencia en comunidad',
      descripcion: 'Forma parte de una red de usuarios comprometidos con el planeta.'
      
    },
    {
      imagen: 'assets/images/slider/imagen2.jpg',
      titulo: 'Encuentra puntos cercanos',
      descripcion: 'Localiza centros de reciclaje y reduce tu impacto ambiental.'
    },
    {
      imagen: 'assets/images/slider/imagen3.jpg',
      titulo: 'Aprende y gana',
      descripcion: 'Participa en juegos interactivos y gana recompensas mientras aprendes.'
    },
    {
      imagen: 'assets/images/slider/imagen4.jpg',
      titulo: 'Recicla con Inteligencia',
      descripcion: 'Identifica y clasifica residuos fácilmente con nuestra app educativa.'
    }
  ];

  currentSlide = 0;
  private intervaloId: any;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    // Evita que Angular controle el temporizador: mejora rendimiento
    this.ngZone.runOutsideAngular(() => {
      this.intervaloId = setInterval(() => {
        this.ngZone.run(() => this.nextSlide());
      }, 5000);
    });
  }

  ngOnDestroy(): void {
    if (this.intervaloId) {
      clearInterval(this.intervaloId);
    }
  }

  goToSlide(index: number): void {
  this.currentSlide = index;
}

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }
  abrirRegistro(): void {
    this.appComponent.modalAbierto = true;
    this.appComponent.modo = 'registro';
  }
}

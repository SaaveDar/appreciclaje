import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  puntaje: number = 0;
  nivel: number = 1;
  medallas: string = '';
  cursosDisponibles: string[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const usuario = sessionStorage.getItem('usuario');
    if (!usuario) return;

    const userData = JSON.parse(usuario);
    this.nombreUsuario = userData.nombre || userData.correo;

    this.http.get<any>(`http://localhost:3000/api/juego/progreso/${userData.id}`).subscribe({
      next: (data) => {
        this.puntaje = data.puntaje;
        this.nivel = data.nivel;
        this.medallas = data.medallas;
        this.cargarCursos();
      },
      error: () => {
        this.puntaje = 0;
        this.nivel = 1;
        this.medallas = '';
      }
    });
  }

  cargarCursos() {
    this.cursosDisponibles = [];

    if (this.puntaje >= 100) this.cursosDisponibles.push('Curso básico de reciclaje ♻️');
    if (this.puntaje >= 300) this.cursosDisponibles.push('Curso de manejo de residuos sólidos 🗑️');
    if (this.puntaje >= 500) this.cursosDisponibles.push('Certificación en Gestión Ambiental 🌱');
  }
}

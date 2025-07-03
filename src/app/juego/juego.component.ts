import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import confetti from 'canvas-confetti'; // ⬅️ al inicio del archivo

interface Residuo {
  nombre: string;
  tipo: string;
  imagen: string;
}

@Component({
  selector: 'app-juego',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './juego.component.html',
  styleUrls: ['./juego.component.css']
})
export class JuegoComponent {
  residuos: Residuo[] = [];
  tachos = ['plastico', 'papel', 'organico', 'metal'];
  puntaje = 0;
  mensaje = '';
  residuoSeleccionado: Residuo | null = null;
  esMovil = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.reiniciarJuego();
    this.detectarMovil();
  }

  detectarMovil() {
    if (isPlatformBrowser(this.platformId)) {
      const toques = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      this.esMovil = toques;
    }
  }

  permitirSoltar(event: DragEvent) {
    event.preventDefault();
  }

  iniciarArrastre(event: DragEvent, residuo: Residuo) {
    if (!this.esMovil) {
      event.dataTransfer?.setData('text/plain', JSON.stringify(residuo));
    }
  }

  seleccionarResiduo(residuo: Residuo) {
    if (this.esMovil) {
      this.residuoSeleccionado = residuo;
    }
  }

  soltar(event: DragEvent, tipoTacho: string) {
    if (!this.esMovil) {
      event.preventDefault();
      const data = event.dataTransfer?.getData('text/plain');
      if (data) {
        const residuo: Residuo = JSON.parse(data);
        this.validarResiduo(residuo, tipoTacho);
      }
    }
  }

  soltarTactil(tipoTacho: string) {
    if (this.esMovil && this.residuoSeleccionado) {
      this.validarResiduo(this.residuoSeleccionado, tipoTacho);
      this.residuoSeleccionado = null;
    }
  }

  validarResiduo(residuo: Residuo, tipoTacho: string) {
    if (residuo.tipo === tipoTacho) {
      this.puntaje += 10;
      this.mensaje = `✅ ¡Correcto! ${residuo.nombre} va en el tacho ${tipoTacho}.`;
    } else {
      this.puntaje -= 5;
      this.mensaje = `❌ ${residuo.nombre} no va en el tacho ${tipoTacho}.`;
    }

    this.residuos = this.residuos.filter(r => r !== residuo);

    if (this.residuos.length === 0) {
      this.mensaje += ` 🎉 Puntaje final: ${this.puntaje}`;
      this.guardarPuntajeEnBD();
    }
  }

  reiniciarJuego() {
    this.puntaje = 0;
    this.mensaje = '';
    this.residuoSeleccionado = null;
    this.residuos = [
      { nombre: 'Botella de plástico', tipo: 'plastico', imagen: 'assets/residuos/botella.png' },
      { nombre: 'Periódico', tipo: 'papel', imagen: 'assets/residuos/periodico.png' },
      { nombre: 'Cáscara de plátano', tipo: 'organico', imagen: 'assets/residuos/cascara.png' },
      { nombre: 'Lata de gaseosa', tipo: 'metal', imagen: 'assets/residuos/lata.png' }
    ];
  }

  guardarPuntajeEnBD() {
    const usuario = sessionStorage.getItem('usuario');
    if (!usuario) return;

    const userData = JSON.parse(usuario);
    const body = {
      usuario_id: userData.id,
      puntaje: this.puntaje
    };

    this.http.post('http://localhost:3000/api/juego/guardar-puntaje', body).subscribe({
    next: (res: any) => {
      console.log(res.mensaje);
      this.mostrarCelebracion(); // 🎉 Aquí llamamos al confeti
    },
    error: (err) => console.error('❌ Error al guardar progreso:', err)
  });
  }

  mostrarCelebracion() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random(), y: Math.random() - 0.2 }
    });
  }, 250);
}

}

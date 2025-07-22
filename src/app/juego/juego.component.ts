// src/app/juego/juego.component.ts
import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import confetti from 'canvas-confetti';

interface Pregunta {
  pregunta: string;
  opciones: string[];
  respuesta: number;
}

interface Residuo {
  nombre: string;
  tipo: string;
  imagen: string;
}

interface Contenedor {
  tipo: string;
  nombre: string;
  imagen: string;
}

interface NivelConfig {
  tipo: 'quiz' | 'arrastrar';
  preguntas?: Pregunta[];
  residuos?: Residuo[];
  contenedores?: Contenedor[];
}

@Component({
  selector: 'app-juego',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './juego.component.html',
  styleUrls: ['./juego.component.css']
})
export class JuegoComponent implements OnInit {
  mensajeVisible = false;
  mensajeTexto = '';
  mensajeTipo: 'exito' | 'error' | 'advertencia' = 'exito';
  respuestaIncorrecta = false;
  todasCorrectas = true;
  arrastreCorrecto: boolean = true;

  usuario_id = 0;
  nivelActual = 0;
  puntaje = 0;
  medallas = '';
  niveles: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  mostrarModal = false;
  respuestaSeleccionada: number | null = null;
  tipoJuego: 'quiz' | 'arrastrar' = 'quiz';
  nivelSeleccionado = 0;
  preguntaActual = 0;
  puntajeJuego = 0;

  preguntas: Pregunta[] = [];
  residuos: Residuo[] = [];
  contenedores: Contenedor[] = [];
  draggedTipo: string = '';

  timer: any;
  tiempoRestante = 20;
  temporizadorActivo = false;
  bloquearPregunta: boolean = false;

  
  isMobile = false;
  residuoSeleccionado: Residuo | null = null;

  nivelesConfig: { [nivel: number]: NivelConfig } = {
    1: {
      tipo: 'quiz',
      preguntas: [
        {
          pregunta: '¿Qué material es 100% reciclable?',
          opciones: ['Plástico', 'Vidrio', 'Orgánico', 'Madera'],
          respuesta: 0
        },
        {
          pregunta: '¿Qué color representa los residuos orgánicos?',
          opciones: ['Rojo', 'Verde', 'Negro', 'Amarillo'],
          respuesta: 2
        },
        {
          pregunta: '¿Qué tipo de residuo va en el contenedor amarillo?',
          opciones: ['Papel', 'Metal', 'Plástico', 'Orgánico'],
          respuesta: 1
        }
      ]
    },
    2: {
      tipo: 'arrastrar',
      residuos: [
        { nombre: 'Botella', tipo: 'plastico', imagen: 'botellas_plastico.png' },
        { nombre: 'Cáscara de plátano', tipo: 'organico', imagen: 'cascara.png' },
        { nombre: 'Papel', tipo: 'papel', imagen: 'papel.png' },
        { nombre: 'Vidrio roto', tipo: 'vidrio', imagen: 'botella.png' }
      ],
      contenedores: [
        { tipo: 'plastico', nombre: 'Naranja', imagen: 'naranja.png' },
        { tipo: 'papel', nombre: 'Azul', imagen: 'azul.png' },
        { tipo: 'vidrio', nombre: 'Verde', imagen: 'verde.png' },
        { tipo: 'organico', nombre: 'Plomo', imagen: 'plomo.png' }
      ]
    },
    3: {
      tipo: 'quiz',
      preguntas: [
        {
          pregunta: '¿Qué producto es más dañino para el ambiente?',
          opciones: ['Batería', 'Cáscara de plátano', 'Vidrio', 'Cartón'],
          respuesta: 0
        },
        {
          pregunta: '¿Cuál es el símbolo universal del reciclaje?',
          opciones: ['♻️', '🗑️', '♨️', '✅'],
          respuesta: 0
        }
      ]
    },
    4: {
    tipo: 'quiz',
    preguntas: [
      {
        pregunta: '¿Qué residuo tarda más en degradarse?',
        opciones: ['Papel', 'Vidrio', 'Cáscara de fruta', 'Cartón'],
        respuesta: 1
      },
      {
        pregunta: '¿Cuál es el principal beneficio del reciclaje?',
        opciones: [
          'Aumentar la basura',
          'Ahorrar recursos naturales',
          'Gastar más energía',
          'Generar más residuos'
        ],
        respuesta: 1
      }
    ]
  },
  5: {
    tipo: 'arrastrar',
    residuos: [
      { nombre: 'Plancha rota', tipo: 'electrodomestico', imagen: 'plancha.png' }, // nuevo residuo
      { nombre: 'Envase de yogur', tipo: 'plastico', imagen: 'envases_yogurt.png' }, // reemplazo
      { nombre: 'Caja de cartón', tipo: 'papel', imagen: 'caja.png' },
      { nombre: 'Taza rota', tipo: 'vidrio', imagen: 'taza_rota.png' }
    ],
    contenedores: [
      { tipo: 'plastico', nombre: 'Amarillo', imagen: 'amarillo.png' },
      { tipo: 'papel', nombre: 'Azul', imagen: 'azul.png' },
      { tipo: 'vidrio', nombre: 'Verde', imagen: 'verde.png' },
      { tipo: 'electrodomestico', nombre: 'Rojo', imagen: 'rojo.png' } // nuevo contenedor
    ]
  },
  6: {
    tipo: 'quiz',
    preguntas: [
      {
        pregunta: '¿Qué tipo de residuos van en el contenedor azul?',
        opciones: ['Plástico', 'Vidrio', 'Papel', 'Orgánico'],
        respuesta: 2
      },
      {
        pregunta: '¿Qué debemos hacer antes de reciclar una botella plástica?',
        opciones: ['Romperla', 'Ensuciarla', 'Aplastarla y enjuagarla', 'Quemarla'],
        respuesta: 2
      }
    ]
  },
  7: {
    tipo: 'quiz',
    preguntas: [
      {
        pregunta: '¿Cuál de estos elementos se puede reutilizar fácilmente en casa?',
        opciones: ['Aceite usado', 'Botella de vidrio', 'Cáscara de huevo', 'Cigarrillos'],
        respuesta: 1
      },
      {
        pregunta: '¿Qué acción ayuda más al reciclaje desde casa?',
        opciones: ['Tirar todo en una sola bolsa', 'Separar los residuos por tipo', 'Quemar la basura', 'Usar bolsas negras para todo'],
        respuesta: 1
      }
    ]
  },
  8: {
    tipo: 'quiz',
    preguntas: [
      {
        pregunta: '¿Qué tipo de residuo representa un riesgo para la salud si no se maneja adecuadamente?',
        opciones: ['Papel', 'Restos de comida', 'Pilas', 'Cartón'],
        respuesta: 2
      },
      {
        pregunta: '¿Qué debe hacerse con los aparatos electrónicos en desuso?',
        opciones: ['Tirarlos al tacho común', 'Llevarlos a un punto limpio o especial', 'Regalarlos sin verificar su estado', 'Enterrarlos en el jardín'],
        respuesta: 1
      },
      {
        pregunta: '¿Cuál de estos hábitos reduce la generación de residuos?',
        opciones: ['Comprar productos con mucho empaque', 'Usar bolsas reutilizables', 'Consumir productos desechables', 'Imprimir documentos innecesarios'],
        respuesta: 1
      }
    ]
  },
  9: {
    tipo: 'quiz',
    preguntas: [
      {
        pregunta: '¿Qué acción es mejor para cuidar el medio ambiente?',
        opciones: ['Usar el auto para todo', 'Separar residuos en casa', 'Comprar productos desechables', 'Usar agua sin control'],
        respuesta: 1
      },
      {
        pregunta: '¿Cuál es una alternativa ecológica al papel de aluminio?',
        opciones: ['Plástico film', 'Papel reciclado', 'Servilletas de papel', 'Tela encerada reutilizable'],
        respuesta: 3
      },
      {
        pregunta: '¿Qué material contamina más los mares?',
        opciones: ['Cáscaras de frutas', 'Hojas secas', 'Botellas plásticas', 'Cartón mojado'],
        respuesta: 2
      }
    ]
  },
  10: {
    tipo: 'quiz',
    preguntas: [
      {
        pregunta: '¿Qué significa la economía circular?',
        opciones: [
          'Un modelo que busca reciclar y reutilizar continuamente',
          'Un sistema donde todo se desecha rápidamente',
          'Una forma de gastar más recursos naturales',
          'Una política de comprar sin límites'
        ],
        respuesta: 0
      },
      {
        pregunta: '¿Qué residuo puede usarse para hacer compost en casa?',
        opciones: ['Pilas usadas', 'Cáscaras de fruta', 'Vidrio roto', 'Envases metálicos'],
        respuesta: 1
      }
    ]
  }

  };


  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private esLocalhost(): boolean {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  private getApiUrl(): string {
    return this.esLocalhost()
      ? 'http://localhost:3000/api/juego/guardar-puntaje'
      : 'https://comunidadvapps.com/api.php?accion=guardar-puntaje';
  }

  private getProgresoUrl(): string {
    return this.esLocalhost()
      ? `http://localhost:3000/api/progreso/${this.usuario_id}`
      : `https://comunidadvapps.com/api.php?accion=progreso&id=${this.usuario_id}`;
  }


  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const usuario = sessionStorage.getItem('usuario_id');
      if (usuario) {
        this.usuario_id = Number(usuario);
        this.obtenerProgreso();
      } else {
        this.mostrarMensaje('⚠️ No se encontró sesión de usuario', 'advertencia');
        this.router.navigate(['/inicio']);
      }
    }
  }

  getApiProgresoUrl(): string {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal
    ? 'http://localhost:3000/api/progreso/'
    : 'https://comunidadvapps.com/api.php?accion=progreso&usuario_id=';
}


  obtenerProgreso(): void {
  const apiUrl = this.getApiProgresoUrl(); // 👈 nueva función
  this.http.get<any>(`${apiUrl}${this.usuario_id}`).subscribe({
    next: data => {
      this.nivelActual = data.nivel;
      this.puntaje = data.puntaje;
      this.medallas = data.medallas;
    },

  });
}



  guardarPuntaje(): void {
    const nuevoNivel = Math.max(this.nivelActual, this.nivelSeleccionado);
    const nuevaMedalla = this.calcularMedallaPorNivel(nuevoNivel);
    const puntajeValido = this.puntajeJuego > 0 ? this.puntajeJuego : 0;

    const url = this.getApiUrl();
    const data = {
      usuario_id: this.usuario_id,
      puntaje: puntajeValido,
      nivel: nuevoNivel,
      medallas: nuevaMedalla
    };

    const body = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      body.set(key, value.toString());
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    this.http.post(url, this.esLocalhost() ? data : body.toString(), this.esLocalhost() ? {} : { headers }).subscribe({
      next: (res: any) => {
        this.mostrarModal = false;
        this.dispararConfetti();
        this.obtenerProgreso();
        this.mostrarMensaje(res.mensaje || '✅ Progreso guardado', 'exito');
      },
      error: (err) => {
        const msg = err?.error?.mensaje || '❌ Error inesperado al guardar';
        this.mostrarMensaje(msg, 'error');
      }
    });
  }

  mostrarMensaje(texto: string, tipo: 'exito' | 'error' | 'advertencia' = 'exito'): void {
    this.mensajeTexto = texto;
    this.mensajeTipo = tipo;
    this.mensajeVisible = true;
    setTimeout(() => {
      this.mensajeVisible = false;
    }, 2000);
  }

  iniciarTemporizador(): void {
    clearInterval(this.timer);
    this.tiempoRestante = 20;
    this.temporizadorActivo = true;
    this.bloquearPregunta = false;

    this.timer = setInterval(() => {
      this.tiempoRestante--;
      if (this.tiempoRestante <= 0) {
        clearInterval(this.timer);
        this.temporizadorActivo = false;
        this.bloquearPregunta = true;
        this.todasCorrectas = false;

        setTimeout(() => {
          this.preguntaActual++;
          this.respuestaSeleccionada = null;
          if (this.preguntaActual >= this.preguntas.length) {
            this.finalizarQuiz();
          } else {
            this.iniciarTemporizador();
          }
        }, 800);
      }
    }, 1000);
  }

  jugarNivel(nivel: number): void {
    if (nivel > this.nivelActual + 1) {
      this.mostrarMensaje('⚠️ Debes completar los niveles anteriores primero', 'advertencia');
      return;
    }

    const config = this.nivelesConfig[nivel];
    if (!config) {
      this.mostrarMensaje('⚠️ Nivel no disponible aún', 'advertencia');
      return;
    }

    this.nivelSeleccionado = nivel;
    this.tipoJuego = config.tipo;
    this.puntajeJuego = 0;
    this.preguntaActual = 0;
    this.todasCorrectas = true;
    this.arrastreCorrecto = true;
    this.respuestaSeleccionada = null;

    if (config.tipo === 'quiz') {
      this.preguntas = config.preguntas || [];
      this.iniciarTemporizador();
    } else if (config.tipo === 'arrastrar') {
      this.residuos = [...(config.residuos || [])];
      this.contenedores = config.contenedores || [];
      this.iniciarTemporizador();
    }

    this.mostrarModal = true;
  }

  seleccionarOpcion(indice: number): void {
    if (this.respuestaSeleccionada !== null || this.bloquearPregunta) return;

    clearInterval(this.timer);
    this.temporizadorActivo = false;
    this.respuestaSeleccionada = indice;

    const correcta = this.preguntas[this.preguntaActual].respuesta;
    const esCorrecta = indice === correcta;

    if (!esCorrecta) {
      this.todasCorrectas = false;
    } else {
      //this.puntajeJuego += 100;
      //this.puntajeJuego += 15;
    }

    setTimeout(() => {
      this.preguntaActual++;
      this.respuestaSeleccionada = null;

      if (this.preguntaActual >= this.preguntas.length) {
        this.finalizarQuiz();
      } else {
        this.iniciarTemporizador();
      }
    }, 1000);
  }

  finalizarQuiz(): void {
  if (this.todasCorrectas) {
    this.puntajeJuego = 15; // ✅ Puntaje total por completar el quiz correctamente
    this.mostrarMensaje('🎉 ¡Felicitaciones! Completaste el nivel correctamente 🎯', 'exito');
    this.guardarPuntaje();
  } else {
    this.mostrarMensaje('❌ Fallaste alguna pregunta o no respondiste a tiempo', 'error');
    this.mostrarModal = false;
    this.todasCorrectas = true;
  }
}


  drop(event: DragEvent, tipoContenedor: string): void {
    event.preventDefault();

    if (!this.draggedTipo || this.bloquearPregunta) return;

    clearInterval(this.timer);
    this.temporizadorActivo = false;

    if (this.draggedTipo === tipoContenedor) {
      //this.puntajeJuego += 100;
      //this.puntajeJuego += 15;
      this.mostrarMensaje('✅ ¡Correcto!', 'exito');
    } else {
      this.arrastreCorrecto = false;
      this.mostrarMensaje('❌ Incorrecto', 'error');
    }

    this.residuos = this.residuos.filter(r => r.tipo !== this.draggedTipo);
    this.draggedTipo = '';

    if (this.residuos.length === 0) {
      this.finalizarArrastrar();
    } else {
      this.iniciarTemporizador();
    }
  }

  finalizarArrastrar(): void {
  if (this.arrastreCorrecto) {
    this.puntajeJuego = 15; // ✅ Puntaje fijo por nivel arrastrar completado correctamente
    this.mostrarMensaje('🎉 ¡Excelente! Completaste el nivel correctamente 🎯', 'exito');
    this.guardarPuntaje();
  } else {
    this.mostrarMensaje('❌ Fallaste al arrastrar algún residuo. Intenta de nuevo', 'error');
    this.mostrarModal = false;
    this.arrastreCorrecto = true;
  }
}


  dragStart(event: DragEvent, tipo: string): void {
    this.draggedTipo = tipo;
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  calcularMedallaPorNivel(nivel: number): string {
    if (nivel >= 9) return '🥇 Oro';
    if (nivel >= 6) return '🥈 Plata';
    if (nivel >= 3) return '🥉 Bronce';
    return 'Sin medalla';
  }

  dispararConfetti(): void {
    if (isPlatformBrowser(this.platformId)) {
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
    }
  }

  esCorrecto(indice: number): boolean {
    return (
      this.respuestaSeleccionada === indice &&
      this.preguntas[this.preguntaActual].respuesta === indice &&
      !this.bloquearPregunta
    );
  }

  esIncorrecto(indice: number): boolean {
    return (
      this.respuestaSeleccionada === indice &&
      this.preguntas[this.preguntaActual].respuesta !== indice
    ) || this.bloquearPregunta;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    clearInterval(this.timer);
    this.temporizadorActivo = false;
    this.bloquearPregunta = true;
  }
  seleccionarResiduoMovil(residuo: Residuo): void {
  if (this.bloquearPregunta) return;
  this.residuoSeleccionado = residuo;
  this.mostrarMensaje(`✅ Residuo seleccionado: ${residuo.nombre}`, 'exito');
}

seleccionarContenedorMovil(tipoContenedor: string): void {
  if (this.bloquearPregunta) return;

  if (!this.residuoSeleccionado) {
    this.mostrarMensaje('⚠️ Primero selecciona un residuo', 'advertencia');
    return;
  }

  clearInterval(this.timer);
  this.temporizadorActivo = false;

  if (this.residuoSeleccionado.tipo === tipoContenedor) {
    this.mostrarMensaje('✅ ¡Correcto!', 'exito');
  } else {
    this.arrastreCorrecto = false;
    this.mostrarMensaje('❌ Incorrecto', 'error');
  }

  this.residuos = this.residuos.filter(r => r !== this.residuoSeleccionado);
  this.residuoSeleccionado = null;

  if (this.residuos.length === 0) {
    this.finalizarArrastrar();
  } else {
    this.iniciarTemporizador();
  }
}

}

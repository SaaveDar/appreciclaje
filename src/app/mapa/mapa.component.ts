import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as levenshtein from 'fast-levenshtein';
import { AuthService } from '../servicios/auth.service'; // ✅ Asegúrate de tener esta importación
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

declare var google: any;

// Interfaz para definir la estructura de un punto de interés
interface PointOfInterest {
  lat: number;
  lng: number;
  name: string;
  markerTitle: string;
  iconUrl?: string; // ✅ ícono personalizado (opcional)
}

interface Message {
  tipo: 'usuario' | 'ia';
  //texto: string;
  texto: string | SafeHtml;
  fullText?: string;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit, OnDestroy {
  map: any;
  userPrompt: string = '';
  userLocation: { lat: number; lng: number } | null = null;
  directionsService: any;
  private activeDirectionsRenderers: google.maps.DirectionsRenderer[] = [];
  mensajeRuta: string = '';
  currentMarkerInfoWindow: any = null;
  ubicacionActualInfoWindow: any = null;
  rutaInterval: any;
  mensajesIA: Message[] = [];
  userAddress: string | null = null;

  isWaitingForResponse: boolean = false; // Controla el estado del botón "Enviar/Detener" y la deshabilitación
  private currentSpeechUtterance: SpeechSynthesisUtterance | null = null; // Para controlar la voz activa
  private typingTimeout: any; // Para controlar el timeout del efecto de escritura
  private isTyping: boolean = false; // Nueva bandera para controlar si la IA está escribiendo

  private readonly MAX_DISTANCE_KM = 5;

  private readonly LEVENSHTEIN_THRESHOLD = 2;
  private readonly PHRASE_MATCH_PERCENTAGE = 0.7;

  private readonly KNOWN_CITIES = [
    { name: 'trujillo', lat: -8.115, lng: -79.028 },
    { name: 'paijan', lat: -7.734, lng: -79.308 },
    { name: 'chocope', lat: -7.825, lng: -79.237 },
  ];

  private readonly KEY_PHRASES = {
    allPointsNearby: [
      'trazame los puntos cerca de mi ubicacion actual',
      'muestrame los puntos de reciclaje cercanos',
      'quiero ver los puntos cercanos',
      'trazar todos los puntos de reciclaje cerca',
      'trazame los puntos mas cerca de mi ubicacion',
      'muestrame los puntos de reciclaje mas cercanos',
      'quiero ver los puntos mas cerca',
      'todos los puntos mas cercanos',
      'puntos de reciclaje cerca de mi',
      'donde reciclar cerca'
    ],
    closestPoint: [
      'mas cercano',
      'mas proximo',
      'punto mas cercano',
      'punto mas proximo',
      'el mas cerca',
      'punto mas cerca',
      'reciclaje mas cercano'
    ],
  };

  pointsOfInterest: PointOfInterest[] = [
    { lat: -8.112, lng: -79.028, name: 'Trujillo Centro', markerTitle: 'Punto de reciclaje: Trujillo Centro' },
    { lat: -8.100, lng: -79.030, name: 'Urbanización La Merced', markerTitle: 'Punto de reciclaje: Urbanización La Merced' },
    { lat: -8.118, lng: -79.022, name: 'Urbanización Primavera', markerTitle: 'Punto de reciclaje: Urbanización Primavera' },
    { lat: -8.106, lng: -79.040, name: 'Plaza de Armas de Trujillo', markerTitle: 'Punto de reciclaje: Plaza de Armas de Trujillo' },
    { lat: -8.121, lng: -79.034, name: 'Hospital Regional', markerTitle: 'Punto de reciclaje: Hospital Regional' },
    { lat: -7.824, lng: -79.237, name: 'Chocope', markerTitle: 'Punto de reciclaje: Plaza de Chocope' },
    { lat: -7.732, lng: -79.307, name: 'Plaza de Paiján', markerTitle: 'Punto de reciclaje: Plaza de Paiján' },
    { lat: -7.730, lng: -79.305, name: 'Iglesia Matriz de Paiján', markerTitle: 'Punto de reciclaje: Iglesia Matriz de Paiján' },
    { lat: -7.735, lng: -79.309, name: 'Av. Víctor Raúl Haya de la Torre', markerTitle: 'Punto de reciclaje: Av. Víctor Raúl Haya de la Torre' },
    { lat: -7.734, lng: -79.311, name: 'Mercado de Paiján', markerTitle: 'Punto de reciclaje: Mercado de Paiján' },
    { lat: -7.736, lng: -79.306, name: 'Calle Comercio', markerTitle: 'Punto de reciclaje: Calle Comercio' },
    { lat: -7.825, lng: -79.239, name: 'Av. Panamericana Norte', markerTitle: 'Punto de reciclaje: Av. Panamericana Norte' },
    { lat: -7.823, lng: -79.235, name: 'Municipalidad de Chocope', markerTitle: 'Punto de reciclaje: Municipalidad de Chocope' },
    { lat: -7.826, lng: -79.238, name: 'Centro de Salud Chocope', markerTitle: 'Punto de reciclaje: Centro de Salud Chocope' },
    { lat: -7.822, lng: -79.236, name: 'Calle Bolívar', markerTitle: 'Punto de reciclaje: Calle Bolívar' },
    { lat: -7.7352, lng: -79.3056, name: 'IESTP Paiján', markerTitle: 'Punto de reciclaje: IESTP Paiján' },
    { lat: -8.11458, lng: -79.03929, name: 'Universidad Nacional de Trujillo', markerTitle: 'Punto de reciclaje: UNT Trujillo' },
    { lat: -7.4782, lng: -78.8298, name: 'IESTP de Cascas', markerTitle: 'Punto de reciclaje: IESTP de Cascas' },
    { lat: -8.1136, lng: -79.0290, name: 'Municipalidad Provincial de Trujillo', markerTitle: 'Punto de reciclaje: Municipalidad de Trujillo (MPT)', iconUrl:'🏛️' }

  ];

  private placedMarkers: Map<string, google.maps.Marker> = new Map();

  constructor(@Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService, // ✅ Esto habilita el acceso a usuario$
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
      this.rutaInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          },
          (err) => console.error('Error obteniendo ubicación actualizada:', err),
          { enableHighAccuracy: true }
        );
      }, 15000);
    }
  }

  ngOnDestroy(): void {
    if (this.rutaInterval) clearInterval(this.rutaInterval);
    this.clearAllRoutes();
    this.stopAllProcessing(); // Detener todo al destruir el componente
  }

  toggleDarkMode(event: any): void {
    const isDark = event.target.checked;
    const r = document.documentElement.style;
    if (isDark) {
      r.setProperty('--color-bg', '#121212');
      r.setProperty('--color-card', '#1e1e1e');
      r.setProperty('--color-text', '#e0e0e0');
      r.setProperty('--color-input-bg', '#2a2a2a');
      r.setProperty('--color-button', '#2196f3');
      r.setProperty('--color-button-hover', '#1976d2');
      r.setProperty('--color-border', '#444');
    } else {
      r.setProperty('--color-bg', '#ffffff');
      r.setProperty('--color-card', '#ffffff');
      r.setProperty('--color-text', '#333333');
      r.setProperty('--color-input-bg', '#f1f1f1');
      r.setProperty('--color-button', '#4a90e2');
      r.setProperty('--color-button-hover', '#357ab7');
      r.setProperty('--color-border', '#ccc');
    }
  }

  initMap(): void {
    if (!navigator.geolocation) {
      this.displayAIResponse('❌ Geolocalización no soportada en este navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        const opts = {
          center: this.userLocation,
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        };

        this.map = new google.maps.Map(document.getElementById('map')!, opts);
        this.directionsService = new google.maps.DirectionsService();

        this.addMarkers();

        const marker = new google.maps.Marker({
          position: this.userLocation,
          map: this.map,
          title: 'Tu ubicación actual',
          icon: {
            url: 'https://maps.gstatic.com/mapfiles/ms2/micons/ltblue-dot.png',
            scaledSize: new google.maps.Size(40, 40)
          }
        });

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: this.userLocation }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            const direccion = results[0].formatted_address;
            this.userAddress = direccion;
            this.ubicacionActualInfoWindow = new google.maps.InfoWindow({
              content: `<b>Estás en:</b><br>${direccion}`
            });
            this.ubicacionActualInfoWindow.open(this.map, marker);
          } else {
            console.warn('No se pudo obtener dirección:', status);
          }
        });
      },
      err => {
        console.error('Error obteniendo ubicación:', err);
        this.displayAIResponse('❌ No se pudo obtener tu ubicación. Asegúrate de habilitar los permisos y el GPS.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  scrollAlFinal(): void {
    setTimeout((): void => {
      const contenedor = document.querySelector('.conversacion') as HTMLElement;
      if (contenedor) {
        contenedor.scrollTop = contenedor.scrollHeight;
      }
    }, 100);
  }

   // Función para convertir Markdown a HTML (sin eliminar emojis)
  private convertMarkdownToHtml(text: string): string {
    // Reemplaza **texto** con <b>texto</b>
    return text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  }

    // MODIFICADO: Ahora recibe el texto en Markdown/Texto plano y lo convierte a HTML internamente
  displayAIResponse(responseText: string, speakText?: string): void {
    const htmlResponseText = this.convertMarkdownToHtml(responseText); // Convierte Markdown a HTML
    this.mensajesIA.push({ tipo: 'ia', texto: '', fullText: htmlResponseText });
    const messageIndex = this.mensajesIA.length - 1;
    // Texto plano para el typing y para el habla, limpiando abreviaciones y emojis
    const plainTextForTypingAndSpeaking = this.cleanTextForSpeech(responseText);
    this.typeWriterEffect(plainTextForTypingAndSpeaking, messageIndex, speakText, htmlResponseText); // Pasa el texto plano para typing y el HTML final
    this.scrollAlFinal();
  }

  // MODIFICADO: Ahora maneja el texto plano para typing y el HTML final para la visualización
  typeWriterEffect(plainText: string, messageIndex: number, speakText?: string, finalHtmlText?: string, charIndex: number = 0): void {
    this.isTyping = true;
    this.isWaitingForResponse = true;

    if (charIndex < plainText.length) {
      if (typeof this.mensajesIA[messageIndex].texto !== 'string') {
        this.mensajesIA[messageIndex].texto = '';
      }
      (this.mensajesIA[messageIndex].texto as string) += plainText.charAt(charIndex);

      charIndex++;
      this.typingTimeout = setTimeout(() => {
        this.typeWriterEffect(plainText, messageIndex, speakText, finalHtmlText, charIndex);
      }, 15);
    } else {
      this.isTyping = false;
      if (finalHtmlText) {
        this.mensajesIA[messageIndex].texto = this.sanitizer.bypassSecurityTrustHtml(finalHtmlText);
      } else if (this.mensajesIA[messageIndex].fullText) {
        this.mensajesIA[messageIndex].texto = this.sanitizer.bypassSecurityTrustHtml(this.mensajesIA[messageIndex].fullText as string);
      }

      if (speakText) {
        this.speak(this.cleanTextForSpeech(speakText)); // Asegúrate de limpiar el texto para el habla
      } else {
        this.stopProcessing();
      }
    }
  }

  /**
   * Determina si el texto del usuario es similar a alguna de las frases esperadas.
   * Utiliza la distancia de Levenshtein para comparar palabras y un umbral de coincidencia.
   * @param userText El texto ingresado por el usuario, ya limpio.
   * @param expectedPhrases Un array de frases de referencia.
   * @returns `true` si hay una coincidencia suficiente, `false` en caso contrario.
   */
  private isSimilar(userText: string, expectedPhrases: string[]): boolean {
    const cleanedUserText = this.cleanText(userText);
    for (const expectedPhrase of expectedPhrases) {
      const cleanedExpectedPhrase = this.cleanText(expectedPhrase);
      const userWords = cleanedUserText.split(' ').filter(word => word.length > 0);
      const expectedWords = cleanedExpectedPhrase.split(' ').filter(word => word.length > 0);

      let matchedKeywordsCount = 0;
      const totalKeywordsInPhrase = expectedWords.length;

      for (const expectedWord of expectedWords) {
        let wordFoundFuzzy = false;
        for (const userWord of userWords) {
          if (levenshtein.get(userWord, expectedWord) <= this.LEVENSHTEIN_THRESHOLD) {
            wordFoundFuzzy = true;
            break;
          }
        }
        if (wordFoundFuzzy) {
          matchedKeywordsCount++;
        }
      }

      if (totalKeywordsInPhrase > 0 && (matchedKeywordsCount / totalKeywordsInPhrase >= this.PHRASE_MATCH_PERCENTAGE)) {
        console.log(`Coincidencia de intención: "${userText}" con frase: "${expectedPhrase}". Palabras coincidentes: ${matchedKeywordsCount}/${totalKeywordsInPhrase}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Intenta identificar si el prompt del usuario es una solicitud para una ubicación específica
   * y devuelve el nombre normalizado de la ubicación si la encuentra.
   * @param cleanedUserPrompt El prompt del usuario ya limpio.
   * @returns El nombre exacto del POI si se encuentra una coincidencia, o `null` si no.
   */
  private isSpecificLocationRequest(cleanedUserPrompt: string): string | null {
    const navigationKeywords = ['llevame', 'ruta', 'ir', 'como llegar', 'donde', 'destino'];
    let hasNavigationIntent = false;
    for (const keyword of navigationKeywords) {
      if (cleanedUserPrompt.includes(keyword)) {
        hasNavigationIntent = true;
        break;
      }
    }

    for (const poi of this.pointsOfInterest) {
      const cleanedPoiName = this.cleanText(poi.name);

      if (cleanedUserPrompt === cleanedPoiName) {
        return poi.name;
      }

      if (levenshtein.get(cleanedUserPrompt, cleanedPoiName) <= this.LEVENSHTEIN_THRESHOLD + 1) {
        return poi.name;
      }

      const userWords = cleanedUserPrompt.split(' ').filter(word => word.length > 0);
      const poiNameWords = cleanedPoiName.split(' ').filter(word => word.length > 0);

      let matchedPoiWords = 0;
      for (const poiWord of poiNameWords) {
        for (const userWord of userWords) {
          if (levenshtein.get(userWord, poiWord) <= this.LEVENSHTEIN_THRESHOLD) {
            matchedPoiWords++;
            break;
          }
        }
      }

      if (poiNameWords.length > 0 &&
        (matchedPoiWords / poiNameWords.length >= 0.6) &&
        (hasNavigationIntent || (matchedPoiWords === poiNameWords.length && poiNameWords.length > 1))
      ) {
        console.log(`Ubicación detectada (fuzzy): "${poi.name}" en prompt "${cleanedUserPrompt}"`);
        return poi.name;
      }
    }

    // AÑADIDO: Bucle para reconocer ciudades conocidas
    for (const city of this.KNOWN_CITIES) {
      const cleanedCityName = this.cleanText(city.name);
      if (levenshtein.get(cleanedUserPrompt, cleanedCityName) <= this.LEVENSHTEIN_THRESHOLD) {
        console.log(`Ciudad conocida detectada: "${city.name}"`);
        return city.name;
      }
    }

    return null;
  }

  private cleanText(text: string): string {
    return text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .replace(/\s+/g, " ").trim();
  }

    // Nuevo método para limpiar y expandir abreviaciones para el habla (aquí se eliminan los emojis)
  private cleanTextForSpeech(text: string): string {
    // Eliminar emojis
    //let cleanedText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '');

    // Después (nueva regex para incluir un rango más amplio de símbolos y el selector de variación):
    let cleanedText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u26FF\u{2700}-\u27BF]|\ufe0f/gu, '');

    // Reemplazar abreviaciones
    cleanedText = cleanedText.replace(/\bkm\b/gi, 'kilómetros');
    cleanedText = cleanedText.replace(/\baprox\b/gi, 'aproximadamente');
    cleanedText = cleanedText.replace(/\bh\b/gi, 'horas');
    cleanedText = cleanedText.replace(/\bmin\b/gi, 'minutos');
    // Eliminar el formato Markdown para el habla
    cleanedText = cleanedText.replace(/\*\*(.*?)\*\*/g, '$1');
    return cleanedText;
  }

  // --- NUEVO MÉTODO PARA DETENER LA VOZ ---
  stopSpeech(): void {
    if (this.currentSpeechUtterance && speechSynthesis.speaking) {
      speechSynthesis.cancel(); // Detiene la reproducción actual
      this.currentSpeechUtterance = null;
    }
  }

  // --- NUEVO MÉTODO PARA DETENER LA ESCRITURA ---
  stopTyping(): void {
    if (this.isTyping && this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.isTyping = false;
    }
    const lastMessage = this.mensajesIA[this.mensajesIA.length - 1];
    if (lastMessage && lastMessage.tipo === 'ia' && lastMessage.fullText) {
      lastMessage.texto = this.sanitizer.bypassSecurityTrustHtml(lastMessage.fullText);
    }
  }

  // --- NUEVO MÉTODO PARA DETENER CUALQUIER PROCESAMIENTO (voz y escritura) ---
  stopAllProcessing(): void {
    this.stopSpeech();
    this.stopTyping();
    this.stopProcessing(); // Finalmente, restablece el estado del botón
  }

  // --- NUEVO MÉTODO PARA FINALIZAR EL ESTADO DE PROCESAMIENTO (el botón) ---
  private stopProcessing(): void {
    this.isWaitingForResponse = false;
  }

  // Define speak as a class method
  private speak(text: string): void {
    this.stopSpeech(); // Detiene cualquier audio anterior antes de iniciar uno nuevo
    if ('speechSynthesis' in window) {
      this.currentSpeechUtterance = new SpeechSynthesisUtterance(text);
      this.currentSpeechUtterance.lang = 'es-ES'; // Establece el idioma a español de España.

      // Añadir un listener para cuando la voz termine, para actualizar el estado
      this.currentSpeechUtterance.onend = () => {
        this.stopProcessing(); // Una vez que la IA termine de hablar
      };
      this.currentSpeechUtterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        this.stopProcessing(); // Si hay un error, también detén el estado de "procesando"
      };

      speechSynthesis.speak(this.currentSpeechUtterance);
    } else {
      console.warn("Text-to-speech not supported in this browser.");
      this.stopProcessing(); // Si no hay TTS, el procesamiento "termina" inmediatamente
    }
  }

   private esSaludoNatural(userText: string): boolean {
    const saludoEsperado = 'hola';
    const textoLimpio = this.cleanText(userText);

    // ✅ Coincidencia exacta o con errores leves (hasta 2 caracteres de diferencia)
    if (levenshtein.get(textoLimpio, saludoEsperado) <= 2) {
      return true;
    }

    // ✅ Si incluye formas inglesas con errores leves
    const saludoIngles = 'hello';
    if (levenshtein.get(textoLimpio, saludoIngles) <= 2) {
      return true;
    }

    return false;
  }

  procesarPrompt(): void {
    
    if (this.isWaitingForResponse) {
      // Si ya está esperando, el botón se comporta como "Detener"
      this.stopAllProcessing(); // Detiene tanto la voz como la escritura y resetea el estado
      return; // Salir de la función
    }

    if (!this.userLocation) {
      this.displayAIResponse('🔄 Esperando ubicación para poder ayudarte...', 'Esperando ubicación para poder ayudarte.');
      return;
    }

    const currentPrompt = this.userPrompt.trim();
    if (currentPrompt === '') {
      return;
    }

    if (this.esSaludoNatural(currentPrompt)) {
      this.mensajesIA.push({ tipo: 'usuario', texto: currentPrompt });
      this.userPrompt = '';
      this.scrollAlFinal();

      const nombre = this.authService?.usuario$.value?.nombre || 'amigo';
      const saludo = `¡Hola **${nombre}**! Soy tu inteligencia artificial orientada a encontrar la ruta más rápida a los puntos estratégicos de reciclaje. ¡Estoy lista para ayudarte a salvar el planeta!.¿Qué lugar o dirección quieres que te traze en el mapa?. 🌎♻️`;
      this.displayAIResponse(saludo, this.cleanTextForSpeech(saludo)); // Limpiar para el habla
      return;
    }

    this.mensajesIA.push({ tipo: 'usuario', texto: currentPrompt });
    this.userPrompt = '';
    this.scrollAlFinal();

    this.isWaitingForResponse = true;

    const cleanedUserPrompt = this.cleanText(currentPrompt);
    const recognizedLocationOrCity = this.isSpecificLocationRequest(cleanedUserPrompt);

    if (recognizedLocationOrCity) {
      const isKnownCity = this.KNOWN_CITIES.some(city => city.name === recognizedLocationOrCity);

      if (isKnownCity) {
        const cityData = this.KNOWN_CITIES.find(city => city.name === recognizedLocationOrCity);
        if (cityData) {
          const relevantPoints = this.pointsOfInterest.filter(poi =>
            this.cleanText(poi.name).includes(cityData.name) ||
            this.dist({ lat: cityData.lat, lng: cityData.lng }, poi) <= this.MAX_DISTANCE_KM * 2
          );

          if (relevantPoints.length > 0) {
            const poiNames = relevantPoints.map(p => p.name).join(', ');
            const responseHtml = `✅ Entendido. Has preguntado por **${cityData.name}**. ¡Excelente elección! Aquí tenemos puntos de reciclaje en: ${poiNames}. ¿Quieres que te muestre el más cercano o todos los puntos en **${cityData.name}**?`;
            const responseText = `Entendido. Has preguntado por ${cityData.name}. Excelente elección. Aquí tenemos puntos de reciclaje en: ${poiNames}. Quieres que te muestre el más cercano o todos los puntos en ${cityData.name}?`;
            this.displayAIResponse(responseHtml, this.cleanTextForSpeech(responseText)); // Limpiar para el habla
          } else {
            const response = `Lo siento, aunque reconocí "**${recognizedLocationOrCity}**", ¡parece que mis mapas no tienen puntos de reciclaje en esa ciudad todavía! Mis puntos se centran en **Trujillo, Paiján y Chocope**. ¿Probamos con alguna de ellas?`;
            this.displayAIResponse(response, this.cleanTextForSpeech(response)); // Limpiar para el habla
          }
        }
      } else {
        this.displayAIResponse(`De acuerdo, buscando la ruta hacia **${recognizedLocationOrCity}**... ¡A por esa aventura de reciclaje!`, `De acuerdo, buscando la ruta hacia ${recognizedLocationOrCity}. A por esa aventura de reciclaje!`);
        this.rutaEspecifica(recognizedLocationOrCity, false);
      }
    } else if (this.isSimilar(cleanedUserPrompt, this.KEY_PHRASES.allPointsNearby)) {
      this.displayAIResponse('¡Entendido! Buscando los puntos de reciclaje más cercanos y trazando rutas... ¡Prepárate para la acción!', 'Entendido. Buscando los puntos de reciclaje más cercanos y trazando rutas. Prepárate para la acción!');
      this.trazarTodasRutasCercanas(false);
    } else if (this.isSimilar(cleanedUserPrompt, this.KEY_PHRASES.closestPoint)) {
      this.displayAIResponse('Claro, buscando el punto de reciclaje más cercano y trazando la ruta... ¡El más rápido gana!', 'Claro, buscando el punto de reciclaje más cercano y trazando la ruta. El más rápido gana!');
      this.rutaMasCercana(false);
    } else {
      this.handleUnknownLocation(currentPrompt);
    }
  }

  // NUEVA FUNCIÓN AUXILIAR PARA QUITAR COMILLAS
  private stripQuotes(text: string): string {
    if (text.startsWith('"') && text.endsWith('"')) {
      return text.substring(1, text.length - 1);
    }
    return text;
  }

  // NUEVO MÉTODO PARA MANEJAR UBICACIONES DESCONOCIDAS
  private async handleUnknownLocation(receivedUserPrompt: string): Promise<void> {
    const geocoder = new google.maps.Geocoder();
    const cleanedPromptForGeocoder = this.cleanText(receivedUserPrompt);
    const displayPrompt = this.stripQuotes(receivedUserPrompt); // Quitar comillas para mostrar

    try {
      const result = await geocoder.geocode({ address: cleanedPromptForGeocoder });

      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const formattedAddress = result.results[0].formatted_address;

        const isWithinKnownArea = this.isLocationWithinKnownArea(location.lat(), location.lng());

        if (isWithinKnownArea) {
          const responseHtml = `🤔 ¡Vaya! Parece que estás buscando **${displayPrompt}** (${formattedAddress}). Aunque no es un punto de reciclaje específico en mi base de datos, ¡está en mi radar! Está en una zona que conozco (**Trujillo, Paiján o Chocope**). ¿Quieres que te muestre los puntos de reciclaje más cercanos a esa ubicación, o todos los puntos en esta área?`;
          const responseText = `Vaya, parece que estás buscando ${displayPrompt} (${formattedAddress}). Aunque no es un punto de reciclaje específico en mi base de datos, está en mi radar. Está en una zona que conozco (Trujillo, Paiján o Chocope). Quieres que te muestre los puntos de reciclaje más cercanos a esa ubicación, o todos los puntos en esta área?`;
          this.displayAIResponse(responseHtml, this.cleanTextForSpeech(responseText)); // Limpiar para el habla
        } else {
          const responseHtml = `😞 ¡Uy! La dirección ingresada **${displayPrompt}** está fuera de mi zona de confort de reciclaje por el momento. ¡Parece que estamos en el fin del mundo! Te puedo ayudar a encontrar puntos de reciclaje en **Trujillo, Paiján y Chocope**. ¿Qué te parece?`;
          const responseText = `Uy. La dirección ingresada ${displayPrompt} está fuera de mi zona de confort de reciclaje por el momento. Te puedo ayudar a encontrar puntos de reciclaje en Trujillo, Paiján y Chocope. Qué te parece?`;
          this.displayAIResponse(responseHtml, this.cleanTextForSpeech(responseText)); // Limpiar para el habla
        }
      } else {
        const responseHtml = '🤖 ¡Caracoles! Lo siento, no pude entender tu solicitud. ¡Mi cerebro de IA está en modo siesta! Por favor, intenta de nuevo con un comando diferente o más claro.';
        const responseText = 'Caracoles. Lo siento, no pude entender tu solicitud. Mi cerebro de IA está en modo siesta. Por favor, intenta de nuevo con un comando diferente o más claro.';
        this.displayAIResponse(responseHtml, this.cleanTextForSpeech(responseText)); // Limpiar para el habla
      }
    } catch (error) {
      console.error('Error durante la geocodificación:', error);
      const responseHtml = '🤖 ¡Ups! Hubo un problemilla al procesar tu ubicación. Parece que las señales no llegan bien. Por favor, intenta de nuevo con un comando diferente o más claro. ¡No te rindas!';
      const responseText = 'Ups. Hubo un problemilla al procesar tu ubicación. Parece que las señales no llegan bien. Por favor, intenta de nuevo con un comando diferente o más claro. No te rindas!';
      this.displayAIResponse(responseHtml, this.cleanTextForSpeech(responseText)); // Limpiar para el habla
    }
  }

  // NUEVO MÉTODO PARA VERIFICAR SI LA UBICACIÓN ESTÁ DENTRO DE UN ÁREA CONOCIDA
  private isLocationWithinKnownArea(lat: number, lng: number): boolean {
    const checkPoint = { lat, lng };
    const CITY_AREA_RADIUS_KM = 50; // Puedes ajustar este radio según necesites
    for (const city of this.KNOWN_CITIES) {
      const cityCoord = { lat: city.lat, lng: city.lng };
      if (this.dist(checkPoint, cityCoord) <= CITY_AREA_RADIUS_KM) {
        return true;
      }
    }
    return false;
  }

  clearAllRoutes(): void {
    this.activeDirectionsRenderers.forEach(renderer => {
      renderer.setMap(null);
    });
    this.activeDirectionsRenderers = [];
  }

  rutaMasCercana(addChatMessage: boolean = true): void {
    if (this.isWaitingForResponse && addChatMessage) return;

    if (!this.userLocation) {
      this.displayAIResponse('🔄 Esperando ubicación para poder ayudarte a encontrar la ruta más cercana...', 'Esperando ubicación para poder ayudarte a encontrar la ruta más cercana.');
      this.stopProcessing();
      return;
    }

    if (addChatMessage) {
      this.mensajesIA.push({ tipo: 'usuario', texto: 'Ubicame la ruta más cercana desde mi ubicación' });
      this.scrollAlFinal();
      this.isWaitingForResponse = true;
    }

    this.clearAllRoutes();
    this.resetMarkerIcons();

    const nearbyPoints = this.pointsOfInterest.filter(poi =>
      this.dist(this.userLocation!, poi) <= this.MAX_DISTANCE_KM
    );

    if (nearbyPoints.length === 0) {
      const response = `😞 No se encontraron puntos de reciclaje cercanos (dentro de ${this.MAX_DISTANCE_KM} km) a tu ubicación.`;
      this.displayAIResponse(response, response);
      return;
    }

    let destinoPOI = nearbyPoints[0];
    let minD = this.dist(this.userLocation, destinoPOI);

    nearbyPoints.forEach(poi => {
      const d = this.dist(this.userLocation!, poi);
      if (d < minD) { minD = d; destinoPOI = poi; }
    });

    this.trazarRuta(this.userLocation, destinoPOI.markerTitle, { lat: destinoPOI.lat, lng: destinoPOI.lng });
  }

  rutaEspecifica(destinationSimpleName: string, addChatMessage: boolean = true): void {
    if (this.isWaitingForResponse && addChatMessage) return;

    if (!this.userLocation) {
      this.displayAIResponse(`🔄 Esperando ubicación para poder trazar la ruta a ${destinationSimpleName}...`, `Esperando ubicación para poder trazar la ruta a ${destinationSimpleName}.`);
      this.stopProcessing();
      return;
    }

    if (addChatMessage) {
      this.mensajesIA.push({ tipo: 'usuario', texto: `Ruta a ${destinationSimpleName}` });
      this.scrollAlFinal();
      this.isWaitingForResponse = true;
    }

    this.clearAllRoutes();
    this.resetMarkerIcons();

    const targetPOI = this.pointsOfInterest.find(p => p.name === destinationSimpleName);

    if (targetPOI) {
      this.trazarRuta(this.userLocation, targetPOI.markerTitle, { lat: targetPOI.lat, lng: targetPOI.lng });
    } else {
      const response = `No se encontró información para ${destinationSimpleName}.`;
      this.displayAIResponse(response, response);
      this.stopProcessing();
    }
  }

  trazarTodasRutasCercanas(addChatMessage: boolean = true): void {
    if (this.isWaitingForResponse && addChatMessage) return;

    if (!this.userLocation) {
      this.displayAIResponse('🔄 Esperando ubicación para poder trazar las rutas a todos los puntos cercanos... ¡Mis satélites están en pausa para el café!', 'Esperando ubicación para poder trazar las rutas a todos los puntos cercanos. Mis satélites están en pausa para el café.');
      return;
    }

    if (addChatMessage) {
      this.mensajesIA.push({ tipo: 'usuario', texto: 'Trazar todos los puntos cercanos' });
      this.scrollAlFinal();
      this.isWaitingForResponse = true;
    }

    this.clearAllRoutes();
    this.resetMarkerIcons();

    let nearbyPoints = this.pointsOfInterest.filter(poi =>
      this.dist(this.userLocation!, poi) <= this.MAX_DISTANCE_KM
    );

    nearbyPoints.sort((a, b) => {
      const distA = this.dist(this.userLocation!, a);
      const distB = this.dist(this.userLocation!, b);
      return distA - distB;
    });

    const totalNearbyPoints = nearbyPoints.length;
    let aiResponseText: string;

    if (totalNearbyPoints === 0) {
      aiResponseText = `😞 No se encontraron puntos de reciclaje cercanos (dentro de ${this.MAX_DISTANCE_KM} km) a tu ubicación. ¡Parece que los puntos se fueron de paseo!`;
      this.displayAIResponse(aiResponseText, this.cleanTextForSpeech(aiResponseText)); // Limpiar para el habla
      return;
    }

    let routesProcessedCount = 0; // Contará cada intento de ruta (conducción + caminar)
    const successfullyRoutedPointsMap = new Map<string, { name: string, label: string, distance: string, drivingDuration: string, walkingDuration: string }>();

    // Usaremos un contador para saber cuándo hemos procesado TODAS las rutas (conducción y caminar)
    const totalExpectedRoutes = nearbyPoints.length * 2; // Ahora esperamos el doble de rutas

    nearbyPoints.forEach((poi, index) => {
      const label = String.fromCharCode(65 + index);
      const marker = this.placedMarkers.get(poi.markerTitle);

      if (marker) {
        marker.setLabel({
          text: label,
          color: "white",
          fontSize: "14px",
          fontWeight: "bold",
        });

        marker.setIcon({
          url: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
          scaledSize: new google.maps.Size(40, 40)
        });
        if (this.currentMarkerInfoWindow && this.currentMarkerInfoWindow.getMap() === this.map && this.currentMarkerInfoWindow.getPosition().equals(marker.getPosition())) {
          this.currentMarkerInfoWindow.close();
        }
      }

      // Renderizador para la ruta en auto
      const drivingRouteRenderer = new google.maps.DirectionsRenderer({
        map: this.map,
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: '#FF0000', // Azul para rutas en auto, si quieres que coincida con el mensaje de la IA
          strokeOpacity: 0.6,
          strokeWeight: 4
        }
      });
      this.activeDirectionsRenderers.push(drivingRouteRenderer);

      // Renderizador para la ruta a pie
      const walkingRouteRenderer = new google.maps.DirectionsRenderer({
        map: this.map,
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: '#0000FF', // Azul para rutas a pie
          strokeOpacity: 0.6,
          strokeWeight: 4
        }
      });
      this.activeDirectionsRenderers.push(walkingRouteRenderer);

      let drivingDuration = 'N/A';
      let walkingDuration = 'N/A';
      let distance = 'N/A';

      // Petición para la ruta en AUTO
      this.directionsService.route(
        {
          origin: this.userLocation,
          destination: { lat: poi.lat, lng: poi.lng },
          travelMode: google.maps.TravelMode.DRIVING,
          // Aquí se agrega trafficModel: 'bestguess'
          drivingOptions: {
            departureTime: new Date(), // Es necesario para usar trafficModel
            trafficModel: 'bestguess'
          }
        },
        (response: any, status: any) => {
          routesProcessedCount++;
          if (status === 'OK') {
            drivingRouteRenderer.setDirections(response);
            drivingDuration = response.routes[0].legs[0].duration.text;
            distance = response.routes[0].legs[0].distance.text;
            successfullyRoutedPointsMap.set(poi.markerTitle, {
              name: poi.name,
              label: label,
              distance: distance,
              drivingDuration: drivingDuration,
              walkingDuration: successfullyRoutedPointsMap.get(poi.markerTitle)?.walkingDuration || 'N/A' // Mantener la duración a pie si ya se calculó
            });
          } else {
            console.warn(`No se pudo trazar la ruta en auto a ${poi.name}: ${status}`);
            successfullyRoutedPointsMap.set(poi.markerTitle, {
              name: poi.name,
              label: label,
              distance: distance,
              drivingDuration: 'No disponible',
              walkingDuration: successfullyRoutedPointsMap.get(poi.markerTitle)?.walkingDuration || 'N/A'
            });
          }
          if (routesProcessedCount === totalExpectedRoutes) {
            this.generateAllRoutesSummary(Array.from(successfullyRoutedPointsMap.values()));
          }
        }
      );

      // Petición para la ruta a PIE
      this.directionsService.route(
        {
          origin: this.userLocation,
          destination: { lat: poi.lat, lng: poi.lng },
          travelMode: google.maps.TravelMode.WALKING,
        },
        (response: any, status: any) => {
          routesProcessedCount++;
          if (status === 'OK') {
            walkingRouteRenderer.setDirections(response);
            walkingDuration = response.routes[0].legs[0].duration.text;
            distance = response.routes[0].legs[0].distance.text;
            successfullyRoutedPointsMap.set(poi.markerTitle, {
              name: poi.name,
              label: label,
              distance: distance,
              drivingDuration: successfullyRoutedPointsMap.get(poi.markerTitle)?.drivingDuration || 'N/A', // Mantener la duración en auto si ya se calculó
              walkingDuration: walkingDuration
            });
          } else {
            console.warn(`No se pudo trazar la ruta a pie a ${poi.name}: ${status}`);
            successfullyRoutedPointsMap.set(poi.markerTitle, {
              name: poi.name,
              label: label,
              distance: distance,
              drivingDuration: successfullyRoutedPointsMap.get(poi.markerTitle)?.drivingDuration || 'N/A',
              walkingDuration: 'No disponible'
            });
          }
          if (routesProcessedCount === totalExpectedRoutes) {
            this.generateAllRoutesSummary(Array.from(successfullyRoutedPointsMap.values()));
          }
        }
      );
    });
  }

  private generateAllRoutesSummary(routedPoints: { name: string, label: string, distance: string, drivingDuration: string, walkingDuration: string }[]): void {
    if (routedPoints.length === 0) {
      const response = `😞 No pude calcular rutas a ningún punto de reciclaje cercano. ¡Parece que mis rutas están de vacaciones!`;
      this.displayAIResponse(response, this.cleanTextForSpeech(response)); // Limpiar para el habla
      return;
    }

    let summaryHtml = `¡Listo! Aquí tienes los puntos de reciclaje cercanos a tu ubicación (${this.userAddress ? `**${this.userAddress}**` : 'ubicación actual'}):<br><br>`;
    let summaryText = `Listo. Aquí tienes los puntos de reciclaje cercanos a tu ubicación (${this.userAddress ? `${this.userAddress}` : 'ubicación actual'}):\n\n`;

    routedPoints.sort((a, b) => {
      // Intentar ordenar por distancia numérica si es posible
      const distA = parseFloat(a.distance);
      const distB = parseFloat(b.distance);
      if (!isNaN(distA) && !isNaN(distB)) {
        return distA - distB;
      }
      return a.distance.localeCompare(b.distance);
    });

    routedPoints.forEach(point => {
      summaryHtml += `**${point.label}. ${point.name}**<br>`;
      summaryHtml += `&nbsp;&nbsp;&nbsp;&nbsp;Distancia: **${point.distance}**<br>`;
      summaryHtml += `&nbsp;&nbsp;&nbsp;&nbsp;Tiempo en auto: **${point.drivingDuration}**<br>`;
      summaryHtml += `&nbsp;&nbsp;&nbsp;&nbsp;Tiempo a pie: **${point.walkingDuration}**<br><br>`;

      summaryText += `${point.label}. ${point.name}\n`;
      summaryText += `    Distancia: ${point.distance}\n`;
      summaryText += `    Tiempo en auto: ${point.drivingDuration}\n`;
      summaryText += `    Tiempo a pie: ${point.walkingDuration}\n\n`;
    });

    summaryHtml += `Recuerda que la ruta en **azul** es para **caminar** 🚶 y la ruta **roja** es para **conducir** 🚗. ¡A reciclar se ha dicho!`;
    summaryText += `Recuerda que la ruta en azul es para caminar y la ruta roja es para conducir. A reciclar se ha dicho!`;

    this.displayAIResponse(summaryHtml, this.cleanTextForSpeech(summaryText)); // Limpiar para el habla
  }

  private resetMarkerIcons(): void {
    this.placedMarkers.forEach((marker: google.maps.Marker, key: string) => {
      marker.setIcon({
        //url: 'https://i.imgur.com/MnD1b69.png',
        url: 'assets/images/plastico_icon.png',
        scaledSize: new google.maps.Size(40, 40)
      });
    });
  }

  trazarRuta(origen: any, targetMarkerTitle: string, destinoCoords: any): void {
    this.stopAllProcessing(); // Detiene cualquier voz o escritura anterior y resetea el estado
    this.isWaitingForResponse = true; // Asegurarse de que el botón cambie a "Detener"

    this.resetMarkerIcons();
    this.clearAllRoutes();

    const currentRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: true });
    currentRenderer.setMap(this.map);
    this.activeDirectionsRenderers.push(currentRenderer);

    this.directionsService.route({
      origin: origen,
      destination: destinoCoords,
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: 'bestguess'
      }
    }, (res: any, status: any) => {
      if (status !== google.maps.DirectionsStatus.OK) {
        const errorText = `❌ No se pudo trazar la ruta: ${status}`;
        this.displayAIResponse(errorText, errorText);
        currentRenderer.setMap(null);
        this.activeDirectionsRenderers = this.activeDirectionsRenderers.filter(r => r !== currentRenderer);
        // stopProcessing ya será llamado por displayAIResponse a través de speak()
        return;
      }

      currentRenderer.setDirections(res);

      this.placedMarkers.forEach((marker: any, key: string) => {
        if (key === targetMarkerTitle) {
          marker.setIcon({
            url: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
            scaledSize: new google.maps.Size(40, 40)
          });
        }
      });

      const leg = res.routes[0].legs[0];
      const distancia = leg.distance.text;
      const duracionCaminando = leg.duration.text;
      const duracionTaxi = Math.round(leg.duration.value / 60);

      const cleanTargetTitle = targetMarkerTitle.replace('Punto de reciclaje: ', '');
      const currentAddress = this.userAddress || 'tu ubicación actual';

      const aiMessageHTML = `🧭 Ruta hacia <b>${cleanTargetTitle}</b>. Distancia: ${distancia}.<br>🧍 Caminando toma ${duracionCaminando.replace(/\bmin\b/, 'minutos')}.<br>🚕 En automóvil aproximadamente ${duracionTaxi} minutos.<br>♻️Punto estratégico para reciclar y cuidar nuestro planeta.🌎`;
      const aiMessageSpeech = `Ruta hacia ${cleanTargetTitle}. Distancia: ${distancia}. Caminando toma ${duracionCaminando.replace(/\bmin\b/, 'minutos')}. En automóvil aproximadamente ${duracionTaxi} minutos. Punto estratégico para reciclar y cuidar nuestro planeta.`;
      
      this.displayAIResponse(aiMessageHTML, aiMessageSpeech); // Pasar ambos textos, displayAIResponse llamará a speak()
    });
  }

  addMarkers(): void {
    this.pointsOfInterest.forEach((poi: PointOfInterest, i: number) => {
      const marker = new google.maps.Marker({
        position: { lat: poi.lat, lng: poi.lng },
        map: this.map,
        title: poi.markerTitle,
        icon: {
          //url: 'https://i.imgur.com/MnD1b69.png',
          url: 'assets/images/plastico_icon.png',
          scaledSize: new google.maps.Size(40, 40)
        }
      });

      this.placedMarkers.set(poi.markerTitle, marker);

      const infowindow = new google.maps.InfoWindow({
        content: `<b>${poi.markerTitle}</b><br><button id="ruta-btn-${i}">Trazar ruta</button>`
      });

      let buttonClickListener: (() => void) | null = null;

      marker.addListener('click', () => {
        if (this.currentMarkerInfoWindow) this.currentMarkerInfoWindow.close();
        infowindow.open(this.map, marker);
        this.currentMarkerInfoWindow = infowindow;

        google.maps.event.addListenerOnce(infowindow, 'domready', () => {
          const btn = document.getElementById(`ruta-btn-${i}`);
          if (btn) {
            if (buttonClickListener) {
              btn.removeEventListener('click', buttonClickListener);
            }

            buttonClickListener = () => {
              if (this.isWaitingForResponse) {
                  this.displayAIResponse('Ya estoy procesando una solicitud. Por favor, espera o presiona "Detener".', 'Ya estoy procesando una solicitud. Por favor, espera o presiona detener.');
                  return;
              }

              if (!this.userLocation) {
                this.displayAIResponse('🔄 Ubicación del usuario no disponible. Esperando...', 'Ubicación del usuario no disponible. Esperando.');
                return;
              }

              this.mensajesIA.push({ tipo: 'usuario', texto: `Trazar ruta a ${poi.markerTitle.replace('Punto de reciclaje: ', '')}.` });
              this.scrollAlFinal();

              const initialMessageHtml = `📍 Trazando ruta hacia ${poi.markerTitle.replace('Punto de reciclaje: ', '')}...`;
              const initialMessageSpeech = `Trazando ruta hacia ${poi.markerTitle.replace('Punto de reciclaje: ', '')}.`;

              this.displayAIResponse(initialMessageHtml, initialMessageSpeech);

              this.trazarRuta(this.userLocation, poi.markerTitle, marker.getPosition());
              infowindow.close();
            };

            btn.addEventListener('click', buttonClickListener);
          }
        });

        google.maps.event.addListenerOnce(infowindow, 'closeclick', () => {
          const btn = document.getElementById(`ruta-btn-${i}`);
          if (btn && buttonClickListener) {
            btn.removeEventListener('click', buttonClickListener);
            buttonClickListener = null;
          }
        });
      });
    });
  }

  dist(p1: any, p2: any): number {
    const R = 6371;
    const dLat = this.rad(p2.lat - p1.lat);
    const dLon = this.rad(p2.lng - p1.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.rad(p1.lat)) * Math.cos(this.rad(p2.lat)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  rad(v: number): number {
    return v * Math.PI / 180;
  }

  findClosestPoint(): PointOfInterest | null {
    if (!this.userLocation) {
      return null;
    }

    const nearbyPoints = this.pointsOfInterest.filter(poi =>
      this.dist(this.userLocation!, poi) <= this.MAX_DISTANCE_KM
    );

    if (nearbyPoints.length === 0) {
      return null;
    }

    let closestPoint: PointOfInterest | null = null;
    let minDistance = Infinity;

    for (const poi of nearbyPoints) {
      const distance = this.dist(this.userLocation, poi);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = poi;
      }
    }
    return closestPoint;
  }
}
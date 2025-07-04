import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as levenshtein from 'fast-levenshtein';
import { AuthService } from '../servicios/auth.service'; // ✅ Asegúrate de tener esta importación

declare var google: any;

// Interfaz para definir la estructura de un punto de interés
interface PointOfInterest {
  lat: number;
  lng: number;
  name: string;
  markerTitle: string;
}

interface Message {
  tipo: 'usuario' | 'ia';
  texto: string;
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
    { lat: -7.822, lng: -79.236, name: 'Calle Bolívar', markerTitle: 'Punto de reciclaje: Calle Bolívar' }
  ];

  private placedMarkers: Map<string, google.maps.Marker> = new Map();

  constructor(@Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService // ✅ Esto habilita el acceso a usuario$
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

  displayAIResponse(responseText: string, speakText?: string): void {
    this.mensajesIA.push({ tipo: 'ia', texto: '', fullText: responseText });
    const messageIndex = this.mensajesIA.length - 1;
    this.typeWriterEffect(responseText, messageIndex, speakText); // Pasar el texto para hablar al typeWriterEffect
    this.scrollAlFinal();
  }

  typeWriterEffect(text: string, messageIndex: number, speakText?: string, charIndex: number = 0): void {
    this.isTyping = true; // La IA está escribiendo
    this.isWaitingForResponse = true; // Asegurarse de que el botón cambie a "Detener"

    if (charIndex < text.length) {
      this.mensajesIA[messageIndex].texto += text.charAt(charIndex);
      charIndex++;
      this.typingTimeout = setTimeout(() => {
        this.typeWriterEffect(text, messageIndex, speakText, charIndex);
      }, 15);
    } else {
      // Efecto de escritura terminado
      this.isTyping = false; // La IA ha terminado de escribir
      // Si hay texto para hablar, lo reproduce. speak() gestionará el stopProcessing cuando termine la voz.
      if (speakText) {
        this.speak(speakText);
      } else {
        // Si no hay voz, entonces el procesamiento termina aquí
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

    return null;
  }

  private cleanText(text: string): string {
    return text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .replace(/\s+/g, " ").trim();
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
    // Asegurarse de completar el texto si se detiene a mitad
    const lastMessage = this.mensajesIA[this.mensajesIA.length - 1];
    if (lastMessage && lastMessage.tipo === 'ia' && lastMessage.fullText && lastMessage.texto !== lastMessage.fullText) {
      lastMessage.texto = lastMessage.fullText;
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

     // ✅ Ahora sí puedes usarlo:
    if (this.esSaludoNatural(currentPrompt)) {
      // 🔹 Mostrar mensaje del usuario en la conversación
      this.mensajesIA.push({ tipo: 'usuario', texto: currentPrompt });
      this.userPrompt = ''; // 🔹 Limpiar el input
      this.scrollAlFinal();

      const nombre = this.authService?.usuario$.value?.nombre || 'amigo';
      const saludo = `Hola ${nombre}! Soy tu inteligencia artificial orientada a encontrar la ruta más rápida en los puntos estratégicos de reciclaje.`;
      this.displayAIResponse(saludo, saludo);
      return;
    }


    this.mensajesIA.push({ tipo: 'usuario', texto: currentPrompt });
    this.userPrompt = '';
    this.scrollAlFinal();

    // Establecer isWaitingForResponse a true aquí, antes de cualquier lógica asíncrona
    this.isWaitingForResponse = true;

    const cleanedUserPrompt = this.cleanText(currentPrompt);

    const recognizedLocation = this.isSpecificLocationRequest(cleanedUserPrompt);
    if (recognizedLocation) {
      this.displayAIResponse(`De acuerdo, buscando la ruta hacia ${recognizedLocation}...`, `De acuerdo, buscando la ruta hacia ${recognizedLocation}.`);
      this.rutaEspecifica(recognizedLocation, false);
    } else if (this.isSimilar(cleanedUserPrompt, this.KEY_PHRASES.allPointsNearby)) {
      this.displayAIResponse('¡Entendido! Buscando los puntos de reciclaje más cercanos y trazando rutas...', 'Entendido. Buscando los puntos de reciclaje más cercanos y trazando rutas.');
      this.trazarTodasRutasCercanas(false);
    } else if (this.isSimilar(cleanedUserPrompt, this.KEY_PHRASES.closestPoint)) {
      this.displayAIResponse('Claro, buscando el punto de reciclaje más cercano y trazando la ruta...', 'Claro, buscando el punto de reciclaje más cercano y trazando la ruta.');
      this.rutaMasCercana(false);
    } else {
      const responseHtml = '🤖 Lo siento, no pude entender tu solicitud. Por favor, intenta de nuevo con un comando diferente o más claro.';
      const responseText = 'Lo siento, no pude entender tu solicitud. Por favor, intenta de nuevo con un comando diferente o más claro.';
      this.displayAIResponse(responseHtml, responseText);
      // El typeWriterEffect o speak se encargará de llamar a stopProcessing cuando termine.
    }
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
      this.displayAIResponse('🔄 Esperando ubicación para poder trazar las rutas a todos los puntos cercanos...', 'Esperando ubicación para poder trazar las rutas a todos los puntos cercanos.');
      this.stopProcessing();
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
      aiResponseText = `😞 No se encontraron puntos de reciclaje cercanos (dentro de ${this.MAX_DISTANCE_KM} km) a tu ubicación.`;
      this.displayAIResponse(aiResponseText, aiResponseText);
      return;
    }

    let routesProcessedCount = 0;
    const successfullyRoutedPointsMap = new Map<string, { name: string, label: string, distance: string, duration: string }>();

    nearbyPoints.forEach((poi, index) => {
      const label = String.fromCharCode(65 + index);
      const marker = this.placedMarkers.get(poi.markerTitle);

      if (marker) {
        // MODIFICAR AQUÍ: Quitar la línea `marker.setIcon(...)` y usar `marker.setLabel(...)`
        marker.setLabel({
          text: label,
          color: "white", // Color del texto de la etiqueta
          fontSize: "14px", // Tamaño de fuente
          fontWeight: "bold", // Grosor de la fuente
        });

        marker.setIcon({
          url: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png', // Un ícono rojo predeterminado, por ejemplo
          scaledSize: new google.maps.Size(40, 40)
        });
        if (this.currentMarkerInfoWindow && this.currentMarkerInfoWindow.getMap() === this.map && this.currentMarkerInfoWindow.getPosition().equals(marker.getPosition())) {
          this.currentMarkerInfoWindow.close();
        }
      }

      const singleRouteRenderer = new google.maps.DirectionsRenderer({
        map: this.map,
        suppressMarkers: true,
        preserveViewport: true
      });
      this.activeDirectionsRenderers.push(singleRouteRenderer);

      this.directionsService.route(
        {
          origin: this.userLocation,
          destination: { lat: poi.lat, lng: poi.lng },
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: 'bestguess',
          },
        },
        (res: any, status: any) => {
          routesProcessedCount++;

          if (status === google.maps.DirectionsStatus.OK) {
            const leg = res.routes[0].legs[0];
            const distance = leg.distance.text;
            const duration = leg.duration.text;
            successfullyRoutedPointsMap.set(label, { name: poi.name, label: label, distance: distance, duration: duration });
            singleRouteRenderer.setDirections(res);

          } else {
            console.warn(`No se pudo trazar ruta a ${poi.name}: ${status}`);
            singleRouteRenderer.setMap(null);
            this.activeDirectionsRenderers = this.activeDirectionsRenderers.filter(r => r !== singleRouteRenderer);
            if (marker) {
              marker.setIcon({
                //url: 'https://i.imgur.com/MnD1b69.png',
                url: 'assets/images/plastico_icon.png',
                scaledSize: new google.maps.Size(40, 40),
              });
            }
          }

          if (routesProcessedCount === totalNearbyPoints) {
            const actualRoutesDrawn = this.activeDirectionsRenderers.length;
            if (actualRoutesDrawn > 0) {
              aiResponseText = `Se han trazado rutas a ${actualRoutesDrawn} de los ${totalNearbyPoints} puntos de reciclaje cercanos encontrados. Rutas trazadas a: `;
              let aiResponseHTML = `✅ Se han trazado rutas a ${actualRoutesDrawn} de los ${totalNearbyPoints} puntos de reciclaje cercanos encontrados.<br>Rutas trazadas a: <ul>`;

              const sortedSuccessfullyRoutedPoints = Array.from(successfullyRoutedPointsMap.values()).sort((a, b) => a.label.localeCompare(b.label));

              sortedSuccessfullyRoutedPoints.forEach(item => {
                aiResponseText += `${item.label}) ${item.name}. ${item.distance}, aproximadamente ${item.duration}. `;
                aiResponseHTML += `<li><b>${item.label})</b> ${item.name} ♻️ (${item.distance}, aprox. ${item.duration})🧍</li>`;
              });
              aiResponseHTML += `</ul>`;

              this.displayAIResponse(aiResponseHTML, aiResponseText);
            } else {
              aiResponseText = `😞 No se pudo trazar ninguna ruta a los puntos cercanos, a pesar de que se encontraron ${totalNearbyPoints} puntos.`;
              this.displayAIResponse(aiResponseText, aiResponseText);
            }
          }
        }
      );
    });
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
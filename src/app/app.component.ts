import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router'; // <-- ¡Importa Router aquí!
import { FormsModule } from '@angular/forms';
import { AuthService } from './servicios/auth.service';
import { HttpClientModule } from '@angular/common/http';
import { NavigationStart } from '@angular/router';
import { filter } from 'rxjs';

interface Usuario { // Define la interfaz de tu objeto de usuario si no la tienes
  nombre: string;
  correo: string;
  // Agrega otras propiedades de tu usuario si existen
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'EcoRecicla';
  isLoggedIn: boolean = false; // Propiedad para controlar el estado de login
  menuVisible = false;

  sidebarOpen = false;
  modalAbierto = false;
  modo: 'login' | 'registro' = 'login';
  mensajeError: string = '';


  // Login
  loginEmail = '';
  loginPassword = '';
  mostrarModalLogin: boolean = false; // Si usas un modal para el login

  // Registro
  registroNombre = '';
  registroCorreo = '';
  registroClave = '';
  registroUbicacion = '';
  registroExitoso = false;

  usuarioLogueado: any = null;

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router // <-- ¡Inyecta Router aquí!
  ) {}



  toggleMenu() {
    this.menuVisible = !this.menuVisible;
  }

  menuVisibleSidebar = false;

  toggleSidebarMenu() {
    this.menuVisibleSidebar = !this.menuVisibleSidebar;
  }

  ngOnInit() {
  if (isPlatformBrowser(this.platformId)) {
    const usuarioGuardado = sessionStorage.getItem('usuario'); // ✅ Solo en navegador
    if (usuarioGuardado) {
      this.usuarioLogueado = JSON.parse(usuarioGuardado);
      this.isLoggedIn = true;
    }

    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(event => {
        const nav = event as NavigationStart;
        const rutasProtegidas = ['/mapa', '/juego'];
        const user = sessionStorage.getItem('usuario');

        if (!user && rutasProtegidas.some(ruta => nav.url.includes(ruta))) {
          this.router.navigate(['/'], { replaceUrl: true });
        }
      });
  }
}

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  abrirModal() {
    this.modalAbierto = true;
    this.modo = 'login';
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.loginEmail = '';
    this.loginPassword = '';
    this.registroNombre = '';
    this.registroCorreo = '';
    this.registroClave = '';
    this.registroUbicacion = '';
    this.registroExitoso = false; // Asegúrate de restablecer el estado de registro exitoso
    this.mensajeError = '';

  }

  login() {
  const credenciales = {
    correo: this.loginEmail,
    contrasena: this.loginPassword
  };

  this.authService.loginUsuario(credenciales).subscribe({
    next: (res: any) => {
      this.usuarioLogueado = res.usuario;

      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.setItem('usuario', JSON.stringify(res.usuario));
        sessionStorage.setItem('token', res.token);
      }

      // ✅ Notifica a todos los componentes
      this.authService.actualizarUsuario(res.usuario);

      this.isLoggedIn = true;
      this.cerrarModal();
      this.mensajeError = '';

    },
    error: (err) => {
      console.error('❌ Error en login:', err);
      //alert(err?.error?.mensaje || '❌ Error al iniciar sesión');
      this.mensajeError = err?.error?.mensaje || '❌ Error al iniciar sesión';
      this.isLoggedIn = false;
    }
  });
}


  cerrarSesion() {
  this.usuarioLogueado = null;

  // ✅ Notifica a todos los componentes y borra sesión
  this.authService.limpiarUsuario();

  this.isLoggedIn = false;
  this.loginEmail = '';
  this.loginPassword = '';

  this.menuVisible = false;
  this.sidebarOpen = false;
  this.menuVisibleSidebar = false;

  this.router.navigate(['/'], { replaceUrl: true });
}


  cambiarContrasena() {
    // Aquí puedes redirigir o abrir un modal
    console.log('Cambiar contraseña');
    this.menuVisible = false;
    this.toggleSidebarMenu(); // Cierra el menú del sidebar
  }

  irAPerfil() {
    this.router.navigate(['/perfil']); // <-- Asegúrate que esta ruta esté definida
  }

  registrar() {
    const fechaRegistro = new Date().toLocaleString('sv-SE').replace('T', ' ');

    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // ¡ADVERTENCIA: La clave API de Google Maps está expuesta en el cliente!
      // En un entorno de producción, DEBES proteger esta clave o usar un proxy.
      const apiKey = 'AIzaSyCLGmLQC1KninQE0_PrfE1EdeGb9M7targ'; 
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'OK' && data.results.length > 0) {
            this.registroUbicacion = data.results[0].formatted_address;
          } else {
            this.registroUbicacion = `Lat: ${lat}, Lng: ${lng}`;
          }

          const nuevoUsuario = {
            nombre: this.registroNombre,
            correo: this.registroCorreo,
            contrasena: this.registroClave,
            ubicacion_actual: this.registroUbicacion,
            fecha_registro: fechaRegistro
          };

          this.authService.registrarUsuario(nuevoUsuario).subscribe({
            next: (res) => {
              this.registroExitoso = true;
              this.mensajeError = '';
              setTimeout(() => {
                this.registroExitoso = false;
                this.cerrarModal();
                this.modo = 'login'; // Vuelve al modo login después de un registro exitoso
              }, 3000);
            },
            error: (err) => {
              console.error('❌ Error al registrar:', err);
              // Usar un modal o un mensaje dentro de la UI en lugar de alert()
              //alert(err?.error?.mensaje || '❌ Error al registrar');
              this.mensajeError = err?.error?.mensaje || '❌ Error al registrar';
            }
          });
        })
        .catch(err => {
          console.error('Error al obtener dirección:', err);
          // Usar un modal o un mensaje dentro de la UI en lugar de alert()
          //alert('❌ No se pudo obtener la dirección');
          this.mensajeError = '❌ No se pudo obtener la dirección';
        });
    }, error => {
      // Usar un modal o un mensaje dentro de la UI en lugar de alert()
      //alert('⚠️ Necesitamos tu ubicación para continuar.');
      this.mensajeError = '⚠️ Necesitamos tu ubicación para continuar.';
    });
  }

  cambiarAModoRegistro() {
  this.modo = 'registro';
  this.mensajeError = '';
  }

  cambiarAModoLogin() {
    this.modo = 'login';
    this.mensajeError = '';
  }

}

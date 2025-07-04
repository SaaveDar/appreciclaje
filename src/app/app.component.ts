import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationStart } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './servicios/auth.service';
import { HttpClientModule } from '@angular/common/http';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'EcoRecicla';
  isLoggedIn: boolean = false;
  menuVisible = false;
  sidebarOpen = false;
  modalAbierto = false;
  modo: 'login' | 'registro' = 'login';
  mensajeError: string = '';

  loginEmail = '';
  loginPassword = '';
  mostrarModalLogin: boolean = false;

  registroNombre = '';
  registroCorreo = '';
  registroClave = '';
  registroUbicacion = '';
  registroExitoso = false;

  usuarioLogueado: any = null;
  menuVisibleSidebar = false;

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return; // ✅ Evitar error durante prerendering
    }

    const usuarioGuardado = sessionStorage.getItem('usuario');
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

  toggleMenu() {
    this.menuVisible = !this.menuVisible;
  }

  toggleSidebarMenu() {
    this.menuVisibleSidebar = !this.menuVisibleSidebar;
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
    this.registroExitoso = false;
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

        this.authService.actualizarUsuario(res.usuario);

        this.isLoggedIn = true;
        this.cerrarModal();
        this.mensajeError = '';
      },
      error: (err) => {
        console.error('❌ Error en login:', err);
        this.mensajeError = err?.error?.mensaje || '❌ Error al iniciar sesión';
        this.isLoggedIn = false;
      }
    });
  }

  cerrarSesion() {
    this.usuarioLogueado = null;
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
    console.log('Cambiar contraseña');
    this.menuVisible = false;
    this.toggleSidebarMenu();
  }

  irAPerfil() {
    this.router.navigate(['/perfil']);
  }

  registrar() {
    const fechaRegistro = new Date().toLocaleString('sv-SE').replace('T', ' ');

    if (!isPlatformBrowser(this.platformId)) {
      this.mensajeError = '⚠️ Esta función solo está disponible en navegador.';
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
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
            next: () => {
              this.registroExitoso = true;
              this.mensajeError = '';
              setTimeout(() => {
                this.registroExitoso = false;
                this.cerrarModal();
                this.modo = 'login';
              }, 3000);
            },
            error: (err) => {
              console.error('❌ Error al registrar:', err);
              this.mensajeError = err?.error?.mensaje || '❌ Error al registrar';
            }
          });
        })
        .catch(err => {
          console.error('Error al obtener dirección:', err);
          this.mensajeError = '❌ No se pudo obtener la dirección';
        });
    }, error => {
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

import { Component, Inject, PLATFORM_ID, OnInit, NgZone } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationStart } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './servicios/auth.service';
import { HttpClientModule } from '@angular/common/http';
import { filter } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

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

  mostrarBienvenida: boolean = false;
  loginEmail = '';
  loginPassword = '';
  mostrarModalLogin: boolean = false;

  estadoConexion: string = 'online';
  mostrarEstadoConexion: boolean = false;

  registroNombre = '';
  registroCorreo = '';
  registroClave = '';
  registroUbicacion = '';
  registroExitoso = false;

  usuarioLogueado: any = null;
  menuVisibleSidebar = false;

  registroTipoDoc: string = 'DNI';
  registroDocumento: string = '';
  registroApellidos: string = '';
  registroFechaNacimiento: string = '';
  mensajeErrorDocumento: string = '';
  documentoInvalido: boolean = false;
  errorEdad: string = '';

  // Modal cambiar contraseña
  mostrarModalCambiarClave: boolean = false;
  nuevaContrasena: string = '';
  confirmarContrasena: string = '';
  mensajeErrorClave: string = '';

  API_URL: string = '';

  // Variables para el modal de recuperación de contraseña
  mostrarModalRecuperacion: boolean = false;
  correoRecuperacion: string = '';
  mensajeErrorRecuperacion: string = '';

  
  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cd: ChangeDetectorRef,
    private zone: NgZone,
    private router: Router
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.API_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api'
        : 'https://comunidadvmapps.com/api.php';

      this.actualizarEstadoConexion(navigator.onLine);

      window.addEventListener('online', () => {
        this.zone.run(() => {
          this.actualizarEstadoConexion(true);
          this.cd.detectChanges();
        });
      });

      window.addEventListener('offline', () => {
        this.zone.run(() => {
          this.actualizarEstadoConexion(false);
          this.cd.detectChanges();
        });
      });

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
  }

  actualizarEstadoConexion(conectado: boolean) {
    this.estadoConexion = conectado ? 'online' : 'offline';
    this.mostrarEstadoConexion = true;

    if (conectado) {
      setTimeout(() => {
        this.mostrarEstadoConexion = false;
      }, 3000);
    }
  }

  mostrarNotificacion(estado: string) {
    this.estadoConexion = estado;
    this.mostrarEstadoConexion = true;
    this.cd.detectChanges();

    setTimeout(() => {
      this.mostrarEstadoConexion = false;
      this.cd.detectChanges();
    }, 4000);
  }

  soloNumeros(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  validarDocumento() {
    if (this.registroTipoDoc === 'DNI') {
      this.documentoInvalido = this.registroDocumento.length !== 8;
      this.mensajeErrorDocumento = 'El DNI debe tener exactamente 8 dígitos.';
    } else if (this.registroTipoDoc === 'CE') {
      this.documentoInvalido = this.registroDocumento.length < 9 || this.registroDocumento.length > 12;
      this.mensajeErrorDocumento = 'El CE debe tener entre 9 y 12 dígitos.';
    }
  }

  validarEdad() {
    if (!this.registroFechaNacimiento) {
      this.errorEdad = '';
      return;
    }

    const fechaNac = new Date(this.registroFechaNacimiento);
    const hoy = new Date();

    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mesDiferencia = hoy.getMonth() - fechaNac.getMonth();
    const diaDiferencia = hoy.getDate() - fechaNac.getDate();

    if (mesDiferencia < 0 || (mesDiferencia === 0 && diaDiferencia < 0)) {
      edad--;
    }

    if (edad < 10) {
      this.errorEdad = 'Debes tener más de 10 años';
    } else {
      this.errorEdad = '';
    }
  }

  limpiarDocumento() {
    this.registroDocumento = '';
    this.validarDocumento();
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
          sessionStorage.setItem('usuario_id', String(res.usuario.id));
          sessionStorage.setItem('usuario_nombre', res.usuario.nombre);
          sessionStorage.setItem('token', res.token);
          sessionStorage.setItem('usuario', JSON.stringify(res.usuario));
        }

        this.authService.actualizarUsuario(res.usuario);

        this.isLoggedIn = true;
        this.cerrarModal();
        this.mensajeError = '';

        this.mostrarBienvenida = true;
        setTimeout(() => {
          this.mostrarBienvenida = false;
        }, 3000);
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
    this.menuVisible = false;
    this.sidebarOpen = false;
    this.menuVisibleSidebar = false;
    this.router.navigate(['/'], { replaceUrl: true });
  }

  cambiarContrasena() {
    this.mostrarModalCambiarClave = true;
    this.menuVisible = false;
    this.menuVisibleSidebar = false;
    this.nuevaContrasena = '';
    this.confirmarContrasena = '';
    this.mensajeErrorClave = '';
  }

  cerrarModalCambiarClave() {
    this.mostrarModalCambiarClave = false;
    this.nuevaContrasena = '';
    this.confirmarContrasena = '';
    this.mensajeErrorClave = '';
  }

  guardarNuevaContrasena() {
    if (this.nuevaContrasena.trim() === '' || this.confirmarContrasena.trim() === '') {
      this.mensajeErrorClave = 'Debes completar ambos campos.';
      return;
    }

    if (this.nuevaContrasena !== this.confirmarContrasena) {
      this.mensajeErrorClave = 'Las contraseñas no coinciden.';
      return;
    }

    const data = {
      id_usuario: Number(sessionStorage.getItem('usuario_id')),
      nueva_contrasena: this.nuevaContrasena
    };

    this.authService.cambiarContrasena(data).subscribe({
   next: (res) => {
      console.log(res.mensaje);
      this.mensajeErrorClave = '✅ Contraseña actualizada correctamente.';
      setTimeout(() => {
        this.cerrarModalCambiarClave();
      }, 1500); // espera 1.5 segundos antes de cerrar
    },

      error: (err) => {
        console.error('❌ Error al actualizar contraseña:', err);
        this.mensajeErrorClave = 'Ocurrió un error al actualizar la contraseña.';
      }
    });
  }

  irAPerfil() {
    this.router.navigate(['/perfil']);
  }

  irACursos() {
  // Si estás usando routerLink:
  this.router.navigate(['/cursos']);

  // O si es ruta absoluta:
  // window.location.href = '/cursos';

  // O si es componente específico (lazy-load):
  // this.router.navigateByUrl('/cursos');
}

  irAHistorial() {
  // Si estás usando routerLink:
  this.router.navigate(['/historial-reciclaje']);

}

  registrar() {
    const fechaRegistro = new Date().toLocaleString('sv-SE').replace('T', ' ');

    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const apiKey = 'AIzaSyC3EsECi1kur8NWG8_yWGRB3L5fhF2I2aU';
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

      fetch(url)
        .then(res => res.json())
        .then(data => {
          this.registroUbicacion = (data.status === 'OK' && data.results.length > 0)
            ? data.results[0].formatted_address
            : `Lat: ${lat}, Lng: ${lng}`;

          const nuevoUsuario = {
            nombre: this.registroNombre,
            apellido: this.registroApellidos,
            tipo_documento: this.registroTipoDoc,
            documento: this.registroDocumento,
            fecha_nacimiento: this.registroFechaNacimiento,
            correo: this.registroCorreo,
            contrasena: this.registroClave,
            ubicacion_actual: this.registroUbicacion,
            fecha_registro: fechaRegistro
          };

          this.authService.registrarUsuario(nuevoUsuario).subscribe({
            next: () => {
              this.registroExitoso = true;
              this.mensajeError = '';
              this.limpiarFormulario();
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
    }, () => {
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

  limpiarFormulario() {
    this.registroNombre = '';
    this.registroApellidos = '';
    this.registroTipoDoc = 'DNI';
    this.registroDocumento = '';
    this.registroFechaNacimiento = '';
    this.registroCorreo = '';
    this.registroClave = '';
    this.registroUbicacion = '';
    this.documentoInvalido = false;
    this.mensajeErrorDocumento = '';
    this.errorEdad = '';
  }

  // Nuevos métodos para la recuperación de contraseña
  // Nuevos métodos para la recuperación de contraseña
  abrirModalRecuperacion() {
    // Aseguramos que el modal principal de login/registro esté cerrado
    this.modalAbierto = false; 

    // Luego, abrimos el modal de recuperación
    this.mostrarModalRecuperacion = true;
    this.mensajeErrorRecuperacion = '';
    this.correoRecuperacion = ''; // Limpia el campo por si acaso
  }

  cerrarModalRecuperacion() {
    this.mostrarModalRecuperacion = false;
    this.correoRecuperacion = '';
    this.mensajeErrorRecuperacion = '';
    this.abrirModal(); // Opcional: abre de nuevo el modal de login
  }

  enviarCorreoRecuperacion() {
    if (!this.correoRecuperacion) {
      this.mensajeErrorRecuperacion = '❌ Por favor, ingrese un correo electrónico.';
      return;
    }

    this.authService.solicitarRecuperacion(this.correoRecuperacion).subscribe({
      next: (res) => {
        // Por seguridad, siempre muestra un mensaje genérico
        this.mensajeErrorRecuperacion = '✅ Se envió un mensaje a tu correo, verifica tu bandeja de entrada';
        // Opcional: puedes cerrar el modal después de un tiempo
        setTimeout(() => {
          this.cerrarModalRecuperacion();
        }, 5000);
      },
      error: (err) => {
        // En caso de error de conexión, también muestra un mensaje seguro
        console.error('Error en la solicitud de recuperación:', err);
        this.mensajeErrorRecuperacion = '❌ Hubo un problema al intentar enviar el correo. Inténtelo más tarde.';
      }
    });
  }
  
}

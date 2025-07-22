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

  registroTipoDoc: string = 'DNI';
  registroDocumento: string = '';
  registroApellidos: string = '';
  registroFechaNacimiento: string = '';
  mensajeErrorDocumento: string = '';
  documentoInvalido: boolean = false;
  errorEdad: string = '';

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
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

  soloNumeros(event: KeyboardEvent) {
  const charCode = event.which ? event.which : event.keyCode;
  // Solo permitir números (0-9)
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
    edad--; // No ha cumplido aún este año
  }

  if (edad < 16) {
    this.errorEdad = 'Debes cumplir con las politicas de nuestro servicio web: Tener más de 16 años';
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
        // ✅ Guardar ID, nombre y token por separado
        sessionStorage.setItem('usuario_id', String(res.usuario.id));          // Necesario para juego
        sessionStorage.setItem('usuario_nombre', res.usuario.nombre);          // Útil para IA o saludo
        sessionStorage.setItem('token', res.token);                            // Para autenticación
        sessionStorage.setItem('usuario', JSON.stringify(res.usuario));        // Por si quieres todo junto
      }

      // 🔄 Actualiza observable global de sesión
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

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    const apiKey = 'AIzaSyC3EsECi1kur8NWG8_yWGRB3L5fhF2I2aU';
    //const apiKey = 'AIzaSyBlhDL17B-zWtCf7wNEwLrkDzHV3ZhdyqA';
    //const apiKey = 'AIzaSyDy6lBQPNraX5OkaMdYWI2w1709XpHMAwg';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        this.registroUbicacion = (data.status === 'OK' && data.results.length > 0)
          ? data.results[0].formatted_address
          : `Lat: ${lat}, Lng: ${lng}`;

        // ✅ ENVIAR TODOS LOS CAMPOS EXACTAMENTE COMO EL BACKEND ESPERA
        const nuevoUsuario = {
          nombre: this.registroNombre,
          apellido: this.registroApellidos,
          tipo_documento: this.registroTipoDoc,
          documento: this.registroDocumento,
          fecha_nacimiento: this.registroFechaNacimiento, // Snake case
          correo: this.registroCorreo,
          contrasena: this.registroClave,
          ubicacion_actual: this.registroUbicacion,
          fecha_registro: fechaRegistro
        };

        console.log('📤 Enviando:', nuevoUsuario);

        this.authService.registrarUsuario(nuevoUsuario).subscribe({
          next: () => {
            this.registroExitoso = true;
            this.mensajeError = '';
            this.limpiarFormulario(); // ✅ Aquí limpias todo
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
  this.registroTipoDoc = 'DNI'; // O el valor por defecto que quieras
  this.registroDocumento = '';
  this.registroFechaNacimiento = '';
  this.registroCorreo = '';
  this.registroClave = '';
  this.registroUbicacion = '';
  this.documentoInvalido = false;
  this.mensajeErrorDocumento = '';
  this.errorEdad = '';
}

}


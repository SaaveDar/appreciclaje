import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    const user = localStorage.getItem('usuario'); // Aquí puedes validar con tu lógica actual

    if (user) {
      return true;
    } else {
      this.router.navigate(['/inicio']); // Redirige al login si no hay sesión
      return false;
    }
  }

  isLoggedIn(): boolean {
  return !!localStorage.getItem('usuario');
}

}

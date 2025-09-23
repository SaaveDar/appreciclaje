import { Component } from '@angular/core';
import { SessionService } from '../servicios/session.service';

@Component({
  selector: 'app-nosotros',
  imports: [],
  templateUrl: './nosotros.component.html',
  styleUrl: './nosotros.component.css'
})
export class NosotrosComponent {

   constructor(private sessionService: SessionService) {
}
}

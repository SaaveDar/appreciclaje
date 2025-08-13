import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialReciclajeComponent } from './historial-reciclaje.component';

describe('HistorialReciclajeComponent', () => {
  let component: HistorialReciclajeComponent;
  let fixture: ComponentFixture<HistorialReciclajeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialReciclajeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialReciclajeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

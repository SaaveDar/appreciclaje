import { TestBed } from '@angular/core/testing';

import { TiposResiduosService } from './tipos-residuos.service';

describe('TiposResiduosService', () => {
  let service: TiposResiduosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TiposResiduosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filtroTabla', standalone: true })
export class FiltroTablaPipe implements PipeTransform {
  transform(items: any[], searchText: string, filtros: any): any[] {
    if (!items) return [];
    let filtrados = items;

    // 🔍 Busqueda general
    if (searchText) {
      const texto = searchText.toLowerCase();
      filtrados = filtrados.filter(item =>
        Object.values(item).some(val => String(val).toLowerCase().includes(texto))
      );
    }

    // 🎯 Filtros por columna
    if (filtros) {
      if (filtros.usuario) {
        filtrados = filtrados.filter(item => item.nombre?.toLowerCase().includes(filtros.usuario.toLowerCase()));
      }
      if (filtros.correo) {
        filtrados = filtrados.filter(item => item.correo?.toLowerCase().includes(filtros.correo.toLowerCase()));
      }
      if (filtros.categoria) {
        filtrados = filtrados.filter(item => item.categoria?.toLowerCase().includes(filtros.categoria.toLowerCase()));
      }
      if (filtros.residuo) {
        filtrados = filtrados.filter(item => item.residuo?.toLowerCase().includes(filtros.residuo.toLowerCase()));
      }
      if (filtros.peso) {
        filtrados = filtrados.filter(item => String(item.peso_kg).includes(String(filtros.peso)));
      }
      if (filtros.fecha) {
        filtrados = filtrados.filter(item => item.fecha?.includes(filtros.fecha));
      }
    }

    return filtrados;
  }
}

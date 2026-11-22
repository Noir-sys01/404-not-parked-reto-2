// filtros.js
// Recibe la lista completa de reportes y los filtros activos,
// y devuelve solo los reportes que cumplen TODOS los filtros elegidos.
//
// Idea central: "para cada reporte, si cumple las opciones elegidas, se muestra".
//
// Requiere que criticidad.js se cargue ANTES que este archivo,
// porque reutiliza su función esHoraPico para saber la franja de cada reporte.
//
// Forma de los filtros (un filtro vacío "" significa "no filtrar por eso"):
//   { cuadra: "", franja: "", categoria: "", actor: "" }
//   - cuadra:    por ejemplo "CR5-C14-C15"
//   - franja:    "pico" o "valle"
//   - categoria: por ejemplo "doble_fila"
//   - actor:     por ejemplo "motocicleta"

// Devuelve "pico" o "valle" para un reporte (misma regla que en criticidad.js).
function franjaDeReporte(reporte, criterios) {
  const hora = reporte.fecha_hora.substring(11, 16); // "2026-11-18T11:40" -> "11:40"
  return esHoraPico(hora, criterios.horas_pico) ? "pico" : "valle";
}

// Dice si UN reporte cumple todos los filtros activos.
function cumpleFiltros(reporte, filtros, criterios) {
  // Si el filtro está activo y el reporte NO coincide, queda descartado.
  if (filtros.cuadra && reporte.cuadra !== filtros.cuadra) return false;
  if (filtros.categoria && reporte.categoria !== filtros.categoria) return false;
  if (filtros.actor && reporte.actor !== filtros.actor) return false;
  if (filtros.franja && franjaDeReporte(reporte, criterios) !== filtros.franja) return false;

  // Pasó todas las pruebas: se queda.
  return true;
}

// Función principal.
//   reportes:  la lista completa (reportes.json + lo guardado en localStorage)
//   filtros:   los filtros activos (ver arriba)
//   criterios: el contenido de criterios.json (para deducir la franja)
function filtrarReportes(reportes, filtros, criterios) {
  const resultado = [];
  for (const reporte of reportes) {                      // repetición: para cada reporte...
    if (cumpleFiltros(reporte, filtros, criterios)) {    // condición: ...si cumple los filtros...
      resultado.push(reporte);                           // ...se muestra
    }
  }
  return resultado;
}

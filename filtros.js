// filtros.js: selección de reportes y cálculo de conteos/porcentajes (RF-04 y CU-02).

(function (global) {
  "use strict";

  // Repetición con condición: para cada reporte, si cumple las opciones elegidas, se conserva.
  function filtrarReportes(reportes, filtros) {
    const f = filtros || {};
    return reportes.filter(function (r) {
      if (f.cuadra && f.cuadra !== "todas" && r.cuadra !== f.cuadra) {
        return false;
      }
      const franjaReporte = (r.criticidad && r.criticidad.desglose && r.criticidad.desglose.franja_horaria) || "valle";
      if (f.franja && f.franja !== "todas" && franjaReporte !== f.franja) {
        return false;
      }
      if (f.categoria && f.categoria !== "todas" && r.categoria !== f.categoria) {
        return false;
      }
      if (f.actor && f.actor !== "todos" && r.actor !== f.actor) {
        return false;
      }
      if (f.nivel && f.nivel !== "todos" && r.criticidad && r.criticidad.nivel !== f.nivel) {
        return false;
      }
      return true;
    });
  }

  // Calcula totales por nivel y porcentajes por categoría para el tablero (CU-02)
  function calcularEstadisticas(reportes) {
    const total = reportes.length;
    const porNivel = { Alto: 0, Medio: 0, Bajo: 0 };
    const porCategoria = {
      doble_fila: 0,
      bloqueo_rampa_cebra_paradero: 0,
      invasion_anden: 0
    };

    reportes.forEach(function (r) {
      const nivel = (r.criticidad && r.criticidad.nivel) || "Bajo";
      if (Object.prototype.hasOwnProperty.call(porNivel, nivel)) {
        porNivel[nivel] += 1;
      }
      if (Object.prototype.hasOwnProperty.call(porCategoria, r.categoria)) {
        porCategoria[r.categoria] += 1;
      }
    });

    const porcentajesCategoria = {
      doble_fila: total > 0 ? Math.round((porCategoria.doble_fila / total) * 100) : 0,
      bloqueo_rampa_cebra_paradero: total > 0 ? Math.round((porCategoria.bloqueo_rampa_cebra_paradero / total) * 100) : 0,
      invasion_anden: total > 0 ? Math.round((porCategoria.invasion_anden / total) * 100) : 0
    };

    return {
      total: total,
      porNivel: porNivel,
      porCategoria: porCategoria,
      porcentajesCategoria: porcentajesCategoria
    };
  }

  global.Filtros = {
    filtrarReportes: filtrarReportes,
    calcularEstadisticas: calcularEstadisticas
  };
})(window);

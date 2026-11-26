// resumen.js: agrupación por cuadra, ranking Top 5 y recomendaciones con reglas explícitas (RF-05 y CU-03).

(function (global) {
  "use strict";

  function aplicarReglas(grupo) {
    const n = grupo.totalReportes;
    const altoPico = grupo.altoEnPico;
    const cAnden = grupo.categorias.invasion_anden || 0;
    const cDoble = grupo.categorias.doble_fila || 0;
    const cBloqueo = grupo.categorias.bloqueo_rampa_cebra_paradero || 0;
    const aCarga = grupo.actores.vehiculo_carga || 0;

    // Regla R1: 3 o más reportes de nivel Alto en hora pico
    if (altoPico >= 3) {
      return {
        recomendacion: "Patrullaje prioritario en hora pico",
        regla: "Regla R1: " + altoPico + " reportes de nivel Alto en hora pico (umbral ≥ 3)."
      };
    }

    // Regla R2: Predomina vehículo de carga descargando (>= 40 %)
    if (n > 0 && (aCarga / n) >= 0.4) {
      return {
        recomendacion: "Revisar horario de cargue y descargue",
        regla: "Regla R2: Predomina vehículo de carga (" + aCarga + " de " + n + " reportes, ≥ 40 %)."
      };
    }

    // Regla R3: Predomina invasión de andén (> 50 %)
    if (n > 0 && (cAnden / n) > 0.5) {
      return {
        recomendacion: "Operativo de espacio público y recuperación de andén",
        regla: "Regla R3: Predomina invasión de andén (" + cAnden + " de " + n + " reportes, > 50 %)."
      };
    }

    // Regla R4: Predomina doble fila / vía prohibida (> 50 %)
    if (n > 0 && (cDoble / n) > 0.5) {
      return {
        recomendacion: "Control de estacionamiento en vía prohibida y señalización",
        regla: "Regla R4: Predomina doble fila / vía prohibida (" + cDoble + " de " + n + " reportes, > 50 %)."
      };
    }

    // Regla R5: Predomina bloqueo de rampa, cebra o paradero (> 50 %)
    if (n > 0 && (cBloqueo / n) > 0.5) {
      return {
        recomendacion: "Despeje prioritario de cruces peatonales, rampas y paraderos",
        regla: "Regla R5: Predomina bloqueo de rampa, cebra o paradero (" + cBloqueo + " de " + n + " reportes, > 50 %)."
      };
    }

    // Regla R6: Reincidencia mixta
    return {
      recomendacion: "Ronda preventiva mixta (tránsito y espacio público)",
      regla: "Regla R6: Reincidencia mixta sin categoría única mayoritaria (" + n + " reportes)."
    };
  }

  function generarResumenOperativo(reportes, viasData) {
    const mapaCuadras = {};
    const infoVias = {};

    if (viasData && Array.isArray(viasData.cuadras)) {
      viasData.cuadras.forEach(function (c) {
        infoVias[c.id] = c;
      });
    }

    reportes.forEach(function (r) {
      const cid = r.cuadra || "Sin tramo";
      if (!mapaCuadras[cid]) {
        const meta = infoVias[cid] || {};
        mapaCuadras[cid] = {
          cuadra: cid,
          descripcion: meta.descripcion || cid,
          tipoVia: meta.tipo || "secundaria",
          totalReportes: 0,
          puntajeAcumulado: 0,
          altoEnPico: 0,
          categorias: {},
          actores: {}
        };
      }

      const g = mapaCuadras[cid];
      const pts = (r.criticidad && Number(r.criticidad.puntaje)) || 0;
      const nivel = (r.criticidad && r.criticidad.nivel) || "Bajo";
      const franja = (r.criticidad && r.criticidad.desglose && r.criticidad.desglose.franja_horaria) || "valle";

      g.totalReportes += 1;
      g.puntajeAcumulado += pts;
      if (nivel === "Alto" && franja === "pico") {
        g.altoEnPico += 1;
      }
      g.categorias[r.categoria] = (g.categorias[r.categoria] || 0) + 1;
      g.actores[r.actor] = (g.actores[r.actor] || 0) + 1;
    });

    const grupos = Object.values(mapaCuadras);
    grupos.sort(function (a, b) {
      if (b.puntajeAcumulado !== a.puntajeAcumulado) {
        return b.puntajeAcumulado - a.puntajeAcumulado;
      }
      return b.totalReportes - a.totalReportes;
    });

    return grupos.slice(0, 5).map(function (g, indice) {
      const decision = aplicarReglas(g);
      return Object.assign({}, g, {
        posicion: indice + 1,
        recomendacion: decision.recomendacion,
        regla: decision.regla
      });
    });
  }

  global.Resumen = {
    aplicarReglas: aplicarReglas,
    generarResumenOperativo: generarResumenOperativo
  };
})(window);

// resumen.js: agrupación por cuadra, ranking Top 5 y recomendaciones con reglas explícitas (RF-05 y CU-03).

(function (global) {
  "use strict";

  // Valores de respaldo: solo se usan si criterios.json no trae la sección "recomendacion".
  const UMBRALES_POR_DEFECTO = {
    min_altos_en_pico: 3,
    umbral_carga: 0.4,
    umbral_predominio: 0.5,
    min_reportes_para_reglas: 3
  };

  function leerUmbrales(criterios) {
    const r = (criterios && criterios.recomendacion) || {};
    return {
      min_altos_en_pico: r.min_altos_en_pico !== undefined ? r.min_altos_en_pico : UMBRALES_POR_DEFECTO.min_altos_en_pico,
      umbral_carga: r.umbral_carga !== undefined ? r.umbral_carga : UMBRALES_POR_DEFECTO.umbral_carga,
      umbral_predominio: r.umbral_predominio !== undefined ? r.umbral_predominio : UMBRALES_POR_DEFECTO.umbral_predominio,
      min_reportes_para_reglas: r.min_reportes_para_reglas !== undefined ? r.min_reportes_para_reglas : UMBRALES_POR_DEFECTO.min_reportes_para_reglas
    };
  }

  function porcentaje(x) {
    return Math.round(x * 100) + " %";
  }

  function aplicarReglas(grupo, umbrales) {
    const u = umbrales || UMBRALES_POR_DEFECTO;
    const n = grupo.totalReportes;
    const altoPico = grupo.altoEnPico;
    const cAnden = grupo.categorias.invasion_anden || 0;
    const cDoble = grupo.categorias.doble_fila || 0;
    const cBloqueo = grupo.categorias.bloqueo_rampa_cebra_paradero || 0;
    const aCarga = grupo.actores.vehiculo_carga || 0;

    // Regla R1: 3 o más reportes de nivel Alto en hora pico
    if (altoPico >= u.min_altos_en_pico) {
      return {
        recomendacion: "Patrullaje prioritario en hora pico",
        regla: "Regla R1: " + altoPico + " reportes de nivel Alto en hora pico (umbral ≥ " + u.min_altos_en_pico + ")."
      };
    }

    // Regla R2: pocos reportes en la cuadra. Con tan pocos datos no tiene sentido hablar de "predominio",
    // así que se recomienda seguimiento en lugar de aplicar las reglas por porcentaje (R3 a R6).
    if (n < u.min_reportes_para_reglas) {
      return {
        recomendacion: "Seguimiento: reunir más reportes antes de intervenir",
        regla: "Regla R2: solo " + n + " reporte(s) en la cuadra (mínimo " + u.min_reportes_para_reglas + " para aplicar las reglas R3 a R6)."
      };
    }

    // Regla R3: Predomina vehículo de carga descargando (>= 40 %)
    if (n > 0 && (aCarga / n) >= u.umbral_carga) {
      return {
        recomendacion: "Revisar horario de cargue y descargue",
        regla: "Regla R3: Predomina vehículo de carga (" + aCarga + " de " + n + " reportes, ≥ " + porcentaje(u.umbral_carga) + ")."
      };
    }

    // Regla R4: Predomina invasión de andén (> 50 %)
    if (n > 0 && (cAnden / n) > u.umbral_predominio) {
      return {
        recomendacion: "Operativo de espacio público y recuperación de andén",
        regla: "Regla R4: Predomina invasión de andén (" + cAnden + " de " + n + " reportes, > " + porcentaje(u.umbral_predominio) + ")."
      };
    }

    // Regla R5: Predomina doble fila / vía prohibida (> 50 %)
    if (n > 0 && (cDoble / n) > u.umbral_predominio) {
      return {
        recomendacion: "Control de estacionamiento en vía prohibida y señalización",
        regla: "Regla R5: Predomina doble fila / vía prohibida (" + cDoble + " de " + n + " reportes, > " + porcentaje(u.umbral_predominio) + ")."
      };
    }

    // Regla R6: Predomina bloqueo de rampa, cebra o paradero (> 50 %)
    if (n > 0 && (cBloqueo / n) > u.umbral_predominio) {
      return {
        recomendacion: "Despeje prioritario de cruces peatonales, rampas y paraderos",
        regla: "Regla R6: Predomina bloqueo de rampa, cebra o paradero (" + cBloqueo + " de " + n + " reportes, > " + porcentaje(u.umbral_predominio) + ")."
      };
    }

    // Regla R7: Reincidencia mixta
    return {
      recomendacion: "Ronda preventiva mixta (tránsito y espacio público)",
      regla: "Regla R7: Reincidencia mixta sin categoría única mayoritaria (" + n + " reportes)."
    };
  }

  function generarResumenOperativo(reportes, viasData, criterios) {
    const umbrales = leerUmbrales(criterios);
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
      const decision = aplicarReglas(g, umbrales);
      return Object.assign({}, g, {
        posicion: indice + 1,
        recomendacion: decision.recomendacion,
        regla: decision.regla
      });
    });
  }

  global.Resumen = {
    aplicarReglas: aplicarReglas,
    leerUmbrales: leerUmbrales,
    generarResumenOperativo: generarResumenOperativo
  };
})(window);

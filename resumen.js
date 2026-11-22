// resumen.js
// Agrupa los reportes por cuadra, suma sus puntajes, se queda con las más críticas
// y le asigna a cada una una recomendación según reglas escritas.
//
// Requiere cargar ANTES: criticidad.js y filtros.js
// (usa franjaDeReporte, que a su vez usa esHoraPico).
//
// Los umbrales de las reglas viven en criterios.json (sección "recomendacion"),
// así se pueden cambiar sin tocar este código.

// Paso 1: agrupar por cuadra.
// Devuelve una lista con un resumen por cada cuadra que aparece en los reportes.
function agruparPorCuadra(reportes, criterios) {
  const grupos = {}; // aquí guardamos un grupo por cada nombre de cuadra

  for (const reporte of reportes) {                 // repetición: para cada reporte...
    const cuadra = reporte.cuadra;

    // Si es la primera vez que vemos esta cuadra, creamos su grupo vacío.
    if (!grupos[cuadra]) {
      grupos[cuadra] = {
        cuadra: cuadra,
        puntajeTotal: 0,
        numReportes: 0,
        altosEnPico: 0,     // reportes de nivel Alto que ocurrieron en hora pico
        porCategoria: {},   // por ejemplo { invasion_anden: 3, doble_fila: 1 }
        porActor: {}        // por ejemplo { motocicleta: 2 }
      };
    }
    const g = grupos[cuadra];

    // ...los acumulamos en el grupo de su cuadra.
    g.puntajeTotal += reporte.criticidad.puntaje;
    g.numReportes += 1;
    if (reporte.criticidad.nivel === "Alto" && franjaDeReporte(reporte, criterios) === "pico") {
      g.altosEnPico += 1;
    }
    g.porCategoria[reporte.categoria] = (g.porCategoria[reporte.categoria] || 0) + 1;
    g.porActor[reporte.actor] = (g.porActor[reporte.actor] || 0) + 1;
  }

  return Object.values(grupos); // convierte el objeto de grupos en una lista
}

// "Predomina" significa: esa opción supera la proporción indicada de los reportes de la cuadra.
// Con proporción 0.5, debe ser MÁS de la mitad (la mitad exacta no cuenta).
function predomina(cantidad, total, proporcion) {
  return cantidad / total > proporcion;
}

// Paso 2: recomendar. Revisa las reglas EN ORDEN y se queda con la primera que se cumple.
// Devuelve la recomendación y la regla que la produjo (RF-05 exige mostrar la regla).
function recomendar(grupo, criterios) {
  const r = criterios.recomendacion;

  // Regla R1: tres o más reportes Alto en hora pico
  if (grupo.altosEnPico >= r.min_altos_en_pico) {
    return {
      recomendacion: "Patrullaje prioritario en hora pico",
      regla: "R1: " + grupo.altosEnPico + " reportes de nivel Alto en hora pico (mínimo " + r.min_altos_en_pico + ")",
      reglaId: "R1"
    };
  }

  // Regla R2: predomina la invasión de andén
  const nAnden = grupo.porCategoria["invasion_anden"] || 0;
  if (predomina(nAnden, grupo.numReportes, r.proporcion_predominio)) {
    return {
      recomendacion: "Operativo de espacio público",
      regla: "R2: invasión de andén en " + nAnden + " de " + grupo.numReportes + " reportes",
      reglaId: "R2"
    };
  }

  // Regla R3: predomina el vehículo de carga
  const nCarga = grupo.porActor["vehiculo_carga"] || 0;
  if (predomina(nCarga, grupo.numReportes, r.proporcion_predominio)) {
    return {
      recomendacion: "Revisar horario de cargue y descargue",
      regla: "R3: vehículo de carga en " + nCarga + " de " + grupo.numReportes + " reportes",
      reglaId: "R3"
    };
  }

  // Ninguna regla se cumplió: recomendación por defecto.
  return {
    recomendacion: "Seguimiento y monitoreo",
    regla: "R4 (por defecto): ninguna de las reglas R1 a R3 se cumple",
    reglaId: "R4"
  };
}

// Función principal.
//   reportes:  la lista de reportes (cada uno ya con su criticidad)
//   criterios: el contenido de criterios.json
//   cuantas:   cuántas cuadras mostrar (el reto pide 5)
// Devuelve las cuadras más críticas, ordenadas de mayor a menor puntaje.
function resumenOperativo(reportes, criterios, cuantas) {
  const grupos = agruparPorCuadra(reportes, criterios);

  // Orden: mayor puntaje primero; si empatan, la que tiene más reportes.
  grupos.sort(function (a, b) {
    return (b.puntajeTotal - a.puntajeTotal) || (b.numReportes - a.numReportes);
  });

  const top = grupos.slice(0, cuantas || 5);

  // A cada cuadra del top le agregamos su posición y su recomendación.
  const resultado = [];
  for (let i = 0; i < top.length; i++) {
    const rec = recomendar(top[i], criterios);
    resultado.push({
      posicion: i + 1,
      cuadra: top[i].cuadra,
      puntajeTotal: top[i].puntajeTotal,
      numReportes: top[i].numReportes,
      altosEnPico: top[i].altosEnPico,
      recomendacion: rec.recomendacion,
      regla: rec.regla,
      reglaId: rec.reglaId
    });
  }
  return resultado;
}

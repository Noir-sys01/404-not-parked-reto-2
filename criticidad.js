// criticidad.js: cálculo puro del índice de criticidad (RF-02).
// No toca el DOM ni el mapa, por lo que puede probarse de forma independiente.

(function (global) {
  "use strict";

  const ETIQUETAS_CATEGORIA = {
    doble_fila: "Doble fila / vía prohibida",
    bloqueo_rampa_cebra_paradero: "Bloqueo de rampa, cebra o paradero",
    invasion_anden: "Invasión de andén"
  };

  const ETIQUETAS_ACTOR = {
    vehiculo_particular: "Vehículo particular",
    motocicleta: "Motocicleta",
    vehiculo_carga: "Vehículo de carga descargando",
    mobiliario_comercial: "Mobiliario comercial"
  };

  function aMinutos(horaTexto) {
    const partes = String(horaTexto).trim().split(":");
    const hh = parseInt(partes[0], 10) || 0;
    const mm = parseInt(partes[1], 10) || 0;
    return hh * 60 + mm;
  }

  // Deduce si la hora del reporte cae en franja "pico" o "valle" según criterios.json
  function deducirFranja(fechaHora, horasPico) {
    if (!fechaHora || !Array.isArray(horasPico)) return "valle";
    const parteHora = fechaHora.includes("T") ? fechaHora.split("T")[1] : fechaHora;
    const minutos = aMinutos(parteHora);

    for (let i = 0; i < horasPico.length; i++) {
      const rango = horasPico[i].split("-");
      if (rango.length === 2) {
        const inicio = aMinutos(rango[0]);
        const fin = aMinutos(rango[1]);
        if (minutos >= inicio && minutos < fin) {
          return "pico";
        }
      }
    }
    return "valle";
  }

  // Busca el tipo de vía ("arterial" o "secundaria") en vias.json según la cuadra
  function obtenerTipoVia(cuadraId, viasData) {
    const lista = (viasData && Array.isArray(viasData.cuadras)) ? viasData.cuadras : [];
    const encontrada = lista.find(function (c) { return c.id === cuadraId; });
    // Si la cuadra no está en vias.json se devuelve null (antes se asumía "secundaria" sin avisar).
    return encontrada ? encontrada.tipo : null;
  }

  // Convierte el puntaje numérico en "Bajo", "Medio" o "Alto" usando criterios.json
  function clasificarNivel(puntaje, niveles) {
    if (!niveles) {
      if (puntaje >= 7) return "Alto";
      if (puntaje >= 5) return "Medio";
      return "Bajo";
    }
    const entradas = Object.entries(niveles);
    for (let i = 0; i < entradas.length; i++) {
      const nombreNivel = entradas[i][0];
      const rango = entradas[i][1];
      if (Array.isArray(rango) && puntaje >= rango[0] && puntaje <= rango[1]) {
        return nombreNivel;
      }
    }
    return puntaje > 6 ? "Alto" : "Bajo";
  }

  // Función principal RF-02: recibe un reporte y devuelve puntaje, nivel y desglose
  function calcularCriticidad(reporte, viasData, criterios) {
    const tipoVia = obtenerTipoVia(reporte.cuadra, viasData);
    if (tipoVia === null) {
      throw new Error('la cuadra "' + reporte.cuadra + '" no está en vias.json');
    }
    const franjaHoraria = deducirFranja(reporte.fecha_hora, criterios.horas_pico);

    // Cada peso debe existir en criterios.json; si falta, se avisa en lugar de sumar 0 en silencio.
    const pesoCategoria = (criterios.categoria || {})[reporte.categoria];
    const pesoVia = (criterios.via || {})[tipoVia];
    const pesoFranja = (criterios.franja || {})[franjaHoraria];
    if (pesoCategoria === undefined) throw new Error('categoría desconocida: "' + reporte.categoria + '"');
    if (pesoVia === undefined) throw new Error('tipo de vía desconocido en criterios.json: "' + tipoVia + '"');
    if (pesoFranja === undefined) throw new Error('franja desconocida en criterios.json: "' + franjaHoraria + '"');

    const puntaje = Number(pesoCategoria) + Number(pesoVia) + Number(pesoFranja);
    const nivel = clasificarNivel(puntaje, criterios.niveles);

    return {
      puntaje: puntaje,
      nivel: nivel,
      desglose: {
        categoria: pesoCategoria,
        via: pesoVia,
        franja: pesoFranja,
        tipo_via: tipoVia,
        franja_horaria: franjaHoraria
      }
    };
  }

  // Reportes que no se pudieron calcular en la última llamada a recalcularTodos
  let ultimosErrores = [];

  // Recalcula la criticidad de todos los reportes (permite cambiar pesos en criterios.json y ver el efecto al instante).
  // Los reportes con datos inválidos (cuadra desconocida, categoría rara...) se omiten y se registran en obtenerErrores().
  function recalcularTodos(reportes, viasData, criterios) {
    ultimosErrores = [];
    const validos = [];
    reportes.forEach(function (r) {
      try {
        const copia = Object.assign({}, r);
        copia.criticidad = calcularCriticidad(copia, viasData, criterios);
        validos.push(copia);
      } catch (e) {
        ultimosErrores.push({ id: r.id || "(sin id)", mensaje: e.message });
        console.warn("Reporte omitido " + (r.id || "(sin id)") + ": " + e.message);
      }
    });
    return validos;
  }

  function obtenerErrores() {
    return ultimosErrores.slice();
  }

  global.Criticidad = {
    ETIQUETAS_CATEGORIA: ETIQUETAS_CATEGORIA,
    ETIQUETAS_ACTOR: ETIQUETAS_ACTOR,
    deducirFranja: deducirFranja,
    obtenerTipoVia: obtenerTipoVia,
    clasificarNivel: clasificarNivel,
    calcularCriticidad: calcularCriticidad,
    recalcularTodos: recalcularTodos,
    obtenerErrores: obtenerErrores
  };
})(window);

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
    return encontrada ? encontrada.tipo : "secundaria";
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
    const franjaHoraria = deducirFranja(reporte.fecha_hora, criterios.horas_pico);

    const pesoCategoria = Number((criterios.categoria && criterios.categoria[reporte.categoria]) || 0);
    const pesoVia = Number((criterios.via && criterios.via[tipoVia]) || 0);
    const pesoFranja = Number((criterios.franja && criterios.franja[franjaHoraria]) || 0);

    const puntaje = pesoCategoria + pesoVia + pesoFranja;
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

  // Recalcula la criticidad de todos los reportes (permite cambiar pesos en criterios.json y ver el efecto al instante)
  function recalcularTodos(reportes, viasData, criterios) {
    return reportes.map(function (r) {
      const copia = Object.assign({}, r);
      copia.criticidad = calcularCriticidad(copia, viasData, criterios);
      return copia;
    });
  }

  global.Criticidad = {
    ETIQUETAS_CATEGORIA: ETIQUETAS_CATEGORIA,
    ETIQUETAS_ACTOR: ETIQUETAS_ACTOR,
    deducirFranja: deducirFranja,
    obtenerTipoVia: obtenerTipoVia,
    clasificarNivel: clasificarNivel,
    calcularCriticidad: calcularCriticidad,
    recalcularTodos: recalcularTodos
  };
})(window);

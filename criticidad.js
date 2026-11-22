// criticidad.js
// Recibe un reporte y devuelve su puntaje y nivel de criticidad.
// No toca el mapa ni la pantalla: solo hace la cuenta.
//
// Fórmula: puntaje = categoría + tipo de vía + franja horaria
// Los pesos y rangos NO están aquí: viven en criterios.json.

// Convierte "11:40" en minutos desde medianoche (11*60 + 40 = 700).
function horaAMinutos(hora) {
  const partes = hora.split(":");
  return Number(partes[0]) * 60 + Number(partes[1]);
}

// Dice si una hora ("11:40") cae en alguna franja pico, por ejemplo "11:30-14:00".
// Regla: el inicio cuenta y el final no (11:30 es pico, 14:00 ya es valle).
function esHoraPico(hora, horasPico) {
  const minutos = horaAMinutos(hora);
  for (const rango of horasPico) {
    const [inicio, fin] = rango.split("-");
    if (minutos >= horaAMinutos(inicio) && minutos < horaAMinutos(fin)) {
      return true;
    }
  }
  return false;
}

// Convierte un puntaje en "Bajo", "Medio" o "Alto" usando los rangos de criterios.json.
function puntajeANivel(puntaje, niveles) {
  for (const nombre in niveles) {
    const [minimo, maximo] = niveles[nombre];
    if (puntaje >= minimo && puntaje <= maximo) {
      return nombre;
    }
  }
  return "Sin nivel"; // pasa si los rangos tienen huecos: revisar criterios.json
}

// Función principal.
//   reporte:   un registro como los de reportes.json
//   vias:      el contenido de vias.json
//   criterios: el contenido de criterios.json
function calcularCriticidad(reporte, vias, criterios) {
  // 1. Componente de categoría
  const pCategoria = criterios.categoria[reporte.categoria];

  // 2. Componente de tipo de vía (se busca por la cuadra, el usuario no lo escribe)
  const tipoVia = vias[reporte.cuadra];
  const pVia = criterios.via[tipoVia];

  // 3. Componente de franja (se deduce de la hora del reporte: "2026-11-18T11:40" -> "11:40")
  const hora = reporte.fecha_hora.substring(11, 16);
  const franja = esHoraPico(hora, criterios.horas_pico) ? "pico" : "valle";
  const pFranja = criterios.franja[franja];

  // 4. Validar que no falte nada (así un error de datos no pasa en silencio)
  if (pCategoria === undefined) throw new Error("Categoría desconocida: " + reporte.categoria);
  if (pVia === undefined) throw new Error("Cuadra no encontrada en vias.json: " + reporte.cuadra);

  // 5. Sumar los tres componentes, UNA sola vez cada uno
  const puntaje = pCategoria + pVia + pFranja;

  return {
    puntaje: puntaje,
    nivel: puntajeANivel(puntaje, criterios.niveles),
    // El desglose sirve para mostrar la cuenta a mano frente al jurado
    detalle: { categoria: pCategoria, via: pVia, franja: pFranja, tipoVia: tipoVia, franjaNombre: franja }
  };
}

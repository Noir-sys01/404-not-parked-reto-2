// mapa.js: orquesta el mapa Leaflet, capa de calor (Leaflet.heat), puntos individuales, filtros, resumen y exportar/importar JSON.

(function () {
  "use strict";

  const CENTRO_UNIMAG = [11.225715, -74.189272];
  const ZOOM_INICIAL = 17;
  const CLAVE_STORAGE = "reto2_unimag_reportes_locales_v1";

  const COLORES_NIVEL = {
    Alto: "#c0392b",
    Medio: "#e08e0b",
    Bajo: "#2e8b57"
  };

  let viasData = { cuadras: [] };
  let criteriosData = {};
  let reportesBase = [];
  let reportesLocales = [];
  let todosLosReportes = [];

  let capaCalor = null;
  const capaPuntos = L.layerGroup();
  let marcadorTemporalCaptura = null;

  // Inicializar mapa centrado en el entorno real de la Universidad del Magdalena
  const mapa = L.map("mapa").setView(CENTRO_UNIMAG, ZOOM_INICIAL);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(mapa);

  capaPuntos.addTo(mapa);

  function escaparHtml(texto) {
    return String(texto || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function etiquetaCategoria(clave) {
    return (window.Criticidad && window.Criticidad.ETIQUETAS_CATEGORIA[clave]) || clave;
  }

  function etiquetaActor(clave) {
    return (window.Criticidad && window.Criticidad.ETIQUETAS_ACTOR[clave]) || clave;
  }

  function cargarLocales() {
    try {
      const crudo = localStorage.getItem(CLAVE_STORAGE);
      const parsed = crudo ? JSON.parse(crudo) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function guardarLocales(lista) {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(lista));
    } catch (e) {
      alert("El almacenamiento local del navegador está lleno. Exporta tus reportes en JSON para respaldarlos.");
    }
  }

  function combinarYRecalcular() {
    const vistos = new Set();
    const combinados = [];

    reportesBase.forEach(function (r) {
      if (r && r.id && !vistos.has(r.id)) {
        vistos.add(r.id);
        combinados.push(r);
      }
    });

    reportesLocales.forEach(function (r) {
      if (r && r.id && !vistos.has(r.id)) {
        vistos.add(r.id);
        combinados.push(r);
      }
    });

    todosLosReportes = window.Criticidad.recalcularTodos(combinados, viasData, criteriosData);
    mostrarAvisoDatos();
  }

  // Avisa en pantalla si algún reporte se omitió por datos inválidos (por ejemplo, una cuadra que no está en vias.json).
  function mostrarAvisoDatos() {
    const el = document.getElementById("aviso-datos");
    if (!el) return;
    const errores = window.Criticidad.obtenerErrores();
    if (errores.length === 0) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.textContent = "Atención: " + errores.length + " reporte(s) omitido(s) por datos inválidos: " +
      errores.map(function (e) { return e.id + " (" + e.mensaje + ")"; }).join("; ");
  }

  function resolverRutaFoto(foto) {
    if (!foto) return "";
    if (foto.startsWith("data:") || foto.startsWith("http") || foto.startsWith("datos/")) {
      return foto;
    }
    return "datos/" + foto;
  }

  function mostrarDetalle(r) {
    const contenedor = document.getElementById("detalle");
    const c = r.criticidad || { puntaje: 0, nivel: "Bajo", desglose: {} };
    const d = c.desglose || {};
    const rutaFoto = resolverRutaFoto(r.foto);

    let htmlFoto = '<p class="sin-foto">Sin fotografía adjunta.</p>';
    if (rutaFoto) {
      htmlFoto =
        '<div class="foto-detalle">' +
        '<img id="img-evidencia-detalle" src="' + escaparHtml(rutaFoto) + '" alt="Evidencia ' + escaparHtml(r.id) + '">' +
        "</div>";
    }

    contenedor.innerHTML =
      '<div class="detalle-tarjeta">' +
      '<div class="detalle-cabecera">' +
      "<strong>" + escaparHtml(r.id) + "</strong>" +
      '<span class="badge ' + escaparHtml(c.nivel.toLowerCase()) + '">' +
      escaparHtml(c.nivel) + " (" + c.puntaje + "/9)" +
      "</span>" +
      "</div>" +
      "<p><strong>Cuadra:</strong> " + escaparHtml(r.cuadra) + " (" + escaparHtml(d.tipo_via || "") + ")</p>" +
      "<p><strong>Categoría:</strong> " + escaparHtml(etiquetaCategoria(r.categoria)) + "</p>" +
      "<p><strong>Actor:</strong> " + escaparHtml(etiquetaActor(r.actor)) + "</p>" +
      (r.referencia ? "<p><strong>Referencia:</strong> " + escaparHtml(r.referencia) + "</p>" : "") +
      "<p><strong>Fecha y hora:</strong> " + escaparHtml(String(r.fecha_hora || "").replace("T", " ")) + " (" + escaparHtml(d.franja_horaria || "") + ")</p>" +
      '<p class="desglose"><strong>Cálculo:</strong> Categoría (' + (d.categoria || 0) + ") + Vía (" + (d.via || 0) + ") + Franja (" + (d.franja || 0) + ") = <strong>" + c.puntaje + " pts</strong></p>" +
      (r.observaciones ? "<p><strong>Observación:</strong> " + escaparHtml(r.observaciones) + "</p>" : "") +
      htmlFoto +
      "</div>";

    const imgEvidencia = document.getElementById("img-evidencia-detalle");
    if (imgEvidencia) {
      imgEvidencia.addEventListener("error", function () {
        if (!this.dataset.reintento && this.src.includes("datos/fotos/")) {
          this.dataset.reintento = "1";
          this.src = this.src.replace("datos/fotos/", "fotos/");
        } else if (this.parentElement) {
          this.parentElement.innerHTML =
            '<p class="sin-foto">Archivo de evidencia: ' +
            escaparHtml(r.foto) +
            " (coloca la foto anonimizada en datos/fotos/).</p>";
        }
      });
    }
  }

  function obtenerFiltrosActivos() {
    return {
      cuadra: document.getElementById("filtro-cuadra").value,
      franja: document.getElementById("filtro-franja").value,
      categoria: document.getElementById("filtro-categoria").value,
      actor: document.getElementById("filtro-actor").value,
      nivel: document.getElementById("filtro-nivel").value
    };
  }

  function actualizarCapasMapa(listaFiltrada) {
    const mostrarCalor = document.getElementById("toggle-calor").checked;
    const mostrarPuntos = document.getElementById("toggle-puntos").checked;

    // 1. Capa de calor (Leaflet.heat) ponderada por criticidad
    if (capaCalor) {
      mapa.removeLayer(capaCalor);
      capaCalor = null;
    }

    if (mostrarCalor && typeof L.heatLayer === "function" && listaFiltrada.length > 0) {
      const puntosCalor = listaFiltrada.map(function (r) {
        const intensidad = Math.max(0.25, ((r.criticidad && r.criticidad.puntaje) || 3) / 9);
        return [r.lat, r.lng, intensidad];
      });

      capaCalor = L.heatLayer(puntosCalor, {
        radius: 28,
        blur: 20,
        maxZoom: 18,
        gradient: { 0.3: "#2e8b57", 0.65: "#e08e0b", 1.0: "#c0392b" }
      }).addTo(mapa);
    }

    // 2. Capa de puntos individuales
    capaPuntos.clearLayers();
    if (mostrarPuntos) {
      listaFiltrada.forEach(function (r) {
        const nivel = (r.criticidad && r.criticidad.nivel) || "Bajo";
        const color = COLORES_NIVEL[nivel] || "#2e8b57";

        const marcador = L.circleMarker([r.lat, r.lng], {
          radius: 8,
          color: "#ffffff",
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.9
        });

        marcador.bindPopup(
          "<strong>" + escaparHtml(r.id) + "</strong> · " + escaparHtml(r.cuadra) + "<br>" +
          escaparHtml(etiquetaCategoria(r.categoria)) + "<br>" +
          "Criticidad: <strong>" + (r.criticidad ? r.criticidad.puntaje : 0) + " (" + escaparHtml(nivel) + ")</strong>"
        );

        marcador.on("click", function () {
          mostrarDetalle(r);
        });

        marcador.addTo(capaPuntos);
      });
    }
  }

  function actualizarContadoresYCategorias(listaFiltrada) {
    const stats = window.Filtros.calcularEstadisticas(listaFiltrada);
    document.getElementById("contador").textContent = stats.total;
    document.getElementById("conteo-alto").textContent = stats.porNivel.Alto;
    document.getElementById("conteo-medio").textContent = stats.porNivel.Medio;
    document.getElementById("conteo-bajo").textContent = stats.porNivel.Bajo;

    const listaCat = document.getElementById("desglose-categorias");
    listaCat.innerHTML =
      "<li><span>Invasión de andén</span><strong>" + stats.porCategoria.invasion_anden + " (" + stats.porcentajesCategoria.invasion_anden + "%)</strong></li>" +
      "<li><span>Doble fila / vía prohibida</span><strong>" + stats.porCategoria.doble_fila + " (" + stats.porcentajesCategoria.doble_fila + "%)</strong></li>" +
      "<li><span>Bloqueo rampa/cebra/paradero</span><strong>" + stats.porCategoria.bloqueo_rampa_cebra_paradero + " (" + stats.porcentajesCategoria.bloqueo_rampa_cebra_paradero + "%)</strong></li>";
  }

  function actualizarResumenOperativo(listaFiltrada) {
    const top5 = window.Resumen.generarResumenOperativo(listaFiltrada, viasData, criteriosData);
    const contenedor = document.getElementById("lista-resumen");

    if (top5.length === 0) {
      contenedor.innerHTML = '<p class="sin-foto">No hay reportes para los filtros actuales.</p>';
      return;
    }

    contenedor.innerHTML = top5.map(function (item) {
      return (
        '<article class="tarjeta-resumen">' +
        '<div class="resumen-top">' +
        '<span class="rank">#' + item.posicion + " " + escaparHtml(item.cuadra) + "</span>" +
        '<span class="puntaje-acum">' + item.puntajeAcumulado + " pts</span>" +
        "</div>" +
        '<p class="resumen-meta">' + item.totalReportes + " reportes · Vía " + escaparHtml(item.tipoVia) + " · Alto en pico: " + item.altoEnPico + "</p>" +
        '<p class="resumen-rec"><strong>Acción:</strong> ' + escaparHtml(item.recomendacion) + "</p>" +
        '<p class="resumen-regla">' + escaparHtml(item.regla) + "</p>" +
        "</article>"
      );
    }).join("");
  }

  function refrescarTablero() {
    const filtros = obtenerFiltrosActivos();
    const filtrados = window.Filtros.filtrarReportes(todosLosReportes, filtros);
    actualizarCapasMapa(filtrados);
    actualizarContadoresYCategorias(filtrados);
    actualizarResumenOperativo(filtrados);
  }

  function poblarSelectorFiltroCuadras() {
    const sel = document.getElementById("filtro-cuadra");
    sel.innerHTML = '<option value="todas">Todas las cuadras</option>';
    viasData.cuadras.forEach(function (c) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.id;
      sel.appendChild(opt);
    });
  }

  // Exportar todos los reportes visibles/guardados a JSON (RF-06)
  function exportarJson() {
    const datos = JSON.stringify(todosLosReportes, null, 2);
    const blob = new Blob([datos], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "reportes_unimagdalena_" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  }

  // Importar JSON desde otros celulares sin duplicar por id (RF-06 y CU-04)
  function importarJson(archivo) {
    const estadoImp = document.getElementById("estado-importacion");
    const lector = new FileReader();
    lector.onload = function (ev) {
      try {
        const entrantes = JSON.parse(ev.target.result);
        if (!Array.isArray(entrantes)) {
          throw new Error("El archivo JSON debe contener una lista de reportes.");
        }

        const idsExistentes = new Set(todosLosReportes.map(function (r) { return r.id; }));
        let agregados = 0;
        let duplicados = 0;

        entrantes.forEach(function (item) {
          if (!item || !item.id || typeof item.lat !== "number" || typeof item.lng !== "number") {
            return;
          }
          if (idsExistentes.has(item.id)) {
            duplicados += 1;
          } else {
            idsExistentes.add(item.id);
            reportesLocales.push(item);
            agregados += 1;
          }
        });

        guardarLocales(reportesLocales);
        combinarYRecalcular();
        refrescarTablero();

        estadoImp.textContent = "Importación lista: " + agregados + " nuevos, " + duplicados + " duplicados omitidos.";
        estadoImp.className = "estado-ok";
      } catch (err) {
        estadoImp.textContent = "Error al importar: " + err.message;
        estadoImp.className = "estado-error";
      }
    };
    lector.readAsText(archivo, "utf-8");
  }

  function configurarNavegacionVistas() {
    const botones = document.querySelectorAll(".tab-btn");
    const vistas = document.querySelectorAll(".vista-panel");

    botones.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const objetivo = btn.dataset.vista;
        botones.forEach(function (b) { b.classList.toggle("activa", b === btn); });
        vistas.forEach(function (v) { v.classList.toggle("activa", v.id === objetivo); });
        setTimeout(function () { mapa.invalidateSize(); }, 80);
      });
    });
  }

  // Carga inicial de datos desde datos/*.json
  Promise.all([
    fetch("datos/vias.json").then(function (r) { return r.json(); }),
    fetch("datos/criterios.json").then(function (r) { return r.json(); }),
    fetch("datos/reportes.json").then(function (r) { return r.json(); })
  ])
    .then(function (resultados) {
      viasData = resultados[0];
      criteriosData = resultados[1];
      reportesBase = resultados[2];
      reportesLocales = cargarLocales();

      poblarSelectorFiltroCuadras();
      combinarYRecalcular();
      refrescarTablero();

      if (todosLosReportes.length > 0) {
        const grupoBounds = L.latLngBounds(todosLosReportes.map(function (r) { return [r.lat, r.lng]; }));
        mapa.fitBounds(grupoBounds, { padding: [30, 30], maxZoom: 18 });
      }

      // Inicializar captura rápida (< 30 s)
      const controladorCaptura = window.Captura.inicializarCaptura({
        viasData: viasData,
        obtenerReportes: function () { return todosLosReportes; },
        alGuardarReporte: function (nuevo) {
          reportesLocales.push(nuevo);
          guardarLocales(reportesLocales);
          combinarYRecalcular();
          refrescarTablero();
          if (marcadorTemporalCaptura) {
            mapa.removeLayer(marcadorTemporalCaptura);
            marcadorTemporalCaptura = null;
          }
          const recienGuardado = todosLosReportes.find(function (x) { return x.id === nuevo.id; });
          if (recienGuardado) {
            mostrarDetalle(recienGuardado);
          }
        },
        alAlternarModoMapa: function (activo) {
          document.getElementById("mapa").classList.toggle("modo-seleccion", activo);
        }
      });

      mapa.on("click", function (ev) {
        if (controladorCaptura.esSeleccionMapaActiva()) {
          controladorCaptura.recibirClicMapa(ev.latlng.lat, ev.latlng.lng);
          if (marcadorTemporalCaptura) {
            mapa.removeLayer(marcadorTemporalCaptura);
          }
          marcadorTemporalCaptura = L.marker([ev.latlng.lat, ev.latlng.lng]).addTo(mapa);
        }
      });
    })
    .catch(function () {
      document.getElementById("detalle").textContent =
        "No se pudieron cargar los archivos JSON en datos/. Abre el proyecto con Live Server o GitHub Pages.";
    });

  // Eventos de filtros y controles
  ["filtro-cuadra", "filtro-franja", "filtro-categoria", "filtro-actor", "filtro-nivel"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", refrescarTablero);
  });

  document.getElementById("btn-limpiar-filtros").addEventListener("click", function () {
    document.getElementById("filtro-cuadra").value = "todas";
    document.getElementById("filtro-franja").value = "todas";
    document.getElementById("filtro-categoria").value = "todas";
    document.getElementById("filtro-actor").value = "todos";
    document.getElementById("filtro-nivel").value = "todos";
    refrescarTablero();
  });

  document.getElementById("toggle-calor").addEventListener("change", refrescarTablero);
  document.getElementById("toggle-puntos").addEventListener("change", refrescarTablero);

  document.getElementById("btn-exportar").addEventListener("click", exportarJson);
  document.getElementById("input-importar").addEventListener("change", function (ev) {
    const archivo = ev.target.files && ev.target.files[0];
    if (archivo) {
      importarJson(archivo);
      ev.target.value = "";
    }
  });

  document.getElementById("btn-imprimir").addEventListener("click", function () {
    window.print();
  });

  configurarNavegacionVistas();
})();

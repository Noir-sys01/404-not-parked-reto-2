// captura.js: formulario rápido de captura (< 30 s), geolocalización, selección en mapa y compresión de foto a max 800 px (RF-01 y CU-01).

(function (global) {
  "use strict";

  const ANCHO_MAX_FOTO = 800;
  let fotoComprimidaDataUrl = "";
  let seleccionMapaActiva = false;

  // Reduce cualquier imagen a un máximo de 800 px de ancho para no saturar localStorage (límite 5 MB)
  function comprimirImagen(archivo, callback) {
    const lector = new FileReader();
    lector.onload = function (ev) {
      const img = new Image();
      img.onload = function () {
        let ancho = img.width;
        let alto = img.height;
        if (ancho > ANCHO_MAX_FOTO) {
          alto = Math.round((alto * ANCHO_MAX_FOTO) / ancho);
          ancho = ANCHO_MAX_FOTO;
        }
        const canvas = document.createElement("canvas");
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, ancho, alto);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        callback(null, dataUrl, ancho, alto);
      };
      img.onerror = function () {
        callback(new Error("No se pudo procesar la imagen seleccionada."));
      };
      img.src = ev.target.result;
    };
    lector.onerror = function () {
      callback(new Error("No se pudo leer el archivo de imagen."));
    };
    lector.readAsDataURL(archivo);
  }

  function fechaHoraLocalActual() {
    const ahora = new Date();
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return (
      ahora.getFullYear() + "-" +
      pad(ahora.getMonth() + 1) + "-" +
      pad(ahora.getDate()) + "T" +
      pad(ahora.getHours()) + ":" +
      pad(ahora.getMinutes())
    );
  }

  // Sugiere automáticamente la cuadra más cercana a las coordenadas marcadas
  function sugerirCuadraCercana(lat, lng, reportesExistentes) {
    if (!Array.isArray(reportesExistentes) || reportesExistentes.length === 0) return null;
    let mejorCuadra = null;
    let menorDist = Infinity;

    reportesExistentes.forEach(function (r) {
      const dLat = r.lat - lat;
      const dLng = r.lng - lng;
      const dist2 = dLat * dLat + dLng * dLng;
      if (dist2 < menorDist) {
        menorDist = dist2;
        mejorCuadra = r.cuadra;
      }
    });
    return mejorCuadra;
  }

  function generarNuevoId(reportesExistentes) {
    let maxNum = 0;
    reportesExistentes.forEach(function (r) {
      const match = String(r.id || "").match(/^MP-(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    return "MP-" + String(maxNum + 1).padStart(3, "0");
  }

  function fijarCoordenadas(lat, lng, obtenerReportes) {
    const inputLat = document.getElementById("cap-lat");
    const inputLng = document.getElementById("cap-lng");
    const estadoUbic = document.getElementById("cap-ubicacion-estado");
    const selCuadra = document.getElementById("cap-cuadra");

    inputLat.value = Number(lat).toFixed(6);
    inputLng.value = Number(lng).toFixed(6);
    estadoUbic.textContent = "Ubicación lista: " + inputLat.value + ", " + inputLng.value;
    estadoUbic.className = "estado-ok";

    const sugerida = sugerirCuadraCercana(Number(lat), Number(lng), obtenerReportes());
    if (sugerida && selCuadra) {
      selCuadra.value = sugerida;
    }
  }

  function inicializarCaptura(opciones) {
    const viasData = opciones.viasData;
    const obtenerReportes = opciones.obtenerReportes;
    const alGuardarReporte = opciones.alGuardarReporte;
    const alAlternarModoMapa = opciones.alAlternarModoMapa;

    const selCuadra = document.getElementById("cap-cuadra");
    const inputFechaHora = document.getElementById("cap-fecha-hora");
    const btnGps = document.getElementById("btn-gps");
    const btnPinMapa = document.getElementById("btn-pin-mapa");
    const inputFoto = document.getElementById("cap-foto");
    const previewFoto = document.getElementById("cap-foto-preview");
    const form = document.getElementById("form-captura");
    const msgCaptura = document.getElementById("cap-mensaje");

    // Llenar selector de cuadras desde vias.json
    if (selCuadra && viasData && Array.isArray(viasData.cuadras)) {
      selCuadra.innerHTML = "";
      viasData.cuadras.forEach(function (c) {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.id + " (" + c.tipo + ")";
        selCuadra.appendChild(opt);
      });
    }

    if (inputFechaHora) {
      inputFechaHora.value = fechaHoraLocalActual();
    }

    // Botón GPS del celular
    if (btnGps) {
      btnGps.addEventListener("click", function () {
        const estadoUbic = document.getElementById("cap-ubicacion-estado");
        if (!navigator.geolocation) {
          estadoUbic.textContent = "Este navegador no soporta GPS. Toca el punto en el mapa.";
          estadoUbic.className = "estado-error";
          return;
        }
        estadoUbic.textContent = "Obteniendo coordenadas GPS...";
        estadoUbic.className = "";
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            fijarCoordenadas(pos.coords.latitude, pos.coords.longitude, obtenerReportes);
          },
          function () {
            estadoUbic.textContent = "No se pudo leer el GPS. Usa 'Marcar en el mapa'.";
            estadoUbic.className = "estado-error";
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    }

    // Botón para tocar directamente sobre el mapa
    if (btnPinMapa) {
      btnPinMapa.addEventListener("click", function () {
        seleccionMapaActiva = !seleccionMapaActiva;
        btnPinMapa.classList.toggle("activo", seleccionMapaActiva);
        btnPinMapa.textContent = seleccionMapaActiva
          ? "Toca ahora la cuadra en el mapa..."
          : "Marcar en el mapa";
        if (typeof alAlternarModoMapa === "function") {
          alAlternarModoMapa(seleccionMapaActiva);
        }
      });
    }

    // Selección y compresión automática de foto
    if (inputFoto) {
      inputFoto.addEventListener("change", function (ev) {
        const archivo = ev.target.files && ev.target.files[0];
        if (!archivo) {
          fotoComprimidaDataUrl = "";
          previewFoto.innerHTML = "";
          return;
        }
        previewFoto.textContent = "Comprimiendo foto a máx. 800 px...";
        comprimirImagen(archivo, function (err, dataUrl, ancho, alto) {
          if (err) {
            fotoComprimidaDataUrl = "";
            previewFoto.textContent = err.message;
            return;
          }
          fotoComprimidaDataUrl = dataUrl;
          previewFoto.innerHTML =
            '<img src="' + dataUrl + '" alt="Vista previa comprimida">' +
            '<small>Foto lista y anonimizada (' + ancho + "×" + alto + " px)</small>";
        });
      });
    }

    // Envío del formulario (< 30 segundos)
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        const lat = parseFloat(document.getElementById("cap-lat").value);
        const lng = parseFloat(document.getElementById("cap-lng").value);
        const cuadra = selCuadra.value;
        const categoria = document.getElementById("cap-categoria").value;
        const actor = document.getElementById("cap-actor").value;
        const referencia = document.getElementById("cap-referencia").value.trim();
        const fechaHora = inputFechaHora.value || fechaHoraLocalActual();

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          msgCaptura.textContent = "Marca primero la ubicación con GPS o tocando el mapa.";
          msgCaptura.className = "estado-error";
          return;
        }

        const nuevoReporte = {
          id: generarNuevoId(obtenerReportes()),
          origen: "ciudadano",
          fecha_hora: fechaHora,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          cuadra: cuadra,
          categoria: categoria,
          actor: actor,
          referencia: referencia || "Reporte ciudadano en campo",
          observaciones: "",
          foto: fotoComprimidaDataUrl || ""
        };

        alGuardarReporte(nuevoReporte);

        // Reiniciar campos rápidos para permitir otro reporte inmediato
        form.reset();
        inputFechaHora.value = fechaHoraLocalActual();
        fotoComprimidaDataUrl = "";
        previewFoto.innerHTML = "";
        document.getElementById("cap-ubicacion-estado").textContent = "Sin ubicación marcada aún.";
        document.getElementById("cap-ubicacion-estado").className = "";
        seleccionMapaActiva = false;
        if (btnPinMapa) {
          btnPinMapa.classList.remove("activo");
          btnPinMapa.textContent = "Marcar en el mapa";
        }
        if (typeof alAlternarModoMapa === "function") {
          alAlternarModoMapa(false);
        }

        msgCaptura.textContent = "Reporte " + nuevoReporte.id + " guardado y agregado al mapa.";
        msgCaptura.className = "estado-ok";
      });
    }

    return {
      esSeleccionMapaActiva: function () { return seleccionMapaActiva; },
      recibirClicMapa: function (lat, lng) {
        if (!seleccionMapaActiva) return false;
        fijarCoordenadas(lat, lng, obtenerReportes);
        seleccionMapaActiva = false;
        if (btnPinMapa) {
          btnPinMapa.classList.remove("activo");
          btnPinMapa.textContent = "Marcar en el mapa";
        }
        if (typeof alAlternarModoMapa === "function") {
          alAlternarModoMapa(false);
        }
        return true;
      }
    };
  }

  global.Captura = {
    comprimirImagen: comprimirImagen,
    inicializarCaptura: inicializarCaptura
  };
})(window);

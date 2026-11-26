// captura.js: ubicación, validación del formulario, foto reducida y guardado.
// Usa calcularCriticidad (criticidad.js) para poner puntaje y nivel al reporte.

const CENTRO = [11.2223, -74.1865];            // PROVISIONAL: igual que en mapa.js
const CLAVE_LOCAL = "reportes_nuevos";          // misma clave que lee mapa.js
const ANCHO_MAX_FOTO = 800;                     // el reto pide máximo 800 px de ancho

let ubicacion = null;   // { lat, lng } cuando el usuario la marca
let vias = {};
let criterios = {};
let cuadras = {};              // datos/cuadras.json: punto central de cada cuadra
const RADIO_MAX_CUADRA = 80;     // metros: más lejos de esto no se adivina la cuadra

const mapa = L.map("mapa-captura").setView(CENTRO, 17);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: "&copy; OpenStreetMap"
}).addTo(mapa);
let marcador = null;

function marcar(lat, lng) {
  ubicacion = { lat: lat, lng: lng };
  if (marcador) { mapa.removeLayer(marcador); }
  marcador = L.marker([lat, lng]).addTo(mapa);
  document.getElementById("estado").textContent = "Ubicación marcada: " + lat.toFixed(5) + ", " + lng.toFixed(5);
  detectarCuadra(lat, lng);
}

// Busca la cuadra cuyo punto central queda más cerca de la ubicación marcada.
function detectarCuadra(lat, lng) {
  let mejor = null, distMejor = Infinity;
  for (const nombre in cuadras) {
    // Cada cuadra puede tener un solo punto {lat, lng} o una lista de puntos [{...}, {...}]
    const puntos = Array.isArray(cuadras[nombre]) ? cuadras[nombre] : [cuadras[nombre]];
    for (const punto of puntos) {
      const dx = (punto.lng - lng) * 111320 * Math.cos(lat * Math.PI / 180);
      const dy = (punto.lat - lat) * 110540;
      const dist = Math.sqrt(dx * dx + dy * dy);   // distancia aproximada en metros
      if (dist < distMejor) { distMejor = dist; mejor = nombre; }
    }
  }
  const estado = document.getElementById("estado");
  if (mejor && distMejor <= RADIO_MAX_CUADRA) {
    document.getElementById("cuadra").value = mejor;
    estado.textContent += " | Cuadra detectada: " + mejor + " (verifícala)";
  } else if (mejor) {
    estado.textContent += " | No se detectó la cuadra: elígela de la lista";
  }
}

mapa.on("click", function (e) { marcar(e.latlng.lat, e.latlng.lng); });

document.getElementById("btn-ubicacion").addEventListener("click", function () {
  if (!navigator.geolocation) { mostrar("Este navegador no permite usar la ubicación. Toca el mapa.", "error"); return; }
  navigator.geolocation.getCurrentPosition(function (pos) {
    marcar(pos.coords.latitude, pos.coords.longitude);
    mapa.setView([pos.coords.latitude, pos.coords.longitude], 18);
  }, function () {
    mostrar("No se pudo obtener la ubicación. Toca el mapa para marcarla.", "error");
  });
});

function mostrar(texto, tipo) {
  const m = document.getElementById("mensaje");
  m.textContent = texto;
  m.className = tipo;
}

// Fecha y hora local con el formato de reportes.json: "2026-11-18T11:40"
function ahoraLocal() {
  const d = new Date();
  const p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

// Reduce la foto a máximo 800 px de ancho y la convierte a JPEG comprimido.
function comprimirFoto(archivo) {
  return new Promise(function (resolver, rechazar) {
    const lector = new FileReader();
    lector.onerror = rechazar;
    lector.onload = function () {
      const img = new Image();
      img.onerror = rechazar;
      img.onload = function () {
        const escala = Math.min(1, ANCHO_MAX_FOTO / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolver(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

function guardar(reporte) {
  let lista = [];
  try { lista = JSON.parse(localStorage.getItem(CLAVE_LOCAL)) || []; } catch (e) { lista = []; }
  lista.push(reporte);
  localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista)); // puede fallar si el almacenamiento se llena
}

async function enviar() {
  const cuadra = document.getElementById("cuadra").value;
  const categoria = document.getElementById("categoria").value;
  const actor = document.getElementById("actor").value;
  const archivo = document.getElementById("foto").files[0];

  // Validación: faltan datos obligatorios
  if (!ubicacion) { mostrar("Falta marcar la ubicación.", "error"); return; }
  if (!cuadra || !categoria || !actor) { mostrar("Falta elegir cuadra, categoría y actor.", "error"); return; }

  const reporte = {
    id: "CIU-" + Date.now(),
    origen: "ciudadano",
    fecha_hora: ahoraLocal(),
    lat: ubicacion.lat,
    lng: ubicacion.lng,
    cuadra: cuadra,
    categoria: categoria,
    actor: actor
  };
  reporte.criticidad = calcularCriticidad(reporte, vias, criterios);

  if (archivo) {
    try { reporte.foto = await comprimirFoto(archivo); } catch (e) { /* si falla, se envía sin foto */ }
  }

  try {
    guardar(reporte);
  } catch (e) {
    delete reporte.foto;          // seguramente el almacenamiento se llenó: se reintenta sin foto
    try { guardar(reporte); } catch (e2) { mostrar("No se pudo guardar el reporte (almacenamiento lleno).", "error"); return; }
  }
  mostrar("Reporte guardado. Criticidad: " + reporte.criticidad.puntaje + " (" + reporte.criticidad.nivel + ").", "ok");
  document.getElementById("categoria").value = "";
  document.getElementById("actor").value = "";
  document.getElementById("foto").value = "";
}

document.getElementById("btn-enviar").addEventListener("click", enviar);

// Carga las reglas y la lista de cuadras (vias.json) para llenar el selector.
Promise.all([
  fetch("datos/vias.json").then(function (r) { return r.json(); }),
  fetch("datos/criterios.json").then(function (r) { return r.json(); }),
  // cuadras.json es opcional: si no existe, la cuadra se elige a mano
  fetch("datos/cuadras.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
]).then(function (datos) {
  vias = datos[0];
  criterios = datos[1];
  cuadras = datos[2];
  const select = document.getElementById("cuadra");
  Object.keys(vias).sort().forEach(function (c) {
    const op = document.createElement("option");
    op.value = c; op.textContent = c;
    select.appendChild(op);
  });
}).catch(function (error) {
  mostrar("No se pudieron cargar los datos (" + error.message + "). Abre la página con Live Server.", "error");
});

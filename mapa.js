// mapa.js: crea el mapa, conecta los módulos de lógica y dibuja.
// Orden de carga en index.html: leaflet, leaflet-heat, criticidad.js, filtros.js, resumen.js, mapa.js

// ATENCION: coordenadas PROVISIONALES del centro de la zona. Verificar en Google Maps.
const CENTRO = [11.2223, -74.1865];
const ZOOM_INICIAL = 17;
const COLORES = { Alto: "#c0392b", Medio: "#e08e0b", Bajo: "#2e8b57" };
// Clave donde captura.js guarda los reportes nuevos del navegador (ponerse de acuerdo con quien la escriba).
const CLAVE_LOCAL = "reportes_nuevos";

const mapa = L.map("mapa").setView(CENTRO, ZOOM_INICIAL);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(mapa);

const capaPuntos = L.layerGroup().addTo(mapa);
let capaCalor = null;

let todos = [];      // todos los reportes (precargados + localStorage), ya con criticidad
let criterios = {};  // contenido de criterios.json

function mostrarDetalle(r) {
  document.getElementById("detalle").innerHTML =
    "<strong>" + r.id + "</strong><br>" +
    "Cuadra: " + r.cuadra + "<br>" +
    "Categoría: " + r.categoria + "<br>" +
    "Actor: " + r.actor + "<br>" +
    "Fecha y hora: " + r.fecha_hora.replace("T", " ") + "<br>" +
    "Criticidad: " + r.criticidad.puntaje + " (" + r.criticidad.nivel + ")";
}

// Lee los filtros que el usuario eligió en el panel.
function leerFiltros() {
  return {
    cuadra: document.getElementById("f-cuadra").value,
    franja: document.getElementById("f-franja").value,
    categoria: document.getElementById("f-categoria").value,
    actor: document.getElementById("f-actor").value
  };
}

function dibujarPuntos(reportes) {
  capaPuntos.clearLayers();
  reportes.forEach(function (r) {
    const color = COLORES[r.criticidad.nivel] || "#777";
    L.circleMarker([r.lat, r.lng], { radius: 9, color: color, fillColor: color, fillOpacity: 0.8 })
      .addTo(capaPuntos)
      .on("click", function () { mostrarDetalle(r); });
  });
}

// Mapa de calor: la intensidad de cada punto depende de su puntaje (máximo 9).
function dibujarCalor(reportes) {
  if (capaCalor) { mapa.removeLayer(capaCalor); }
  const puntos = reportes.map(function (r) { return [r.lat, r.lng, r.criticidad.puntaje / 9]; });
  capaCalor = L.heatLayer(puntos, { radius: 28, blur: 22, maxZoom: 18 });
  if (document.getElementById("ver-calor").checked) { capaCalor.addTo(mapa); }
}

function dibujarResumen(reportes) {
  const lista = document.getElementById("resumen");
  const top = resumenOperativo(reportes, criterios, 5);
  if (top.length === 0) { lista.innerHTML = "<li>No hay reportes con estos filtros.</li>"; return; }
  lista.innerHTML = top.map(function (c) {
    return "<li><strong>" + c.cuadra + "</strong> (" + c.puntajeTotal + " pts, " + c.numReportes + " reportes)<br>" +
           c.recomendacion + "<br><small>Regla: " + c.regla + "</small></li>";
  }).join("");
}

// Se llama cada vez que cambia un filtro o un interruptor: filtra y redibuja todo.
function actualizar() {
  const filtrados = filtrarReportes(todos, leerFiltros(), criterios);
  document.getElementById("contador").textContent = filtrados.length;
  dibujarPuntos(filtrados);
  dibujarCalor(filtrados);
  dibujarResumen(filtrados);
  if (document.getElementById("ver-puntos").checked) { capaPuntos.addTo(mapa); } else { mapa.removeLayer(capaPuntos); }
}

// Llena el selector de cuadras con las que aparecen en los datos.
function llenarCuadras() {
  const select = document.getElementById("f-cuadra");
  const cuadras = [];
  todos.forEach(function (r) { if (cuadras.indexOf(r.cuadra) === -1) { cuadras.push(r.cuadra); } });
  cuadras.sort().forEach(function (c) {
    const op = document.createElement("option");
    op.value = c; op.textContent = c;
    select.appendChild(op);
  });
}

// Junta los reportes precargados con los guardados en este navegador, sin repetir ids.
function unirReportes(precargados) {
  let locales = [];
  try { locales = JSON.parse(localStorage.getItem(CLAVE_LOCAL)) || []; } catch (e) { locales = []; }
  const porId = {};
  precargados.concat(locales).forEach(function (r) { porId[r.id] = r; });
  return Object.values(porId);
}

function leerJson(ruta) {
  return fetch(ruta).then(function (resp) { return resp.json(); });
}

Promise.all([
  leerJson("datos/reportes_prueba.json"),
  leerJson("datos/vias.json"),
  leerJson("datos/criterios.json")
]).then(function (datos) {
  criterios = datos[2];
  todos = unirReportes(datos[0]);
  // La criticidad se calcula siempre con criticidad.js, así coincide con las reglas actuales.
  todos.forEach(function (r) { r.criticidad = calcularCriticidad(r, datos[1], criterios); });
  llenarCuadras();
  ["f-cuadra", "f-franja", "f-categoria", "f-actor", "ver-puntos", "ver-calor"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", actualizar);
  });
  document.getElementById("btn-imprimir").addEventListener("click", function () { window.print(); });
  actualizar();
}).catch(function (error) {
  document.getElementById("detalle").textContent =
    "No se pudieron cargar los datos (" + error.message + "). Abre la página con Live Server y revisa que las cuadras de los reportes estén en vias.json.";
});

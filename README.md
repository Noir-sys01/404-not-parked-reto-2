# [ 404 not parked] - Reto 2

Aplicación web para reportar mal parqueo e invasión del espacio público, calcular su índice de criticidad y visualizar zonas de reincidencia en el entorno de la **Universidad del Magdalena** (Santa Marta).

## Integrantes y roles
| Integrante | Rol |
|---|---|
| Juan Vilardy | Integrador del mapa e instrucciones para la IA y Analista de campo y privacidad |
| Joel Ariza | Ingeniero de lógica y clasificación |
| Yoan Ariza | Diseñador de interfaz y documentador |

## Prototipo publicado
https://noir-sys01.github.io/404-not-parked-reto-2/

## Estructura del proyecto
* `index.html` — Interfaz principal con dos vistas: **Tablero y Mapa** y **Captura rápida (< 30 s)**.
* `estilos.css` — Estilos responsivos (celular/escritorio) y hoja de impresión para el resumen operativo.
* `criticidad.js` — Cálculo del índice de criticidad a partir de `datos/vias.json` y `datos/criterios.json`.
* `filtros.js` — Filtrado dinámico por cuadra, franja horaria, categoría, actor y nivel, más porcentajes por categoría.
* `resumen.js` — Agrupación por cuadra, ranking Top 5 por puntaje acumulado y recomendaciones con reglas explícitas.
* `captura.js` — Formulario móvil con GPS, selección directa en mapa y compresión de imágenes a máx. 800 px de ancho.
* `mapa.js` — Mapa base OpenStreetMap, capa de calor (`Leaflet.heat`), puntos individuales, `localStorage` y exportar/importar JSON sin duplicados.
* `datos/vias.json` — Clasificación confirmada de las 5 cuadras (`29H3 - tramo 1`, `29H3 - tramo 2`, `29H3 - tramo 3` como `arterial`; `29I` y `29I1` como `secundaria`).
* `datos/criterios.json` — Pesos por categoría, tipo de vía y franja horaria, rangos de criticidad y horas pico.
* `datos/reportes.json` — 37 registros reales levantados en campo (`MP-001` a `MP-037`).
* `datos/fotos/` — Carpeta para las 37 fotografías anonimizadas (`mp-001.jpeg` a `mp-037.jpeg`).
* `documentos/` — Carpeta para los entregables PDF (anexo de evidencia de campo, diagrama de arquitectura y bitácora de ingeniería).

## Cómo abrirlo localmente
1. Abrir la carpeta del proyecto en **Visual Studio Code**.
2. Hacer clic derecho sobre `index.html` y elegir **"Open with Live Server"** (necesario para que `fetch()` lea los archivos de `datos/`).
3. Antes de publicar en GitHub Pages, copiar las 37 fotos anonimizadas (`mp-001.jpeg` a `mp-037.jpeg`) dentro de `datos/fotos/`.

## IA utilizada
* **Claude (Anthropic):** Apoyo en la etapa inicial para el análisis de los requerimientos funcionales (RF-01 a RF-06), la estructura preliminar del prototipo, el planteamiento de los criterios de criticidad y la preparación inicial del levantamiento de datos en campo.
* **Gemini (Google):** Verificación geográfica de las 37 coordenadas en el entorno de la Universidad del Magdalena, corrección y completado de la planilla de campo (`planilla_de_campo_final_v2.xlsx`), generación de los archivos JSON (`vias.json`, `criterios.json`, `reportes.json`) y desarrollo modular del código web (`index.html`, `estilos.css`, `mapa.js`, `captura.js`, `criticidad.js`, `filtros.js` y `resumen.js`).

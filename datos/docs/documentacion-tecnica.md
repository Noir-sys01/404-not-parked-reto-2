# Documentación técnica
## 404-not-parked — Universidad del Magdalena

## Introducción y problema
El mal estacionamiento y la ocupación del espacio público dificultan la movilidad en el entorno universitario de Santa Marta. El prototipo organiza reportes georreferenciados para facilitar su análisis.

## Objetivo
Registrar, visualizar y analizar incidentes mediante herramientas web. Facilitar la geolocalización, clasificación, evidencia opcional y reconocimiento de concentraciones de reportes.

## Arquitectura y tecnologías
HTML estructura la interfaz; CSS define la presentación; JavaScript gestiona eventos y datos; Leaflet administra el mapa y OpenStreetMap proporciona cartografía. JSON representa datos de prueba en los archivos previos. Véase [arquitectura](arquitectura.md).

## Interfaz observada
Panel lateral con formulario, GPS o selección manual, coordenadas, tramo, categoría, actor, referencia, fecha y hora, foto opcional y botón de guardado. El mapa presenta marcadores y mapa de calor.

## Privacidad
La captura solicita foto anonimizada (máximo 800 px). Se requiere ocultar placas y rostros. La versión V4 anterior utiliza Tesseract.js para buscar patrones de placas y permite corrección manual; no se confirma que esa lógica esté integrada en la versión de la captura.

## Limitaciones y pruebas
Verificar permisos GPS, campos inválidos, carga de mapas, persistencia tras recarga, anonimización, tamaño de imagen, accesibilidad y tiempo de registro. La base de datos, autenticación y código final no están confirmados. La V4 anterior guarda localmente y no implementa mapa de calor ni botón GPS; no debe confundirse con la captura final.

## Conclusión
El prototipo permite explorar el uso de información geográfica para apoyar el análisis de movilidad; no acredita una reducción efectiva del mal parqueo.

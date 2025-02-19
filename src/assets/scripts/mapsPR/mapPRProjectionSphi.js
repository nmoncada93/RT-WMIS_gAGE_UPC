import {
  coordinateAxes,
  drawAxisLabels,
  drawColorBar,
  paintGrid,
} from "./mapPRVisualSphi.js";

import { getSelectedMapDate } from "./mapsPRCalendar.js"; // ✅ Importar función faltante
import { fetchIgpSphiData } from "./mapsPRController.js";

// [A] Configuración inicial ---------------------------------------------------
const width = 1150;
const height = 600;
const gridSize = 2; // Tamaño de las celdas de la cuadrícula en grados

// [A.1] Configuración de la proyección
const projection = d3
  .geoEquirectangular()
  .scale(150)
  .translate([width / 2, height / 2]); // Centra la proyección

// [A.2] Generador de rutas para GeoJSON
const pathGenerator = d3.geoPath().projection(projection);

// [A.3] Contenedor SVG
const svg = d3
  .select("#sphiMapPRRender") // ✅ ID corregido según el HTML
  .attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

// [B] Inicializa el mapa con datos históricos ----------------------------------
async function initHistoricalMap(year, doy) {
  try {
    // Carga datos del mundo en formato GeoJSON
    const worldData = await loadWorldData();

    // Dibuja países en el mapa
    drawCountries(worldData);

    // Dibuja graticula (coordenadas X Y)
    coordinateAxes(projection, svg);

    // Agrega etiquetas de ejes
    drawAxisLabels(svg, width, height);

    // Dibuja barra de colores
    drawColorBar(svg, width, height);

    // Genera la cuadrícula 2x2 grados
    const gridData = generateGridData(projection, gridSize);

    // Obtiene datos SPHI desde el controlador
    const dynamicData = await fetchIgpSphiData(year, doy);

    if (!dynamicData) {
      console.error("No se pudieron cargar los datos históricos de SPHI...");
      return;
    }

    // Pinta la cuadrícula con datos dinámicos
    paintGrid(gridData, dynamicData, svg);

    // Hace visible el botón "Reset" al cargar el mapa
    const resetButton = document.getElementById("closeSphiMapPRBtn"); // ✅ ID corregido
    resetButton.style.display = "block";
  } catch (error) {
    console.error("Error al inicializar el mapa histórico:", error);
  }
}

// [C] Carga datos del mapa --------------------------------------------------
async function loadWorldData() {
  try {
    return await d3.json(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    );
  } catch (error) {
    throw new Error("Error al cargar el GeoJSON del mapa...");
  }
}

// [D] Dibuja países ---------------------------------------------------------
function drawCountries(worldData) {
  svg
    .selectAll("path")
    .data(worldData.features)
    .join("path")
    .attr("d", pathGenerator)
    .attr("fill", "#dcdcdc") // Color gris para los países
    .attr("stroke", "black"); // Bordes países
}

// [E] Genera datos de la cuadrícula -----------------------------------------
function generateGridData(projection, gridSize) {
  const gridData = [];
  for (let lon = -180; lon < 180; lon += gridSize) {
    for (let lat = -90; lat < 90; lat += gridSize) {
      const topLeft = projection([lon, lat]);
      const bottomRight = projection([lon + gridSize, lat - gridSize]);

      if (topLeft && bottomRight) {
        gridData.push({
          x: topLeft[0],
          y: topLeft[1],
          width: bottomRight[0] - topLeft[0],
          height: bottomRight[1] - topLeft[1],
          Longitude: lon,
          Latitude: lat,
        });
      }
    }
  }
  return gridData;
}

// [F] Detiene mapa y limpia -------------------------------------------------
function resetMap() {
  console.log("Reseteando el mapa de SPHI...");

  // [F.1] Limpia el contenido del mapa
  svg.selectAll("*").remove();

  // [F.2] Oculta el contenedor del mapa
  const mapContainer = document.getElementById("sphiMapPRContainer"); // ✅ ID corregido
  if (mapContainer) {
    mapContainer.style.display = "none";
  } else {
    console.error("No se encontró el contenedor del mapa...");
  }
}

// [G] Inicia el mapa histórico al pulsar el botón ---------------------------
document.getElementById("sphiMapPRBtn").addEventListener("click", async () => {
  try {
    // [G.1] Muestra el contenedor del mapa
    const mapContainer = document.getElementById("sphiMapPRContainer"); // ✅ ID corregido
    mapContainer.style.display = "block";

    // [G.2] Obtiene la fecha seleccionada desde el calendario
    const dateInput = document.getElementById("dateInputMaps").value;
    if (!dateInput) {
      console.error("Por favor selecciona una fecha antes de iniciar el mapa.");
      return;
    }

    const { year, doy } = getSelectedMapDate(dateInput);
    console.log(
      `Inicializando mapa histórico para SPHI - Año: ${year}, DoY: ${doy}`
    );

    // [G.3] Inicializa el mapa con los datos históricos
    await initHistoricalMap(year, doy);
  } catch (error) {
    console.error("Error al iniciar el mapa histórico:", error);
  }
});

// [H] Detiene el mapa histórico al pulsar el botón "Reset" ------------------
document
  .getElementById("closeSphiMapPRBtn") // ✅ ID corregido
  .addEventListener("click", () => {
    resetMap();
  });

// [Z] Finalización del script -----------------------------------------------
console.log("Script mapPRProjectionSphi.js cargado correctamente.");

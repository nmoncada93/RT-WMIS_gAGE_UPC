import { fetchIgpS4Data } from './mapRTController.js';
import { coordinateAxes, drawAxisLabels, drawColorBar, paintGrid } from './mapRTVisualS4.js';

// [A] Configuración inicial ---------------------------------------------------
const width = 1100;
const height = 580;
const gridSize = 2; // Tamaño de las celdas de la cuadricula en grados

// [A.1] Configura la proyección
const projection = d3.geoEquirectangular()
    .scale(150)
    .translate([width / 2, (height / 2)]); // Centra la proyeccion

// [A.2] Generador de rutas para GeoJSON
const pathGenerator = d3.geoPath().projection(projection);

// [A.3] Contenedor SVG
const svg = d3.select("#s4MapRender")
    //.attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
    .attr("viewBox", `0 0 ${width} ${height+80}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// [A.4] Variable global para el ID del intervalo
let intervalId;

// [B] Inicializa mapa ------------------------------------------------
async function initMap(fetchDataFunction) {
    handlerSpinnerS4Map(true);
    toggleConnectionAlert(false);
    try {
        // Carga datos del mundo en formato GeoJSON
        const worldData = await loadWorldData();

        // Dibuja paises en el mapa
        drawCountries(worldData);

        // Dibuja grilla (coordenadas X Y)
        coordinateAxes(projection, svg);

        // Agrega etiquetas de ejes
        drawAxisLabels(svg, width, height);

        // Dibuja barra de colores
        drawColorBar(svg, width, height);

        // Genera la cuadricula 2x2 grados
        const gridData = generateGridData(projection, gridSize);

        // Obtiene datos dinámicos desde el backend
        const dynamicData = await fetchDataFunction();

        if (!dynamicData) {
            updateStatusLedS4(false); // ❌
            console.error("No se pudieron cargar los datos...");
            handlerSpinnerS4Map(false);
            toggleConnectionAlert(true);
            return;
        }
        // Pinta la cuadrícula con datos dinámicos
        paintGrid(gridData, dynamicData, svg, 'mean_s4');

        updateLastTimeLabelS4(dynamicData[0].TIME);
        updateStatusLedS4(true);  // ✅

        // Inicia actualización en tiempo real
        startRealTimeUpdates(gridData, fetchDataFunction);

        // Hace visible el botón "Reset" al cargar el mapa
        const resetButton = document.getElementById("closeS4MapBtn");
        resetButton.style.display = "block";
        handlerSpinnerS4Map(false);

    } catch (error) {
        console.error("Error al inicializar el mapa:", error);
        handlerSpinnerS4Map(false);
        toggleConnectionAlert(true);
    }
}

// [C] Carga datos del mapa --------------------------------------------------
async function loadWorldData() {
    try {
        return await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
    } catch (error) {
        throw new Error("Error al cargar el GeoJSON del mapa...");
    }
}

// [D] Dibuja paises ---------------------------------------------------------
function drawCountries(worldData) {
    svg.selectAll("path")
        .data(worldData.features)
        .join("path")
        .attr("d", pathGenerator)
        .attr("fill", "#dcdcdc") // Color gris para los paises
        .attr("stroke", "black"); // Bordes paises

    
}

// [E] Genera datos de la cuadricula -----------------------------------------
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

// [Z] Actualizacion en tiempo real ------------------------------------------
function startRealTimeUpdates(gridData, fetchDataFunction) {
    intervalId = setInterval(async () => {
        try {
            const dynamicData = await fetchDataFunction();
            if (dynamicData) {
                paintGrid(gridData, dynamicData, svg);
                updateLastTimeLabelS4(dynamicData[0].TIME);
                updateStatusLedS4(true);  // ✅ LED
                toggleConnectionAlert(false);
            } else {
                updateStatusLedS4(false); // ❌ LED
                toggleConnectionAlert(true);
            }
        } catch (error) {
            console.error("Error durante el Real-Time", error);
            updateStatusLedS4(false); // ❌ LED
            toggleConnectionAlert(true);
        }
    }, 10000);

    // [Z.1] Detiene actualizaciones cuando se cierra la pagina
    window.addEventListener("beforeunload", () => {
        clearInterval(intervalId);
    });
}

// [X] Detiene mapa y limpia -------------------------------------------------
function resetMap() {
    // [X.1] Detiene setInterval
    clearInterval(intervalId);
    console.log("Actualizaciones en stop");

    // [X.2] Limpia contenido del mapa
    svg.selectAll("*").remove();
    console.log("Mapa limpiado.");

      // [X.4] Oculta el contenedor del mapa
  const mapContainer = document.getElementById("s4MapContainer");
  if (mapContainer) {
      mapContainer.style.display = "none";
  } else {
      console.error("No se encontro el contenedor del mapa.");
  }
}

function updateStatusLedS4(isOk) {
  const led = document.getElementById("s4StatusLed");
  if (!led) return;

  led.classList.remove("statusLed--ok", "statusLed--error");

  if (isOk) {
    led.classList.add("statusLed--ok");
    led.title = "Receiving data";
  } else {
    led.classList.add("statusLed--error");
    led.title = "Connection error or no data";
  }
}

// [Y] Inicia mapa al pulsar el boton ----------------------------------------
document.getElementById("s4MapBtn").addEventListener("click", async () => {
    const mapContainer = document.getElementById("s4MapContainer");
    mapContainer.style.display = "block";
    await initMap(fetchIgpS4Data);
});

// [Y.2] Detiene mapa al pulsar el botón "Reset" ------------------------------
document.getElementById("closeS4MapBtn").addEventListener("click", () => {
    resetMap();
});

function updateLastTimeLabelS4(timeCode) {
  const p = document.getElementById("s4MapLastUpdate");
  if (!p) return;
  const hours = Math.floor(timeCode / 3600);
  const minutes = Math.floor((timeCode % 3600) / 60);
  p.textContent = `Displaying: ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} GPST`;
}

function handlerSpinnerS4Map(show) {
  const spinner = document.getElementById("spinnerS4MapRT");
  if (spinner) {
    spinner.style.display = show ? "flex" : "none";
    console.log(show ? "[S4 Map] Spinner ON" : "[S4 Map] Spinner OFF");
  }
}

// [X] Show or hide connection error message =======================================
function toggleConnectionAlert(show) {
  const alertBox = document.getElementById("alertConnectionLostMapsS4");
  if (!alertBox) return;
  alertBox.style.display = show ? "block" : "none";
}
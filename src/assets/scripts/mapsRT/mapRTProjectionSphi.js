import { fetchIgpSphiData } from './mapRTController.js';
import { coordinateAxes, drawAxisLabels, drawColorBar, paintGrid } from './mapRTVisualSphi.js';

// [A] Configuracion inicial ---------------------------------------------------
const width = 1100;
const height = 580;
const gridSize = 2; // Tamaño de las celdas de la cuadricula en grados

// [A.1] Configuracion de la proyeccion
const projection = d3.geoEquirectangular()
    .scale(150)
    .translate([width / 2, (height / 2)]); // Centra la proyeccion

// [A.2] Generador de rutas para GeoJSON
const pathGenerator = d3.geoPath().projection(projection);

// [A.3] Contenedor SVG
const svg = d3.select("#sphiMapRender")
    //.attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
    .attr("viewBox", `0 0 ${width} ${height+80}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// [A.4] Variable global para el ID del intervalo
let intervalId;

let currentGridData = null;
let currentDynamicData = null;

function setCurrentData(grid, dynamic) {
  currentGridData = grid;
  currentDynamicData = dynamic;
}

function getCurrentData() {
  return { currentGridData, currentDynamicData };
}

export { setCurrentData, getCurrentData };


// [B] Inicializa mapa ------------------------------------------------
async function initMap(fetchDataFunction) {
  handlerSpinnerSphiMap(true);
  toggleConnectionAlert(false);


  try {
      toggleConnectionAlert(false);
      // Carga datos del mundo en formato GeoJSON
      const worldData = await loadWorldData();

      // Dibuja paises en el mapa
      drawCountries(worldData);

      // Dibuja graticula (coordenadas X Y)
      coordinateAxes(projection, svg);

      // Agrega etiquetas de ejes
      drawAxisLabels(svg, width, height);

      // Dibuja barra de colores
      drawColorBar(svg, width, height);

      // Genera la cuadricula 2x2 grados
      const gridData = generateGridData(projection, gridSize);

      // Obtiene datos dinamicos desde el backend
      //const dynamicData = await fetchDataFunction();

currentGridData = gridData;
const dynamicData = await fetchDataFunction();
currentDynamicData = dynamicData;



      if (!dynamicData) {
          updateStatusLed(false); // ❌ LED
          console.error("[SPHI] ❌ Backend not available..");
          handlerSpinnerSphiMap(false); 
          toggleConnectionAlert(true); 
          return;
      }

      // Pinta la cuadricula con datos dinamicos
      paintGrid(gridData, dynamicData, svg);

      updateLastTimeLabel(dynamicData[0].TIME);
      updateStatusLed(true);  // ✅ LED 

      // Inicia actualizacion en tiempo real
      startRealTimeUpdates(gridData, fetchDataFunction);

      // Hace visible el botón "Reset" al cargar el mapa
      const resetButton = document.getElementById("closeSphiMapBtn");
      resetButton.style.display = "block";
      handlerSpinnerSphiMap(false); //
            
  } catch (error) {
      console.error("Error al inicializar el mapa:", error);
      handlerSpinnerSphiMap(false); 
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
              
            currentDynamicData = dynamicData;
              paintGrid(gridData, dynamicData, svg);
              updateLastTimeLabel(dynamicData[0].TIME);
              updateStatusLed(true);  // ✅ LED 
              toggleConnectionAlert(false); 

          } else {
              updateStatusLed(false); // ❌ LED 
              toggleConnectionAlert(true);
          }                
      } catch (error) {
          console.error("Error durante el Real-Time", error);
          updateStatusLed(false);  // ❌ LED 
          toggleConnectionAlert(true);
      }
  }, 3000);

  // [Z.1] Detiene actualizaciones cuando se cambia o cierra la pagina
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

  // [X.3] Oculta contenedor del mapa
  const mapContainer = document.getElementById("sphiMapContainer");
  if (mapContainer) {
    mapContainer.style.display = "none";
  } else {
    console.error("No se encontro el contenedor del mapa...");
  }
}

function updateStatusLed(isOk) {
  const led = document.getElementById("sphiStatusLed");
  if (!led) return;

  // Limpia primero
  led.classList.remove("statusLed--ok", "statusLed--error");

  // Aplica el estado correspondiente
  if (isOk) {
    led.classList.add("statusLed--ok");
    led.title = "Receiving data";
  } else {
    led.classList.add("statusLed--error");
    led.title = "Connection error or no data";
  }
}

// [Y] Inicia mapa al pulsar el boton ----------------------------------------
document.getElementById("sphiMapBtn").addEventListener("click", async () => {
    const mapContainer = document.getElementById("sphiMapContainer");
    mapContainer.style.display = "block";
    await initMap(fetchIgpSphiData);
});

// [Y.2] Detiene mapa al pulsar el boton "Reset" ------------------------------
document.getElementById("closeSphiMapBtn").addEventListener("click", () => {
    resetMap();
});

function updateLastTimeLabel(timeCode) {
  const p = document.getElementById("sphiMapLastUpdate");
  if (!p) return;

  const hours = Math.floor(timeCode / 3600);
  const minutes = Math.floor((timeCode % 3600) / 60);

  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");

  p.textContent = `Displaying: ${hh}:${mm} GPST`;
}

function handlerSpinnerSphiMap(show) {
  const spinner = document.getElementById("spinnerSphiMapRT");
  if (spinner) {
    spinner.style.display = show ? "flex" : "none";
    console.log(show ? "[SPHI Map] Spinner ON" : "[SPHI Map] Spinner OFF");
  }
}

// [X] Show or hide connection error message =======================================
function toggleConnectionAlert(show) {
  const alertBox = document.getElementById("alertConnectionLostMapsSphi");
  if (!alertBox) return;
  alertBox.style.display = show ? "block" : "none";
}



/*
import { fetchIgpSphiData } from './mapRTController.js';
import { coordinateAxes, drawAxisLabels, drawColorBar, paintGrid } from './mapRTVisualSphi.js';

// [A] Configuracion inicial ---------------------------------------------------
const width = 1100;
const height = 580;
const gridSize = 2; // Tamaño de las celdas de la cuadricula en grados

// [A.1] Configuracion de la proyeccion
const projection = d3.geoEquirectangular()
    .scale(150)
    .translate([width / 2, (height / 2)]); // Centra la proyeccion

// [A.2] Generador de rutas para GeoJSON
const pathGenerator = d3.geoPath().projection(projection);

// [A.3] Contenedor SVG
const svg = d3.select("#sphiMapRender")
    //.attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
    .attr("viewBox", `0 0 ${width} ${height+80}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// [A.4] Variable global para el ID del intervalo
let intervalId;

// [B] Inicializa mapa ------------------------------------------------
async function initMap(fetchDataFunction) {
  handlerSpinnerSphiMap(true);
  toggleConnectionAlert(false);
  try {
      toggleConnectionAlert(false);
      // Carga datos del mundo en formato GeoJSON
      const worldData = await loadWorldData();

      // Dibuja paises en el mapa
      drawCountries(worldData);

      // Dibuja graticula (coordenadas X Y)
      coordinateAxes(projection, svg);

      // Agrega etiquetas de ejes
      drawAxisLabels(svg, width, height);

      // Dibuja barra de colores
      drawColorBar(svg, width, height);

      // Genera la cuadricula 2x2 grados
      const gridData = generateGridData(projection, gridSize);

      // Obtiene datos dinamicos desde el backend
      const dynamicData = await fetchDataFunction();

      if (!dynamicData) {
          updateStatusLed(false); // ❌ LED
          console.error("[SPHI] ❌ Backend not available..");
          handlerSpinnerSphiMap(false); 
          toggleConnectionAlert(true); 
          return;
      }

      // Pinta la cuadricula con datos dinamicos
      paintGrid(gridData, dynamicData, svg);

      updateLastTimeLabel(dynamicData[0].TIME);
      updateStatusLed(true);  // ✅ LED 

      // Inicia actualizacion en tiempo real
      startRealTimeUpdates(gridData, fetchDataFunction);

      // Hace visible el botón "Reset" al cargar el mapa
      const resetButton = document.getElementById("closeSphiMapBtn");
      resetButton.style.display = "block";
      handlerSpinnerSphiMap(false); //
            
  } catch (error) {
      console.error("Error al inicializar el mapa:", error);
      handlerSpinnerSphiMap(false); 
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
              updateLastTimeLabel(dynamicData[0].TIME);
              updateStatusLed(true);  // ✅ LED 
              toggleConnectionAlert(false); 

          } else {
              updateStatusLed(false); // ❌ LED 
              toggleConnectionAlert(true);
          }                
      } catch (error) {
          console.error("Error durante el Real-Time", error);
          updateStatusLed(false);  // ❌ LED 
          toggleConnectionAlert(true);
      }
  }, 10000);

  // [Z.1] Detiene actualizaciones cuando se cambia o cierra la pagina
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

  // [X.3] Oculta contenedor del mapa
  const mapContainer = document.getElementById("sphiMapContainer");
  if (mapContainer) {
    mapContainer.style.display = "none";
  } else {
    console.error("No se encontro el contenedor del mapa...");
  }
}

function updateStatusLed(isOk) {
  const led = document.getElementById("sphiStatusLed");
  if (!led) return;

  // Limpia primero
  led.classList.remove("statusLed--ok", "statusLed--error");

  // Aplica el estado correspondiente
  if (isOk) {
    led.classList.add("statusLed--ok");
    led.title = "Receiving data";
  } else {
    led.classList.add("statusLed--error");
    led.title = "Connection error or no data";
  }
}

// [Y] Inicia mapa al pulsar el boton ----------------------------------------
document.getElementById("sphiMapBtn").addEventListener("click", async () => {
    const mapContainer = document.getElementById("sphiMapContainer");
    mapContainer.style.display = "block";
    await initMap(fetchIgpSphiData);
});

// [Y.2] Detiene mapa al pulsar el boton "Reset" ------------------------------
document.getElementById("closeSphiMapBtn").addEventListener("click", () => {
    resetMap();
});

function updateLastTimeLabel(timeCode) {
  const p = document.getElementById("sphiMapLastUpdate");
  if (!p) return;

  const hours = Math.floor(timeCode / 3600);
  const minutes = Math.floor((timeCode % 3600) / 60);

  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");

  p.textContent = `Displaying: ${hh}:${mm} GPST`;
}

function handlerSpinnerSphiMap(show) {
  const spinner = document.getElementById("spinnerSphiMapRT");
  if (spinner) {
    spinner.style.display = show ? "flex" : "none";
    console.log(show ? "[SPHI Map] Spinner ON" : "[SPHI Map] Spinner OFF");
  }
}

// [X] Show or hide connection error message =======================================
function toggleConnectionAlert(show) {
  const alertBox = document.getElementById("alertConnectionLostMapsSphi");
  if (!alertBox) return;
  alertBox.style.display = show ? "block" : "none";
}

*/


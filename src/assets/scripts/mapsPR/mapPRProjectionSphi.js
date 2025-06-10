//import * as d3 from "d3";

import {
  coordinateAxes,
  drawAxisLabels,
  drawColorBar,
  paintGrid,
} from "./mapPRVisualSphi.js";



//import { getSelectedMapDate } from "./mapsPRCalendar.js";
import { fetchIgpSphiData, getSphiBlockByHourAndMinute } from "./mapsPRController.js";

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
  .select("#sphiMapPRRender")
  .attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

// [A.4] Cuadrícula mundial (global para poder reutilizarla)
const gridData = generateGridData(projection, gridSize);

// [B] Genera datos de la cuadrícula -----------------------------------------
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

// [C] Carga datos del mapa --------------------------------------------------
async function loadWorldData() {
  try {
    return await d3.json(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    );
  } catch (error) {
    throw new Error("Error loading GeoJSON for the map...");
  }
}

// [D] Dibuja países ---------------------------------------------------------
function drawCountries(worldData) {
  svg
    .selectAll("path")
    .data(worldData.features)
    .join("path")
    .attr("d", pathGenerator)
    .attr("fill", "#dcdcdc")
    .attr("stroke", "black");
}

// [E] FUNCION CENTRAL: Actualiza el mapa segun selects ----------------------
function updateMapForSelection() {
  // Lee valores seleccionados
  const hourSelect = document.getElementById("hourSelectPR");
  const blockSelect = document.getElementById("blockSelectPR");
  const selectedHour = parseInt(hourSelect.value, 10);
  const selectedBlock = parseInt(blockSelect.value, 10);

  // Obtén el bloque de datos correspondiente
  const blockData = getSphiBlockByHourAndMinute(selectedHour, selectedBlock);

  // Borra la cuadrícula antes de dibujar
  svg.selectAll(".gridCellSphi").remove();

  // Dibuja el bloque si hay datos
  if (blockData && blockData.data && blockData.data.length > 0) {
    paintGrid(gridData, [blockData], svg);
    console.log(`Plotting hour: ${selectedHour}, and minutes: ${selectedBlock} (${String(selectedHour).padStart(2, "0")}:${String(selectedBlock*10).padStart(2, "0")})`);
  } else {
    console.warn("Data not available.");
  }

  // [NEW] Mostrar mensaje debajo del mapa
  const msgDiv = document.getElementById("mapMessagePR");
  const selectedDate = document.getElementById("dateInputMaps").value;
  const horaTxt = selectedHour.toString().padStart(2, "0");
  const minTxt = (selectedBlock * 10).toString().padStart(2, "0");

  if (blockData && blockData.data && blockData.data.length > 0) {
    msgDiv.textContent = `Displaying: ${selectedDate} at ${horaTxt}:${minTxt} UTC`;
  } else {
    msgDiv.textContent = `Data not available for ${selectedDate} at ${horaTxt}:${minTxt} UTC.`;
  }

}

// [F] Inicializa mapa con datos y listeners ------------------------------
document.getElementById("sphiMapPRBtn").addEventListener("click", async () => {
  try {
    const mapContainer = document.getElementById("sphiMapPRContainer");
    mapContainer.style.display = "block";
    document.getElementById("hourButtonsPR").classList.add("hourButtonsContainer--visible");


    // Obtén la fecha seleccionada
    const dateInput = document.getElementById("dateInputMaps").value;
    if (!dateInput) {
      console.error("Please select a date before starting the map.");
      return;
    }
    //const { year, doy } = getSelectedMapDate(dateInput);

    // 1. Carga datos SPHI (esto llena el objeto global del controller)
    //await fetchIgpSphiData(year, doy);

    // 2. Carga y dibuja el fondo del mapa y decoración
    const worldData = await loadWorldData();
    drawCountries(worldData);
    coordinateAxes(projection, svg);
    drawAxisLabels(svg, width, height);
    drawColorBar(svg, width, height);

    // 3. Dibuja el bloque actual según selects
    updateMapForSelection();

    // 4. Listeners para selects (pueden ponerse fuera si no quieres duplicar)
    const hourSelect = document.getElementById("hourSelectPR");
    const blockSelect = document.getElementById("blockSelectPR");
    hourSelect.addEventListener("change", updateMapForSelection);
    blockSelect.addEventListener("change", updateMapForSelection);

    // 5. Hace visible el botón "Reset"
    const resetButton = document.getElementById("closeSphiMapPRBtn");
    if (resetButton) resetButton.style.display = "block";
  } catch (error) {
    console.error("Error starting historical map:", error);
  }
});


// [H] Limpia todo el mapa ---------------------------------------------------
function resetMap() {
  console.log("Resetting map");
  svg.selectAll("*").remove();
  document.getElementById("hourButtonsPR").classList.remove("hourButtonsContainer--visible");
  const mapContainer = document.getElementById("sphiMapPRContainer");
  if (mapContainer) {
    mapContainer.style.display = "none";
  } else {
    console.error("Map container not found...");
  }
}


// [H] Limpia todo el mapa ---------------------------------------------------
function cleanMap() {
  svg.selectAll(".gridCellSphi").remove();
}



// [i] Monitoring Buttons --------------------------------------------------
function markActiveHourButton(hour) {
  document.querySelectorAll('.tertiaryBtn').forEach(btn => {
    btn.classList.toggle('active-button', parseInt(btn.dataset.hour, 10) === hour);
  });
}


// [G] Detiene el mapa histórico al pulsar el botón "Reset" ------------------
document
  .getElementById("closeSphiMapPRBtn")
  .addEventListener("click", () => {
    resetMap();
  });


// Cuando otro script lanza el evento personalizado
window.addEventListener("cleanMapPR", () => {
  cleanMap();
});

document.getElementById('hourButtonsPR').addEventListener('click', function(e) {
  if (e.target.classList.contains('tertiaryBtn')) {
    const hour = parseInt(e.target.getAttribute('data-hour'), 10);
    // Cambia el select
    document.getElementById('hourSelectPR').value = hour;
    markActiveHourButton(hour);
    // Actualiza mapa (tu función)
    updateMapForSelection();
  }
});

document.getElementById('hourSelectPR').addEventListener('change', function() {
  const hour = parseInt(this.value, 10);
  markActiveHourButton(hour);
  updateMapForSelection();
});


// [J] Listener for arrow buttons to change minutes -------------------
const blockSelect = document.getElementById("blockSelectPR");
const blockPrevBtn = document.getElementById("blockPrevBtn");
const blockNextBtn = document.getElementById("blockNextBtn");

blockPrevBtn.addEventListener("click", () => {
  let current = parseInt(blockSelect.value, 10);
  if (current > 0) {
    blockSelect.value = current - 1;
    blockSelect.dispatchEvent(new Event("change"));
  }
});

blockNextBtn.addEventListener("click", () => {
  let current = parseInt(blockSelect.value, 10);
  if (current < 5) {
    blockSelect.value = current + 1;
    blockSelect.dispatchEvent(new Event("change"));
  }
});

window.updateMapForSelection = updateMapForSelection;







/*
//import * as d3 from "d3";

import {
  coordinateAxes,
  drawAxisLabels,
  drawColorBar,
  paintGrid,
} from "./mapPRVisualSphi.js";

//import { getSelectedMapDate } from "./mapsPRCalendar.js";
import { fetchIgpSphiData, getSphiBlockByHourAndMinute } from "./mapsPRController.js";

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
  .select("#sphiMapPRRender")
  .attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

// [A.4] Cuadrícula mundial (global para poder reutilizarla)
const gridData = generateGridData(projection, gridSize);

// [B] Genera datos de la cuadrícula -----------------------------------------
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

// [C] Carga datos del mapa --------------------------------------------------
async function loadWorldData() {
  try {
    return await d3.json(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    );
  } catch (error) {
    throw new Error("Error loading GeoJSON for the map...");
  }
}

// [D] Dibuja países ---------------------------------------------------------
function drawCountries(worldData) {
  svg
    .selectAll("path")
    .data(worldData.features)
    .join("path")
    .attr("d", pathGenerator)
    .attr("fill", "#dcdcdc")
    .attr("stroke", "black");
}

// [E] FUNCION CENTRAL: Actualiza el mapa segun selects ----------------------
function updateMapForSelection() {
  // Lee valores seleccionados
  const hourSelect = document.getElementById("hourSelectPR");
  const blockSelect = document.getElementById("blockSelectPR");
  const selectedHour = parseInt(hourSelect.value, 10);
  const selectedBlock = parseInt(blockSelect.value, 10);

  // Obtén el bloque de datos correspondiente
  const blockData = getSphiBlockByHourAndMinute(selectedHour, selectedBlock);

  // Borra la cuadrícula antes de dibujar
  svg.selectAll(".grid-cell").remove();

  // Dibuja el bloque si hay datos
  if (blockData && blockData.data && blockData.data.length > 0) {
    paintGrid(gridData, [blockData], svg);
    console.log(`Plotting hour: ${selectedHour}, and minutes: ${selectedBlock} (${String(selectedHour).padStart(2, "0")}:${String(selectedBlock*10).padStart(2, "0")})`);
  } else {
    console.warn("Data not available.");
  }

  // [NEW] Mostrar mensaje debajo del mapa
  const msgDiv = document.getElementById("mapMessagePR");
  const horaTxt = selectedHour.toString().padStart(2, "0");
  const minTxt = (selectedBlock * 10).toString().padStart(2, "0");
  if (blockData && blockData.data && blockData.data.length > 0) {
      msgDiv.textContent = `Displaying: ${horaTxt}:${minTxt} UTC`;
  } else {
      msgDiv.textContent = `Data not available for ${horaTxt}:${minTxt} UTC.`;
  }
}

// [F] Inicializa mapa con datos y listeners ------------------------------
document.getElementById("sphiMapPRBtn").addEventListener("click", async () => {
  try {
    const mapContainer = document.getElementById("sphiMapPRContainer");
    mapContainer.style.display = "block";
    document.getElementById("hourButtonsPR").classList.add("hourButtonsContainer--visible");


    // Obtén la fecha seleccionada
    const dateInput = document.getElementById("dateInputMaps").value;
    if (!dateInput) {
      console.error("Please select a date before starting the map.");
      return;
    }
    //const { year, doy } = getSelectedMapDate(dateInput);

    // 1. Carga datos SPHI (esto llena el objeto global del controller)
    //await fetchIgpSphiData(year, doy);

    // 2. Carga y dibuja el fondo del mapa y decoración
    const worldData = await loadWorldData();
    drawCountries(worldData);
    coordinateAxes(projection, svg);
    drawAxisLabels(svg, width, height);
    drawColorBar(svg, width, height);

    // 3. Dibuja el bloque actual según selects
    updateMapForSelection();

    // 4. Listeners para selects (pueden ponerse fuera si no quieres duplicar)
    const hourSelect = document.getElementById("hourSelectPR");
    const blockSelect = document.getElementById("blockSelectPR");
    hourSelect.addEventListener("change", updateMapForSelection);
    blockSelect.addEventListener("change", updateMapForSelection);

    // 5. Hace visible el botón "Reset"
    const resetButton = document.getElementById("closeSphiMapPRBtn");
    if (resetButton) resetButton.style.display = "block";
  } catch (error) {
    console.error("Error starting historical map:", error);
  }
});

// [G] Detiene el mapa histórico al pulsar el botón "Reset" ------------------
document
  .getElementById("closeSphiMapPRBtn")
  .addEventListener("click", () => {
    resetMap();
  });

// [H] Limpia todo el mapa ---------------------------------------------------
function resetMap() {
  console.log("Resetting map");
  svg.selectAll("*").remove();
  document.getElementById("hourButtonsPR").classList.remove("hourButtonsContainer--visible");
  const mapContainer = document.getElementById("sphiMapPRContainer");
  if (mapContainer) {
    mapContainer.style.display = "none";
  } else {
    console.error("Map container not found...");
  }
}

// [i] Monitoring Buttons --------------------------------------------------
function markActiveHourButton(hour) {
  document.querySelectorAll('.tertiaryBtn').forEach(btn => {
    btn.classList.toggle('active-button', parseInt(btn.dataset.hour, 10) === hour);
  });
}

document.getElementById('hourButtonsPR').addEventListener('click', function(e) {
  if (e.target.classList.contains('tertiaryBtn')) {
    const hour = parseInt(e.target.getAttribute('data-hour'), 10);
    // Cambia el select
    document.getElementById('hourSelectPR').value = hour;
    markActiveHourButton(hour);
    // Actualiza mapa (tu función)
    updateMapForSelection();
  }
});

document.getElementById('hourSelectPR').addEventListener('change', function() {
  const hour = parseInt(this.value, 10);
  markActiveHourButton(hour);
  updateMapForSelection();
});


// [J] Listener for arrow buttons to change minutes -------------------
const blockSelect = document.getElementById("blockSelectPR");
const blockPrevBtn = document.getElementById("blockPrevBtn");
const blockNextBtn = document.getElementById("blockNextBtn");

blockPrevBtn.addEventListener("click", () => {
  let current = parseInt(blockSelect.value, 10);
  if (current > 0) {
    blockSelect.value = current - 1;
    blockSelect.dispatchEvent(new Event("change"));
  }
});

blockNextBtn.addEventListener("click", () => {
  let current = parseInt(blockSelect.value, 10);
  if (current < 5) {
    blockSelect.value = current + 1;
    blockSelect.dispatchEvent(new Event("change"));
  }
});

export { resetMap };
*/

/*// [K] Limpia el SVG sin ocultar contenedor (llamado desde el controller)
export function clearSvgMapOnly() {
  svg.selectAll("*").remove();
  console.log("🧹 SVG del mapa limpiado antes del nuevo fetch.");
}
*/


/*




import {
  coordinateAxes,
  drawAxisLabels,
  drawColorBar,
  paintGrid,
} from "./mapPRVisualSphi.js";

import { getSelectedMapDate } from "./mapsPRCalendar.js";
import { fetchIgpSphiData, getSphiBlockByHourAndMinute } from "./mapsPRController.js";

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
  .select("#sphiMapPRRender")
  .attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

// [A.4] Cuadrícula mundial (global para poder reutilizarla)
const gridData = generateGridData(projection, gridSize);

// [B] Genera datos de la cuadrícula -----------------------------------------
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

// [C] Carga datos del mapa --------------------------------------------------
async function loadWorldData() {
  try {
    return await d3.json(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    );
  } catch (error) {
    throw new Error("Error loading GeoJSON for the map...");
  }
}

// [D] Dibuja países ---------------------------------------------------------
function drawCountries(worldData) {
  svg
    .selectAll("path")
    .data(worldData.features)
    .join("path")
    .attr("d", pathGenerator)
    .attr("fill", "#dcdcdc")
    .attr("stroke", "black");
}

// [E] FUNCION CENTRAL: Actualiza el mapa segun selects ----------------------
function updateMapForSelection() {
  // Lee valores seleccionados
  const hourSelect = document.getElementById("hourSelectPR");
  const blockSelect = document.getElementById("blockSelectPR");
  const selectedHour = parseInt(hourSelect.value, 10);
  const selectedBlock = parseInt(blockSelect.value, 10);

  // Obtén el bloque de datos correspondiente
  const blockData = getSphiBlockByHourAndMinute(selectedHour, selectedBlock);

  // Borra la cuadrícula antes de dibujar
  svg.selectAll(".grid-cell").remove();

  // Dibuja el bloque si hay datos
  if (blockData && blockData.data && blockData.data.length > 0) {
    paintGrid(gridData, [blockData], svg);
    console.log(`Plotting hour: ${selectedHour}, and minutes: ${selectedBlock} (${String(selectedHour).padStart(2, "0")}:${String(selectedBlock*10).padStart(2, "0")})`);
  } else {
    console.warn("Data not available.");
  }

  // [NEW] Mostrar mensaje debajo del mapa
  const msgDiv = document.getElementById("mapMessagePR");
  const horaTxt = selectedHour.toString().padStart(2, "0");
  const minTxt = (selectedBlock * 10).toString().padStart(2, "0");
  if (blockData && blockData.data && blockData.data.length > 0) {
      msgDiv.textContent = `Displaying: ${horaTxt}:${minTxt} UTC`;
  } else {
      msgDiv.textContent = `Data not available for ${horaTxt}:${minTxt} UTC.`;
  }
}

// [F] Inicializa mapa con datos y listeners ------------------------------
document.getElementById("sphiMapPRBtn").addEventListener("click", async () => {
  try {
    const mapContainer = document.getElementById("sphiMapPRContainer");
    mapContainer.style.display = "block";

    // Obtén la fecha seleccionada
    const dateInput = document.getElementById("dateInputMaps").value;
    if (!dateInput) {
      console.error("Please select a date before starting the map.");
      return;
    }
    const { year, doy } = getSelectedMapDate(dateInput);

    // 1. Carga datos SPHI (esto llena el objeto global del controller)
    await fetchIgpSphiData(year, doy);

    // 2. Carga y dibuja el fondo del mapa y decoración
    const worldData = await loadWorldData();
    drawCountries(worldData);
    coordinateAxes(projection, svg);
    drawAxisLabels(svg, width, height);
    drawColorBar(svg, width, height);

    // 3. Dibuja el bloque actual según selects
    updateMapForSelection();

    // 4. Listeners para selects (pueden ponerse fuera si no quieres duplicar)
    const hourSelect = document.getElementById("hourSelectPR");
    const blockSelect = document.getElementById("blockSelectPR");
    hourSelect.addEventListener("change", updateMapForSelection);
    blockSelect.addEventListener("change", updateMapForSelection);

    // 5. Hace visible el botón "Reset"
    const resetButton = document.getElementById("closeSphiMapPRBtn");
    if (resetButton) resetButton.style.display = "block";
  } catch (error) {
    console.error("Error starting historical map:", error);
  }
});

// [G] Detiene el mapa histórico al pulsar el botón "Reset" ------------------
document
  .getElementById("closeSphiMapPRBtn")
  .addEventListener("click", () => {
    resetMap();
  });

// [H] Limpia todo el mapa ---------------------------------------------------
function resetMap() {
  console.log("Resetting map");
  svg.selectAll("*").remove();
  const mapContainer = document.getElementById("sphiMapPRContainer");
  if (mapContainer) {
    mapContainer.style.display = "none";
  } else {
    console.error("Map container not found...");
  }
}

// [i] Monitoring Buttons --------------------------------------------------
function markActiveHourButton(hour) {
  document.querySelectorAll('.tertiaryBtn').forEach(btn => {
    btn.classList.toggle('active-button', parseInt(btn.dataset.hour, 10) === hour);
  });
}

document.getElementById('hourButtonsPR').addEventListener('click', function(e) {
  if (e.target.classList.contains('tertiaryBtn')) {
    const hour = parseInt(e.target.getAttribute('data-hour'), 10);
    // Cambia el select
    document.getElementById('hourSelectPR').value = hour;
    markActiveHourButton(hour);
    // Actualiza mapa (tu función)
    updateMapForSelection();
  }
});

document.getElementById('hourSelectPR').addEventListener('change', function() {
  const hour = parseInt(this.value, 10);
  markActiveHourButton(hour);
  updateMapForSelection();
});


// [J] Listener for arrow buttons to change minutes -------------------
const blockSelect = document.getElementById("blockSelectPR");
const blockPrevBtn = document.getElementById("blockPrevBtn");
const blockNextBtn = document.getElementById("blockNextBtn");

blockPrevBtn.addEventListener("click", () => {
  let current = parseInt(blockSelect.value, 10);
  if (current > 0) {
    blockSelect.value = current - 1;
    blockSelect.dispatchEvent(new Event("change"));
  }
});

blockNextBtn.addEventListener("click", () => {
  let current = parseInt(blockSelect.value, 10);
  if (current < 5) {
    blockSelect.value = current + 1;
    blockSelect.dispatchEvent(new Event("change"));
  }
});


*/














/*import {
  coordinateAxes,
  drawAxisLabels,
  drawColorBar,
  paintGrid,
} from "./mapPRVisualSphi.js";

import { getSelectedMapDate } from "./mapsPRCalendar.js";
import { fetchIgpSphiData, getSphiBlockByHourAndMinute } from "./mapsPRController.js";

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
  .select("#sphiMapPRRender")
  .attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

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

// [B] Inicializa el mapa SOLO con un bloque específico ------------------------
async function initHistoricalMapBlock(year, doy, h, b) {
  try {
    // 1. Carga datos del mundo en formato GeoJSON
    const worldData = await loadWorldData();

    // 2. Dibuja países y decoración
    drawCountries(worldData);
    coordinateAxes(projection, svg);
    drawAxisLabels(svg, width, height);
    drawColorBar(svg, width, height);

    // 3. Genera cuadrícula
    const gridData = generateGridData(projection, gridSize);

    // 4. Obtiene datos SPHI y espera a que se almacenen los bloques por hora/bloque
    await fetchIgpSphiData(year, doy);

    // 5. Obtén el bloque deseado
    const testBlock = getSphiBlockByHourAndMinute(h, b);

    // 6. Plotea solo ese bloque
    if (testBlock && testBlock.data && testBlock.data.length > 0) {
      paintGrid(gridData, [testBlock], svg);
      console.log(
        `Pintando SOLO hora ${h}, bloque ${b} (${String(h).padStart(2, "0")}:${String(b*10).padStart(2, "0")})`
      );
    } else {
      svg.selectAll(".grid-cell").remove();
      console.warn("No hay datos para este bloque, mapa limpio.");
    }

    // 7. Hace visible el botón "Reset" al cargar el mapa
    const resetButton = document.getElementById("closeSphiMapPRBtn");
    if (resetButton) resetButton.style.display = "block";
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
    .attr("fill", "#dcdcdc")
    .attr("stroke", "black");
}

// [F] Detiene mapa y limpia -------------------------------------------------
function resetMap() {
  console.log("Reseteando el mapa de SPHI...");
  svg.selectAll("*").remove();
  const mapContainer = document.getElementById("sphiMapPRContainer");
  if (mapContainer) {
    mapContainer.style.display = "none";
  } else {
    console.error("No se encontró el contenedor del mapa...");
  }
}

// [G] Inicia el mapa histórico al pulsar el botón ---------------------------
document.getElementById("sphiMapPRBtn").addEventListener("click", async () => {
  try {
    const mapContainer = document.getElementById("sphiMapPRContainer");
    mapContainer.style.display = "block";

    // Obtén la fecha seleccionada
    const dateInput = document.getElementById("dateInputMaps").value;
    if (!dateInput) {
      console.error("Por favor selecciona una fecha antes de iniciar el mapa.");
      return;
    }
    const { year, doy } = getSelectedMapDate(dateInput);

    // === Aquí decides la hora y bloque a visualizar ===
    const horaSeleccionada = 3;   // Cambia aquí si quieres probar otros valores
    const bloqueSeleccionado = 2; // Cambia aquí si quieres probar otros valores

    // Inicializa el mapa con SOLO el bloque deseado
    await initHistoricalMapBlock(year, doy, horaSeleccionada, bloqueSeleccionado);
  } catch (error) {
    console.error("Error al iniciar el mapa histórico:", error);
  }
});

// [H] Detiene el mapa histórico al pulsar el botón "Reset" ------------------
document
  .getElementById("closeSphiMapPRBtn")
  .addEventListener("click", () => {
    resetMap();
  });

// [Z] Finalización del script -----------------------------------------------
console.log("Script mapPRProjectionSphi.js cargado correctamente.");



*/
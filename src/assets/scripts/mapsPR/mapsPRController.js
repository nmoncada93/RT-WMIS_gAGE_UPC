import { getSelectedMapDate } from "./mapsPRCalendar.js";

// [A] Global Variables  ============================================
let mapsPRData = {
  igp_sphi: null, // Save JSON from igp_sphi.dat.xz
};

const sphiMapBtn = document.getElementById("sphiMapPRBtn");
sphiMapBtn.classList.add("boxContainer__titleH3--disabled");
document.getElementById("hourButtonsPR").classList.remove("hourButtonsContainer--visible");

// [B] Handle Fetch Flags =========================================
const isFetching = {
  igp_sphi: false,
};

function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessagePRMaps");
  const map = document.getElementById("sphiMapPRContainer");

  if (show) {
    // hide mapa and save the status "visible"
    map.dataset.wasVisible = map.style.display === "block";
    map.style.display = "none";
    spinner.style.display = "flex";
  } else {
    spinner.style.display = "none";
    // Show the map only if it was visible before
    if (map.dataset.wasVisible === "true") {
      map.style.display = "block";
    }
    delete map.dataset.wasVisible;
  }
}

// [C] Obtain historical data from igp_sphi.dat.xz ====================
async function fetchRawIgpSphiData(year, doy) {
  if (isFetching.igp_sphi) {
    console.warn("SPHI application in process. Avoiding overlapping.");
    return null;
  }

  isFetching.igp_sphi = true; // Activate the flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-sphi/${year}/${doy}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error for SPHI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_sphi = false; // Desactivate the flag
  }
}

// [D] Filter data for SPHI =====================================
function filterSphiData(rawData) {
  return rawData.map((group) => ({
    TIME: group.TIME,
    data: group.data
      .map((cell) => ({
        Longitude: cell.Longitude ?? null,
        Latitude: cell.Latitude ?? null,
        mean_sphi: cell.mean_sphi ?? null,
      }))
      .filter((cell) => cell.Longitude !== null && cell.Latitude !== null),
  }));
}

// [E] Group blocks by hour and 10-minute block ================================
function groupByHourAndBlock(filteredData) {
  // Create result object: keys 0...23, each one an array of 6 positions (null by default)
  const byHourBlock = {};
  for (let h = 0; h < 24; h++) byHourBlock[h] = Array(6).fill(null);

  filteredData.forEach((block) => {
    const hour = Math.floor(block.TIME / 3600);
    const blockIdx = Math.floor((block.TIME % 3600) / 600);
    if (hour >= 0 && hour < 24 && blockIdx >= 0 && blockIdx < 6) {
      byHourBlock[hour][blockIdx] = block;
    }
  });

  return byHourBlock;
}

// [F] Main function for SPHI ============================================
export async function fetchIgpSphiData(year, doy) {
  try {
    const rawData = await fetchRawIgpSphiData(year, doy);
    const hasUsefulData = Array.isArray(rawData) && rawData.some(group => Array.isArray(group.data) && group.data.length > 0);
    
    if (!rawData || !hasUsefulData) {
      // If there is no data, clear the structure and update buttons
      mapsPRData.igp_sphi_byHourBlock = {};
      hourBtnAvailability();
      hourDropdownAvailability();
      return null;
    }

    const filteredData = filterSphiData(rawData);
    mapsPRData.igp_sphi = filteredData;
    sphiMapBtn.classList.remove("boxContainer__titleH3--disabled");

    // Group and save in new variable
    mapsPRData.igp_sphi_byHourBlock = groupByHourAndBlock(filteredData);
    console.log("Hour and minutes:", mapsPRData.igp_sphi_byHourBlock);
    hourBtnAvailability();
    hourDropdownAvailability();

    // Count blocks by hour
    const bloques = mapsPRData.igp_sphi;
    const resumen = {};

    bloques.forEach(b => {
      const h = Math.floor(b.TIME / 3600);
      if (!resumen[h]) resumen[h] = 0;
      resumen[h]++;
    });

    //console.log("Bloques por hora:", resumen);
    console.log("Data from igp_sphi.dat.xz filtered and stored.");

    return filteredData;
  } catch (error) {
    console.error("Error obtaining or processing SPHI data:", error.message);
    // if there is an error, clear the structure and update buttons
    mapsPRData.igp_sphi_byHourBlock = {};
    hourBtnAvailability();
    hourDropdownAvailability();
    document.getElementById("hourButtonsPR").classList.remove("hourButtonsContainer--visible");
    handlerSpinner(false);
  }
}

// [G] Update hour button availability ====================================================
function hourBtnAvailability() {
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  document.querySelectorAll('#hourButtonsPR button.tertiaryBtn').forEach((btn) => {
    const hour = parseInt(btn.getAttribute('data-hour'), 10);
    const hasData = (byHourBlock[hour] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      btn.classList.add('tertiaryBtn--disabled');
      btn.disabled = true; // Opcional, útil para accesibilidad
    } else {
      btn.classList.remove('tertiaryBtn--disabled');
      btn.disabled = false;
    }
  });
}

// [H] Update hour button availability ====================================================
function hourDropdownAvailability() {
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  const hourSelect = document.getElementById("hourSelectPR");
  // Clear the hour select dropdown
  hourSelect.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    //option.textContent = h.toString().padStart(2, "0") + ":00";
    option.textContent = `${h}h`;
    // Check if there is data in that hour
    const hasData = (byHourBlock[h] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      option.disabled = true;
      option.classList.add("selectOption--disabled");
    }
    hourSelect.appendChild(option);
  }
}

// [I] Clear hour and minute block selections =============================================
function clearHourAndMinuteSelections() {
  document.querySelectorAll('.tertiaryBtn.active-button').forEach(btn => {
    btn.classList.remove('active-button');
  });

  // [J.2] Reset hour dropdown selector (for mobile view)
  const hourSelect = document.getElementById("hourSelectPR");
  hourSelect.selectedIndex = 0;

  // [J.3] Reset 10-minute block selector
  const blockSelect = document.getElementById("blockSelectPR");
  blockSelect.selectedIndex = 0;
}


// [K] Captura fecha y obtiene datos ==================================
document
  .getElementById("dateInputMaps")
  .addEventListener("change", async function () {
    //clearSvgMapOnly(); // 🧹 Limpia visualización anterior
    const { year, doy } = getSelectedMapDate(this.value);
    console.log(
      "Serlected Date:",
      this.value,
      "Year:",
      year,
      "DDay of Year (DoY):",
      doy
    );

    window.dispatchEvent(new Event("cleanMapPR"));
    clearHourAndMinuteSelections(); // ← limpia selección de hora y minutos

    handlerSpinner(true);
    await fetchIgpSphiData(year, doy);
    handlerSpinner(false);
  });

// [L] Update hour button availability ====================================================
document.getElementById('blockPrevBtn').addEventListener('mousedown', function(e) {
  e.preventDefault(); // Previene que quede enfocado
  this.blur();
});

// [L.1] Update hour button availability ====================================================
document.getElementById('blockNextBtn').addEventListener('mousedown', function(e) {
  e.preventDefault();
  this.blur();
});

// [Z] Getter para obtener el bloque filtrado por hora y bloque de 10 minutos
export function getSphiBlockByHourAndMinute(hour, blockIdx) {
  if (!mapsPRData.igp_sphi_byHourBlock) return null;
  return mapsPRData.igp_sphi_byHourBlock[hour]?.[blockIdx] ?? null;
}

// [AUTO-PLAY] ================================================================

// [A] Player state variables
let isAutoPlaying = false;
let autoPlayIntervalId = null;
let autoPlayIndex = 0;
let activeHourButtons = [];

// [B] Start auto-play for available hour buttons
function startAutoPlay() {
  const playButton = document.getElementById("autoPlayHoursBtn");

  // [B.1] Get active hour buttons (those not disabled)
  activeHourButtons = Array.from(document.querySelectorAll("#hourButtonsPR .tertiaryBtn"))
    .filter(btn => !btn.classList.contains("tertiaryBtn--disabled"))
    .sort((a, b) => parseInt(a.dataset.hour, 10) - parseInt(b.dataset.hour, 10)); // Ascending order

  if (activeHourButtons.length === 0) {
    console.warn("No active hour buttons available.");
    return;
  }

  // [B.2] Prepare state and UI
  isAutoPlaying = true;
  autoPlayIndex = 0;
  playButton.textContent = "⏸️";
  playButton.classList.add("playing");

  // [B.3] Simulate one click every second (adjustable)
  autoPlayIntervalId = setInterval(() => {
    if (autoPlayIndex >= activeHourButtons.length) {
      stopAutoPlay(); // End of playback
      return;
    }

    activeHourButtons[autoPlayIndex].click();
    autoPlayIndex++;
  }, 1000);
}

// [C] Stop auto-play
function stopAutoPlay() {
  const playButton = document.getElementById("autoPlayHoursBtn");
  clearInterval(autoPlayIntervalId);
  autoPlayIntervalId = null;
  isAutoPlaying = false;
  autoPlayIndex = 0;
  playButton.textContent = "▶️";
  playButton.classList.remove("playing");
}

// [D] Toggle auto-play on/off
function toggleAutoPlay() {
  if (isAutoPlaying) {
    stopAutoPlay();
  } else {
    startAutoPlay();
  }
}

// [E] Attach listener to play/pause button
document.getElementById("autoPlayHoursBtn").addEventListener("click", toggleAutoPlay);
























/*
import { getSelectedMapDate } from "./mapsPRCalendar.js";

// [A] Global Variables  ============================================
let mapsPRData = {
  igp_sphi: null, // Save JSON from igp_sphi.dat.xz
  //igp_roti: null, // save JSON from igp_roti.dat.xz
};

const sphiMapBtn = document.getElementById("sphiMapPRBtn");
sphiMapBtn.classList.add("boxContainer__titleH3--disabled");
document.getElementById("hourButtonsPR").classList.remove("hourButtonsContainer--visible");

// [B] Handle Fetch Flags =========================================
const isFetching = {
  igp_sphi: false,
  //igp_roti: false,
};

function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessagePRMaps");
  const map = document.getElementById("sphiMapPRContainer");

  if (show) {
    // hide mapa and save the status "visible"
    map.dataset.wasVisible = map.style.display === "block";
    map.style.display = "none";
    spinner.style.display = "flex";
  } else {
    spinner.style.display = "none";
    // Show the map only if it was visible before
    if (map.dataset.wasVisible === "true") {
      map.style.display = "block";
    }
    delete map.dataset.wasVisible;
  }
}

// [C] Obtain historical data from igp_sphi.dat.xz ====================
async function fetchRawIgpSphiData(year, doy) {
  if (isFetching.igp_sphi) {
    console.warn("SPHI application in process. Avoiding overlapping.");
    return null;
  }

  isFetching.igp_sphi = true; // Activate the flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-sphi/${year}/${doy}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error for SPHI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_sphi = false; // Desactivate the flag
  }
}


// [C.1] Obtain historical data from igp_roti.dat.xz ====================
async function fetchRawIgpRotiData(year, doy) {
  if (isFetching.igp_roti) {
    console.warn("Solicitud ROTI en proceso. Evitando solapamiento.");
    return null;
  }

  isFetching.igp_roti = true; // Activate the flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-roti/${year}/${doy}`;
    console.log(`Fetching ROTI data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP para ROTI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_roti = false; // Desactivate the flag
  }
}

// [D] Filter data for SPHI =====================================
function filterSphiData(rawData) {
  return rawData.map((group) => ({
    TIME: group.TIME,
    data: group.data
      .map((cell) => ({
        Longitude: cell.Longitude ?? null,
        Latitude: cell.Latitude ?? null,
        mean_sphi: cell.mean_sphi ?? null,
      }))
      .filter((cell) => cell.Longitude !== null && cell.Latitude !== null),
  }));
}

// [F] Group blocks by hour and 10-minute block ================================
function groupByHourAndBlock(filteredData) {
  // Create result object: keys 0...23, each one an array of 6 positions (null by default)
  const byHourBlock = {};
  for (let h = 0; h < 24; h++) byHourBlock[h] = Array(6).fill(null);

  filteredData.forEach((block) => {
    const hour = Math.floor(block.TIME / 3600);
    const blockIdx = Math.floor((block.TIME % 3600) / 600);
    if (hour >= 0 && hour < 24 && blockIdx >= 0 && blockIdx < 6) {
      byHourBlock[hour][blockIdx] = block;
    }
  });

  return byHourBlock;
}

// [G] Main function for SPHI ============================================
export async function fetchIgpSphiData(year, doy) {
  try {
    const rawData = await fetchRawIgpSphiData(year, doy);
    const hasUsefulData = Array.isArray(rawData) && rawData.some(group => Array.isArray(group.data) && group.data.length > 0);
    
    if (!rawData || !hasUsefulData) {
      // If there is no data, clear the structure and update buttons
      mapsPRData.igp_sphi_byHourBlock = {};
      hourBtnAvailability();
      hourDropdownAvailability();
      return null;
    }

    const filteredData = filterSphiData(rawData);
    mapsPRData.igp_sphi = filteredData;
    sphiMapBtn.classList.remove("boxContainer__titleH3--disabled");

    // Group and save in new variable
    mapsPRData.igp_sphi_byHourBlock = groupByHourAndBlock(filteredData);
    console.log("Hour and minutes:", mapsPRData.igp_sphi_byHourBlock);

    hourBtnAvailability();
    hourDropdownAvailability();

    // Count blocks by hour
    const bloques = mapsPRData.igp_sphi;
    const resumen = {};

    bloques.forEach(b => {
      const h = Math.floor(b.TIME / 3600);
      if (!resumen[h]) resumen[h] = 0;
      resumen[h]++;
    });

    //console.log("Bloques por hora:", resumen);
    console.log("Data from igp_sphi.dat.xz filtered and stored.");

    return filteredData;

  } catch (error) {
    console.error("Error obtaining or processing SPHI data:", error.message);
    // if there is an error, clear the structure and update buttons
    mapsPRData.igp_sphi_byHourBlock = {};
    hourBtnAvailability();
    hourDropdownAvailability();
    document.getElementById("hourButtonsPR").classList.remove("hourButtonsContainer--visible");
    handlerSpinner(false);
  }
}

// [H] Update hour button availability ====================================================
function hourBtnAvailability() {
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  document.querySelectorAll('#hourButtonsPR button.tertiaryBtn').forEach((btn) => {
    const hour = parseInt(btn.getAttribute('data-hour'), 10);
    const hasData = (byHourBlock[hour] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      btn.classList.add('tertiaryBtn--disabled');
      btn.disabled = true; // Opcional, útil para accesibilidad
    } else {
      btn.classList.remove('tertiaryBtn--disabled');
      btn.disabled = false;
    }
  });
}

// [I] Update hour button availability ====================================================
function hourDropdownAvailability() {

  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  const hourSelect = document.getElementById("hourSelectPR");
  // Clear the hour select dropdown
  hourSelect.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    //option.textContent = h.toString().padStart(2, "0") + ":00";
    option.textContent = `${h}h`;
    // Check if there is data in that hour
    const hasData = (byHourBlock[h] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      option.disabled = true;
      option.classList.add("selectOption--disabled");
    }
    hourSelect.appendChild(option);
  }
}

// [J] Clear hour and minute block selections =============================================
function clearHourAndMinuteSelections() {
  // [J.1] Remove "active" state from all hour buttons
  document.querySelectorAll('.tertiaryBtn.active-button').forEach(btn => {
    btn.classList.remove('active-button');
  });

  // [J.2] Reset hour dropdown selector (for mobile view)
  const hourSelect = document.getElementById("hourSelectPR");
  hourSelect.selectedIndex = 0;

  // [J.3] Reset 10-minute block selector
  const blockSelect = document.getElementById("blockSelectPR");
  blockSelect.selectedIndex = 0;
}


// [K] Captura fecha y obtiene datos ==================================
document
  .getElementById("dateInputMaps")
  .addEventListener("change", async function () {
    //clearSvgMapOnly(); // 🧹 Limpia visualización anterior
    const { year, doy } = getSelectedMapDate(this.value);
    console.log(
      "Serlected Date:",
      this.value,
      "Year:",
      year,
      "DDay of Year (DoY):",
      doy
    );

    window.dispatchEvent(new Event("cleanMapPR"));
    clearHourAndMinuteSelections(); // ← limpia selección de hora y minutos

    handlerSpinner(true);
    await fetchIgpSphiData(year, doy);
    handlerSpinner(false);
  });

// [L] Update hour button availability ====================================================
document.getElementById('blockPrevBtn').addEventListener('mousedown', function(e) {
  e.preventDefault(); // Previene que quede enfocado
  this.blur();
});

// [L.1] Update hour button availability ====================================================
document.getElementById('blockNextBtn').addEventListener('mousedown', function(e) {
  e.preventDefault();
  this.blur();
});

// [Z] Getter para obtener el bloque filtrado por hora y bloque de 10 minutos
export function getSphiBlockByHourAndMinute(hour, blockIdx) {
  if (!mapsPRData.igp_sphi_byHourBlock) return null;
  return mapsPRData.igp_sphi_byHourBlock[hour]?.[blockIdx] ?? null;
}

// [AUTO-PLAY] ================================================================

// [A] Player state variables
let isAutoPlaying = false;
let autoPlayIntervalId = null;
let autoPlayIndex = 0;
let activeHourButtons = [];

// [B] Start auto-play for available hour buttons
function startAutoPlay() {
  const playButton = document.getElementById("autoPlayHoursBtn");

  // [B.1] Get active hour buttons (those not disabled)
  activeHourButtons = Array.from(document.querySelectorAll("#hourButtonsPR .tertiaryBtn"))
    .filter(btn => !btn.classList.contains("tertiaryBtn--disabled"))
    .sort((a, b) => parseInt(a.dataset.hour, 10) - parseInt(b.dataset.hour, 10)); // Ascending order

  if (activeHourButtons.length === 0) {
    console.warn("No active hour buttons available.");
    return;
  }

  // [B.2] Prepare state and UI
  isAutoPlaying = true;
  autoPlayIndex = 0;
  playButton.textContent = "⏸️";
  playButton.classList.add("playing");

  // [B.3] Simulate one click every second (adjustable)
  autoPlayIntervalId = setInterval(() => {
    if (autoPlayIndex >= activeHourButtons.length) {
      stopAutoPlay(); // End of playback
      return;
    }

    activeHourButtons[autoPlayIndex].click();
    autoPlayIndex++;
  }, 1000);
}

// [C] Stop auto-play
function stopAutoPlay() {
  const playButton = document.getElementById("autoPlayHoursBtn");
  clearInterval(autoPlayIntervalId);
  autoPlayIntervalId = null;
  isAutoPlaying = false;
  autoPlayIndex = 0;
  playButton.textContent = "▶️";
  playButton.classList.remove("playing");
}

// [D] Toggle auto-play on/off
function toggleAutoPlay() {
  if (isAutoPlaying) {
    stopAutoPlay();
  } else {
    startAutoPlay();
  }
}

// [E] Attach listener to play/pause button
document.getElementById("autoPlayHoursBtn").addEventListener("click", toggleAutoPlay);


*/








/*
import { getSelectedMapDate } from "./mapsPRCalendar.js";
//import { resetMap } from "./mapPRProjectionSphi.js";


// [A] Variables Globales ============================================
let mapsPRData = {
  igp_sphi: null, // Almacena el JSON de igp_sphi.dat.xz
  igp_roti: null, // Almacena el JSON de igp_roti.dat.xz
};

const sphiMapBtn = document.getElementById("sphiMapPRBtn");
sphiMapBtn.classList.add("boxContainer__titleH3--disabled"); // 🔒 Por defecto desactivado
document.getElementById("hourButtonsPR").classList.remove("hourButtonsContainer--visible");

// [B] Manejo de Fetch Flags =========================================
const isFetching = {
  igp_sphi: false,
  igp_roti: false,
};

function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessagePRMaps");
  const map = document.getElementById("sphiMapPRContainer");

  if (show) {
    // Ocultamos el mapa y recordamos si estaba visible
    map.dataset.wasVisible = map.style.display === "block";
    map.style.display = "none";
    spinner.style.display = "flex";
  } else {
    spinner.style.display = "none";

    // Solo mostramos el mapa si estaba visible antes
    if (map.dataset.wasVisible === "true") {
      map.style.display = "block";
    }
    delete map.dataset.wasVisible;
  }
}


// [D] Obtiene datos históricos de igp_sphi.dat.xz ====================
async function fetchRawIgpSphiData(year, doy) {
  if (isFetching.igp_sphi) {
    console.warn("Solicitud SPHI en proceso. Evitando solapamiento.");
    return null;
  }

  isFetching.igp_sphi = true; // Activate the flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-sphi/${year}/${doy}`;
    console.log(`Fetching SPHI data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP for SPHI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_sphi = false; // Desactivate the flag
  }
}

// [E] Obtiene datos históricos de igp_roti.dat.xz ====================
async function fetchRawIgpRotiData(year, doy) {
  if (isFetching.igp_roti) {
    console.warn("Solicitud ROTI en proceso. Evitando solapamiento.");
    return null;
  }

  isFetching.igp_roti = true; // Activate the flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-roti/${year}/${doy}`;
    console.log(`Fetching ROTI data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP para ROTI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_roti = false; // Desactivate the flag
  }
}

// [F] Filtro de datos para SPHI =====================================
function filterSphiData(rawData) {
  return rawData.map((group) => ({
    TIME: group.TIME,
    data: group.data
      .map((cell) => ({
        Longitude: cell.Longitude ?? null,
        Latitude: cell.Latitude ?? null,
        mean_sphi: cell.mean_sphi ?? null,
      }))
      .filter((cell) => cell.Longitude !== null && cell.Latitude !== null),
  }));
}

// [F.1] Agrupa bloques por hora y por bloques de 10 minutos ================ NUEVO

// Agrupa los bloques por hora y bloque de 10 min
function groupByHourAndBlock(filteredData) {
  // Crea objeto resultado: keys 0...23, cada una array de 6 posiciones (null por defecto)
  const byHourBlock = {};
  for (let h = 0; h < 24; h++) byHourBlock[h] = Array(6).fill(null);

  filteredData.forEach((block) => {
    const hour = Math.floor(block.TIME / 3600);
    const blockIdx = Math.floor((block.TIME % 3600) / 600);
    if (hour >= 0 && hour < 24 && blockIdx >= 0 && blockIdx < 6) {
      byHourBlock[hour][blockIdx] = block;
    }
  });

  return byHourBlock;
}

// [G] Funcion principal para SPHI ==================================
export async function fetchIgpSphiData(year, doy) {
  try {
    const rawData = await fetchRawIgpSphiData(year, doy);
    const hasUsefulData = Array.isArray(rawData) && rawData.some(group => Array.isArray(group.data) && group.data.length > 0);
    
    if (!rawData || !hasUsefulData) {
      // Si no hay datos, limpia la estructura y actualiza botones
      mapsPRData.igp_sphi_byHourBlock = {};
      hourBtnAvailability();
      hourDropdownAvailability();
      return null;
    }

    const filteredData = filterSphiData(rawData);
    mapsPRData.igp_sphi = filteredData;
    sphiMapBtn.classList.remove("boxContainer__titleH3--disabled");

    // Paso 2: Agrupar y guardar en nueva variable
    mapsPRData.igp_sphi_byHourBlock = groupByHourAndBlock(filteredData);
    console.log("Agrupado por hora y bloque (step 2):", mapsPRData.igp_sphi_byHourBlock);

    hourBtnAvailability();
    hourDropdownAvailability();

    // Después de mapsPRData.igp_sphi = filteredData;
    const bloques = mapsPRData.igp_sphi;
    const resumen = {};

    bloques.forEach(b => {
      const h = Math.floor(b.TIME / 3600);
      if (!resumen[h]) resumen[h] = 0;
      resumen[h]++;
    });

    console.log("Bloques por hora:", resumen);
    console.log("Data from igp_sphi.dat.xz filtered and stored.");

    // [G.1] Actualiza estado visual del selector de minutos
    const selectedHour = parseInt(document.getElementById("hourSelectPR").value, 10);
    //minuteDropdownAvailability(selectedHour);

    return filteredData;

  } catch (error) {
    console.error("Error al obtener o procesar los datos SPHI:", error.message);
    // Si hay error, limpia la estructura y actualiza botones
    mapsPRData.igp_sphi_byHourBlock = {};
    hourBtnAvailability();
    hourDropdownAvailability();
    document.getElementById("hourButtonsPR").classList.remove("hourButtonsContainer--visible");
    handlerSpinner(false);
  }
}


// [] Update hour button availability ====================================================
function hourBtnAvailability() {
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  document.querySelectorAll('#hourButtonsPR button.tertiaryBtn').forEach((btn) => {
    const hour = parseInt(btn.getAttribute('data-hour'), 10);
    const hasData = (byHourBlock[hour] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      btn.classList.add('tertiaryBtn--disabled');
      btn.disabled = true; // Opcional, útil para accesibilidad
    } else {
      btn.classList.remove('tertiaryBtn--disabled');
      btn.disabled = false;
    }
  });
}


/*
// [] Update hour button availability ====================================================
function hourDropdownAvailability() {
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  const hourSelect = document.getElementById("hourSelectPR");
  const blockSelect = document.getElementById("blockSelectPR");

  // Limpia primero el selector de horas
  hourSelect.innerHTML = "";

  let firstValidHour = null;

  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = `${h}h`;

    const hasData = (byHourBlock[h] || []).some(
      (b) => b && b.data && b.data.length > 0
    );

    if (!hasData) {
      option.disabled = true;
      option.classList.add("selectOption--disabled");
    } else if (firstValidHour === null) {
      firstValidHour = h;
    }

    hourSelect.appendChild(option);
  }

  // Selecciona la primera hora con datos
  if (firstValidHour !== null) {
    hourSelect.value = firstValidHour;

    // 🆕 Recorre los bloques de esa hora y selecciona el primer minuto válido
    const blocks = byHourBlock[firstValidHour];
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i] && blocks[i].data && blocks[i].data.length > 0) {
        blockSelect.value = i.toString();
        break;
      }
    }
  }
}
*/

/*
// [] Update hour button availability ====================================================
function hourDropdownAvailability() {
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  const hourSelect = document.getElementById("hourSelectPR");
  const blockSelect = document.getElementById("blockSelectPR");

  // Limpia primero el selector de horas
  hourSelect.innerHTML = "";

  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = `${h}h`;

    const hasData = (byHourBlock[h] || []).some(
      (b) => b && b.data && b.data.length > 0
    );

    if (!hasData) {
      option.disabled = true;
      option.classList.add("selectOption--disabled");
    }

    hourSelect.appendChild(option);
  }
}
*/

/*
// [] Update hour button availability ====================================================
function hourDropdownAvailability() {

  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  const hourSelect = document.getElementById("hourSelectPR");
  // Limpia primero el select
  hourSelect.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    //option.textContent = h.toString().padStart(2, "0") + ":00";
    option.textContent = `${h}h`;
    // Checkea si hay datos en esa hora
    const hasData = (byHourBlock[h] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      option.disabled = true;
      //option.classList.add("hourSelectPR__option--disabled");
      option.classList.add("selectOption--disabled");
    }
    hourSelect.appendChild(option);
  }
}


function clearHourAndMinuteSelections() {
  // 1. Desactivar todos los botones de hora
  document.querySelectorAll('.tertiaryBtn.active-button').forEach(btn => {
    btn.classList.remove('active-button');
  });

  // 2. Reiniciar selector desplegable de hora (móvil)
  const hourSelect = document.getElementById("hourSelectPR");
  hourSelect.selectedIndex = 0;

  // 3. Reiniciar selector de bloque de minutos
  const blockSelect = document.getElementById("blockSelectPR");
  blockSelect.selectedIndex = 0;
}


// [H] Captura fecha y obtiene datos ==================================
document
  .getElementById("dateInputMaps")
  .addEventListener("change", async function () {
    //clearSvgMapOnly(); // 🧹 Limpia visualización anterior
    const { year, doy } = getSelectedMapDate(this.value);
    console.log(
      "Fecha seleccionada:",
      this.value,
      "Año:",
      year,
      "Día del año (DoY):",
      doy
    );

    window.dispatchEvent(new Event("cleanMapPR"));
    clearHourAndMinuteSelections(); // ← limpia selección de hora y minutos

    handlerSpinner(true);
    await fetchIgpSphiData(year, doy);
    handlerSpinner(false);
  });

/*
// [J.2] Listener para el <select> de minutos manualmente seleccionado
document.getElementById("blockSelectPR").addEventListener("change", () => {
  console.log("Cambio manual de minutos");
  window.updateMapForSelection(); // Llama a la función global del mapa
});
*/

/*
// [Z] Getter para obtener el bloque filtrado por hora y bloque de 10 minutos
export function getSphiBlockByHourAndMinute(hour, blockIdx) {
  if (!mapsPRData.igp_sphi_byHourBlock) return null;
  return mapsPRData.igp_sphi_byHourBlock[hour]?.[blockIdx] ?? null;
}

document.getElementById('blockPrevBtn').addEventListener('mousedown', function(e) {
  e.preventDefault(); // Previene que quede enfocado
  this.blur();
});

document.getElementById('blockNextBtn').addEventListener('mousedown', function(e) {
  e.preventDefault();
  this.blur();
});


// [UI] Toggle apertura/cierre con SigmaPhi ======================================
document.getElementById("sphiMapPRBtn").addEventListener("click", () => {
  const container = document.getElementById("sphiMapPRContainer");
  const icon = document.querySelector("#sphiMapPRBtn i"); // Captura el <i> interno
  const isVisible = container.style.display === "block";

  // Toggle visibilidad del contenedor
  container.style.display = isVisible ? "none" : "block";

  // Toggle rotación del ícono
  if (icon) {
    icon.style.transition = "transform 0.3s ease";
    icon.style.transform = isVisible ? "rotate(0deg)" : "rotate(180deg)";
  }
});


// [AUTO-PLAY] ================================================================
// [A] Variables de estado del reproductor
let isAutoPlaying = false;
let autoPlayIntervalId = null;
let autoPlayIndex = 0;
let activeHourButtons = [];

// [B] Inicia la reproducción automática de botones
function startAutoPlay() {
  const playButton = document.getElementById("autoPlayHoursBtn");

  // [B.1] Obtener botones activos (sin clase de deshabilitado)
  activeHourButtons = Array.from(document.querySelectorAll("#hourButtonsPR .tertiaryBtn"))
    .filter(btn => !btn.classList.contains("tertiaryBtn--disabled"))
    .sort((a, b) => parseInt(a.dataset.hour, 10) - parseInt(b.dataset.hour, 10)); // Orden creciente

  if (activeHourButtons.length === 0) {
    console.warn("No hay botones de hora habilitados.");
    return;
  }

  // [B.2] Preparar estado
  isAutoPlaying = true;
  autoPlayIndex = 0;
  playButton.textContent = "⏸️";
  playButton.classList.add("playing");

  // [B.3] Simular clic cada segundo (ajustable)
  autoPlayIntervalId = setInterval(() => {
    if (autoPlayIndex >= activeHourButtons.length) {
      stopAutoPlay(); // Fin automático
      return;
    }

    activeHourButtons[autoPlayIndex].click();
    autoPlayIndex++;
  }, 1000);
}

// [C] Detener la reproducción automática
function stopAutoPlay() {
  const playButton = document.getElementById("autoPlayHoursBtn");
  clearInterval(autoPlayIntervalId);
  autoPlayIntervalId = null;
  isAutoPlaying = false;
  autoPlayIndex = 0;
  playButton.textContent = "▶️";
  playButton.classList.remove("playing");
}

// [D] Alternar entre iniciar y detener
function toggleAutoPlay() {
  if (isAutoPlaying) {
    stopAutoPlay();
  } else {
    startAutoPlay();
  }
}

// [AUTO-PLAY INIT] Listener del botón
document.getElementById("autoPlayHoursBtn").addEventListener("click", toggleAutoPlay);
*/


//======================================================== antiguo =============================================
/*
import { getSelectedMapDate } from "./mapsPRCalendar.js";

// [A] Variables Globales ============================================
let mapsPRData = {
  igp_sphi: null, // Almacena el JSON de igp_sphi.dat.xz
  igp_roti: null, // Almacena el JSON de igp_roti.dat.xz
};

// [B] Manejo de Fetch Flags =========================================
const isFetching = {
  igp_sphi: false,
  igp_roti: false,
};

// [C] Mostrar/ocultar spinner de carga ==============================
function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessagePRMaps"); // ID del spinner
  spinner.style.display = show ? "flex" : "none";
  console.log(show ? "Spinner mostrado" : "Spinner oculto");
}

// [D] Obtiene datos históricos de igp_sphi.dat.xz ====================
async function fetchRawIgpSphiData(year, doy) {
  if (isFetching.igp_sphi) {
    console.warn("Solicitud SPHI en proceso. Evitando solapamiento.");
    return null;
  }

  isFetching.igp_sphi = true; // Activa el flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-sphi/${year}/${doy}`;
    console.log(`Fetching SPHI data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP para SPHI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_sphi = false; // Desactiva el flag
  }
}

// [E] Obtiene datos históricos de igp_roti.dat.xz ====================
async function fetchRawIgpRotiData(year, doy) {
  if (isFetching.igp_roti) {
    console.warn("Solicitud ROTI en proceso. Evitando solapamiento.");
    return null;
  }

  isFetching.igp_roti = true; // Activa el flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-roti/${year}/${doy}`;
    console.log(`Fetching ROTI data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP para ROTI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_roti = false; // Desactiva el flag
  }
}

// [F] Filtro de datos para SPHI =====================================
function filterSphiData(rawData) {
  return rawData.map((group) => ({
    TIME: group.TIME,
    data: group.data
      .map((cell) => ({
        Longitude: cell.Longitude ?? null,
        Latitude: cell.Latitude ?? null,
        mean_sphi: cell.mean_sphi ?? null,
      }))
      .filter((cell) => cell.Longitude !== null && cell.Latitude !== null),
  }));
}

// [F.1] Agrupa bloques por hora y por bloques de 10 minutos ================ NUEVO

// Agrupa los bloques por hora y bloque de 10 min
function groupByHourAndBlock(filteredData) {
  // Crea objeto resultado: keys 0...23, cada una array de 6 posiciones (null por defecto)
  const byHourBlock = {};
  for (let h = 0; h < 24; h++) byHourBlock[h] = Array(6).fill(null);

  filteredData.forEach((block) => {
    const hour = Math.floor(block.TIME / 3600);
    const blockIdx = Math.floor((block.TIME % 3600) / 600);
    if (hour >= 0 && hour < 24 && blockIdx >= 0 && blockIdx < 6) {
      byHourBlock[hour][blockIdx] = block;
    }
  });

  return byHourBlock;
}

// [G] Funcion principal para SPHI ==================================
export async function fetchIgpSphiData(year, doy) {
  try {
    const rawData = await fetchRawIgpSphiData(year, doy);

    if (!rawData) {
      // Si no hay datos, limpia la estructura y actualiza botones
      mapsPRData.igp_sphi_byHourBlock = {};
      hourBtnAvailability();
      hourDropdownAvailability();

      return null;
    }

    const filteredData = filterSphiData(rawData);
    mapsPRData.igp_sphi = filteredData;

    // Paso 2: Agrupar y guardar en nueva variable
    mapsPRData.igp_sphi_byHourBlock = groupByHourAndBlock(filteredData);
    console.log("Agrupado por hora y bloque (step 2):", mapsPRData.igp_sphi_byHourBlock);

    hourBtnAvailability();
    hourDropdownAvailability();


    // Después de mapsPRData.igp_sphi = filteredData;
    const bloques = mapsPRData.igp_sphi;
    const resumen = {};

    bloques.forEach(b => {
      const h = Math.floor(b.TIME / 3600);
      if (!resumen[h]) resumen[h] = 0;
      resumen[h]++;
    });

    console.log("Bloques por hora:", resumen);
    console.log("Data from igp_sphi.dat.xz filtered and stored.");
    return filteredData;
  } catch (error) {
    console.error("Error al obtener o procesar los datos SPHI:", error.message);
    // Si hay error, limpia la estructura y actualiza botones
    mapsPRData.igp_sphi_byHourBlock = {};
    hourBtnAvailability();
    hourDropdownAvailability();

    handlerSpinner(false);
  }
}


// [] Update hour button availability ====================================================
function hourBtnAvailability() {
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  document.querySelectorAll('#hourButtonsPR button.tertiaryBtn').forEach((btn) => {
    const hour = parseInt(btn.getAttribute('data-hour'), 10);
    const hasData = (byHourBlock[hour] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      btn.classList.add('tertiaryBtn--disabled');
      btn.disabled = true; // Opcional, útil para accesibilidad
    } else {
      btn.classList.remove('tertiaryBtn--disabled');
      btn.disabled = false;
    }
  });
}

// [] Update hour button availability ====================================================
function hourDropdownAvailability() {

  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  const hourSelect = document.getElementById("hourSelectPR");
  // Limpia primero el select
  hourSelect.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = h.toString().padStart(2, "0") + ":00";
    // Checkea si hay datos en esa hora
    const hasData = (byHourBlock[h] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      option.disabled = true;
      option.classList.add("hourSelectPR__option--disabled");
    }
    hourSelect.appendChild(option);
  }
}

// [H] Captura fecha y obtiene datos ==================================
document
  .getElementById("dateInputMaps")
  .addEventListener("change", async function () {
    const { year, doy } = getSelectedMapDate(this.value);
    console.log(
      "Fecha seleccionada:",
      this.value,
      "Año:",
      year,
      "Día del año (DoY):",
      doy
    );

    handlerSpinner(true);
    await fetchIgpSphiData(year, doy);
    handlerSpinner(false);
  });

// [Z] Getter para obtener el bloque filtrado por hora y bloque de 10 minutos
export function getSphiBlockByHourAndMinute(hour, blockIdx) {
  if (!mapsPRData.igp_sphi_byHourBlock) return null;
  return mapsPRData.igp_sphi_byHourBlock[hour]?.[blockIdx] ?? null;
}


//=======================================================Poner en un Script generico
// [Y] === Poblar selector de horas (0 a 23) ===========================
const hourSelect = document.getElementById("hourSelectPR");
for (let h = 0; h < 24; h++) {
  const option = document.createElement("option");
  option.value = h;
  option.textContent = h.toString().padStart(2, "0") + ":00";
  hourSelect.appendChild(option);
}


// [Y.2] === Desactiva bloques sin datos en el selector de minutos =============
function minuteDropdownAvailability(selectedHour) {
  const blockSelect = document.getElementById("blockSelectPR");
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;

  // Recorre cada opción del selector de minutos
  for (let i = 0; i < blockSelect.options.length; i++) {
    const option = blockSelect.options[i];
    const block = byHourBlock[selectedHour]?.[i];

    const hasData = block && block.data && block.data.length > 0;
    if (!hasData) {
      option.classList.add("no-data");
      option.disabled = true;
    } else {
        option.classList.remove("no-data");
        option.disabled = false;
}
  }
}

// [Y.3] === Listener para actualizar los minutos disponibles cuando cambia la hora
document.getElementById("hourSelectPR").addEventListener("change", function () {
  const selectedHour = parseInt(this.value, 10);
  minuteDropdownAvailability(selectedHour);
});


document.getElementById('blockPrevBtn').addEventListener('mousedown', function(e) {
  e.preventDefault(); // Previene que quede enfocado
  this.blur();
});
document.getElementById('blockNextBtn').addEventListener('mousedown', function(e) {
  e.preventDefault();
  this.blur();
});


*/







/*

import { getSelectedMapDate } from "./mapsPRCalendar.js";

// [A] Variables Globales ============================================
let mapsPRData = {
  igp_sphi: null, // Almacena el JSON de igp_sphi.dat.xz
  igp_roti: null, // Almacena el JSON de igp_roti.dat.xz
};

// [B] Manejo de Fetch Flags =========================================
const isFetching = {
  igp_sphi: false,
  igp_roti: false,
};

// [C] Mostrar/ocultar spinner de carga ==============================
function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessagePRMaps"); // ID del spinner
  spinner.style.display = show ? "flex" : "none";
  console.log(show ? "Spinner mostrado" : "Spinner oculto");
}

// [D] Obtiene datos históricos de igp_sphi.dat.xz ====================
async function fetchRawIgpSphiData(year, doy) {
  if (isFetching.igp_sphi) {
    console.warn("Solicitud SPHI en proceso. Evitando solapamiento.");
    return null;
  }

  isFetching.igp_sphi = true; // Activa el flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-sphi/${year}/${doy}`;
    console.log(`Fetching SPHI data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP para SPHI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_sphi = false; // Desactiva el flag
  }
}

// [E] Obtiene datos históricos de igp_roti.dat.xz ====================
async function fetchRawIgpRotiData(year, doy) {
  if (isFetching.igp_roti) {
    console.warn("Solicitud ROTI en proceso. Evitando solapamiento.");
    return null;
  }

  isFetching.igp_roti = true; // Activa el flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-roti/${year}/${doy}`;
    console.log(`Fetching ROTI data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP para ROTI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_roti = false; // Desactiva el flag
  }
}

// [F] Filtro de datos para SPHI =====================================
function filterSphiData(rawData) {
  return rawData.map((group) => ({
    TIME: group.TIME,
    data: group.data
      .map((cell) => ({
        Longitude: cell.Longitude ?? null,
        Latitude: cell.Latitude ?? null,
        mean_sphi: cell.mean_sphi ?? null,
      }))
      .filter((cell) => cell.Longitude !== null && cell.Latitude !== null),
  }));
}

// [F.1] Agrupa bloques por hora y por bloques de 10 minutos ================ NUEVO

// Agrupa los bloques por hora y bloque de 10 min
function groupByHourAndBlock(filteredData) {
  // Crea objeto resultado: keys 0...23, cada una array de 6 posiciones (null por defecto)
  const byHourBlock = {};
  for (let h = 0; h < 24; h++) byHourBlock[h] = Array(6).fill(null);

  filteredData.forEach((block) => {
    const hour = Math.floor(block.TIME / 3600);
    const blockIdx = Math.floor((block.TIME % 3600) / 600);
    if (hour >= 0 && hour < 24 && blockIdx >= 0 && blockIdx < 6) {
      byHourBlock[hour][blockIdx] = block;
    }
  });

  return byHourBlock;
}

// [G] Funcion principal para SPHI ==================================
export async function fetchIgpSphiData(year, doy) {
  try {
    const rawData = await fetchRawIgpSphiData(year, doy);

    if (!rawData) {
      // Si no hay datos, limpia la estructura y actualiza botones
      mapsPRData.igp_sphi_byHourBlock = {};
      hourBtnAvailability();
      hourDropdownAvailability();
      return null;
    }

    const filteredData = filterSphiData(rawData);
    mapsPRData.igp_sphi = filteredData;

    // Paso 2: Agrupar y guardar en nueva variable
    mapsPRData.igp_sphi_byHourBlock = groupByHourAndBlock(filteredData);
    console.log("Agrupado por hora y bloque (step 2):", mapsPRData.igp_sphi_byHourBlock);

    hourBtnAvailability();
    hourDropdownAvailability();

    // Después de mapsPRData.igp_sphi = filteredData;
    const bloques = mapsPRData.igp_sphi;
    const resumen = {};

    bloques.forEach(b => {
      const h = Math.floor(b.TIME / 3600);
      if (!resumen[h]) resumen[h] = 0;
      resumen[h]++;
    });

    console.log("Bloques por hora:", resumen);
    console.log("Data from igp_sphi.dat.xz filtered and stored.");
    return filteredData;
  } catch (error) {
    console.error("Error al obtener o procesar los datos SPHI:", error.message);
    // Si hay error, limpia la estructura y actualiza botones
    mapsPRData.igp_sphi_byHourBlock = {};
    hourBtnAvailability();
    hourDropdownAvailability();
    handlerSpinner(false);
  }
}


// [] Update hour button availability ====================================================
function hourBtnAvailability() {
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  document.querySelectorAll('#hourButtonsPR button.tertiaryBtn').forEach((btn) => {
    const hour = parseInt(btn.getAttribute('data-hour'), 10);
    const hasData = (byHourBlock[hour] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      btn.classList.add('tertiaryBtn--disabled');
      btn.disabled = true; // Opcional, útil para accesibilidad
    } else {
      btn.classList.remove('tertiaryBtn--disabled');
      btn.disabled = false;
    }
  });
}

// [] Update hour button availability ====================================================
function hourDropdownAvailability() {

  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  const hourSelect = document.getElementById("hourSelectPR");
  // Limpia primero el select
  hourSelect.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = h.toString().padStart(2, "0") + ":00";
    // Checkea si hay datos en esa hora
    const hasData = (byHourBlock[h] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      option.disabled = true;
      option.classList.add("hourSelectPR__option--disabled");
    }
    hourSelect.appendChild(option);
  }
}

// [H] Captura fecha y obtiene datos ==================================
document
  .getElementById("dateInputMaps")
  .addEventListener("change", async function () {
    const { year, doy } = getSelectedMapDate(this.value);
    console.log(
      "Fecha seleccionada:",
      this.value,
      "Año:",
      year,
      "Día del año (DoY):",
      doy
    );

    handlerSpinner(true);
    await fetchIgpSphiData(year, doy);
    handlerSpinner(false);
  });

// [Z] Getter para obtener el bloque filtrado por hora y bloque de 10 minutos
export function getSphiBlockByHourAndMinute(hour, blockIdx) {
  if (!mapsPRData.igp_sphi_byHourBlock) return null;
  return mapsPRData.igp_sphi_byHourBlock[hour]?.[blockIdx] ?? null;
}


//=======================================================Poner en un Script generico
// [Y] === Poblar selector de horas (0 a 23) ===========================
const hourSelect = document.getElementById("hourSelectPR");
for (let h = 0; h < 24; h++) {
  const option = document.createElement("option");
  option.value = h;
  option.textContent = h.toString().padStart(2, "0") + ":00";
  hourSelect.appendChild(option);
}



// [Y.1] === Poblar selector de bloques de 10 minutos (0 a 5) ==========
const blockSelect = document.getElementById("blockSelectPR");
for (let b = 0; b < 6; b++) {
  const option = document.createElement("option");
  option.value = b;
  option.textContent = (b * 10).toString().padStart(2, "0") + " min";
  blockSelect.appendChild(option);
}


document.getElementById('blockPrevBtn').addEventListener('mousedown', function(e) {
  e.preventDefault(); // Previene que quede enfocado
  this.blur();
});
document.getElementById('blockNextBtn').addEventListener('mousedown', function(e) {
  e.preventDefault();
  this.blur();
});

*/


/*


import { getSelectedMapDate } from "./mapsPRCalendar.js";

// [A] Variables Globales ============================================
let mapsPRData = {
  igp_sphi: null, // Almacena el JSON de igp_sphi.dat.xz
  igp_roti: null, // Almacena el JSON de igp_roti.dat.xz
};

// [B] Manejo de Fetch Flags =========================================
const isFetching = {
  igp_sphi: false,
  igp_roti: false,
};

// [C] Mostrar/ocultar spinner de carga ==============================
function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessagePRMaps"); // ID del spinner
  spinner.style.display = show ? "flex" : "none";
  console.log(show ? "Spinner mostrado" : "Spinner oculto");
}

// [D] Obtiene datos históricos de igp_sphi.dat.xz ====================
async function fetchRawIgpSphiData(year, doy) {
  if (isFetching.igp_sphi) {
    console.warn("Solicitud SPHI en proceso. Evitando solapamiento.");
    return null;
  }

  isFetching.igp_sphi = true; // Activa el flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-sphi/${year}/${doy}`;
    console.log(`Fetching SPHI data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP para SPHI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_sphi = false; // Desactiva el flag
  }
}

// [E] Obtiene datos históricos de igp_roti.dat.xz ====================
async function fetchRawIgpRotiData(year, doy) {
  if (isFetching.igp_roti) {
    console.warn("Solicitud ROTI en proceso. Evitando solapamiento.");
    return null;
  }

  isFetching.igp_roti = true; // Activa el flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-roti/${year}/${doy}`;
    console.log(`Fetching ROTI data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP para ROTI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_roti = false; // Desactiva el flag
  }
}

// [F] Filtro de datos para SPHI =====================================
function filterSphiData(rawData) {
  return rawData.map((group) => ({
    TIME: group.TIME,
    data: group.data
      .map((cell) => ({
        Longitude: cell.Longitude ?? null,
        Latitude: cell.Latitude ?? null,
        mean_sphi: cell.mean_sphi ?? null,
      }))
      .filter((cell) => cell.Longitude !== null && cell.Latitude !== null),
  }));
}

// [F.1] Agrupa bloques por hora y por bloques de 10 minutos ================ NUEVO

// Agrupa los bloques por hora y bloque de 10 min
function groupByHourAndBlock(filteredData) {
  // Crea objeto resultado: keys 0...23, cada una array de 6 posiciones (null por defecto)
  const byHourBlock = {};
  for (let h = 0; h < 24; h++) byHourBlock[h] = Array(6).fill(null);

  filteredData.forEach((block) => {
    const hour = Math.floor(block.TIME / 3600);
    const blockIdx = Math.floor((block.TIME % 3600) / 600);
    if (hour >= 0 && hour < 24 && blockIdx >= 0 && blockIdx < 6) {
      byHourBlock[hour][blockIdx] = block;
    }
  });

  return byHourBlock;
}

// [G] Funcion principal para SPHI ==================================
export async function fetchIgpSphiData(year, doy) {
  try {
    const rawData = await fetchRawIgpSphiData(year, doy);
    if (!rawData) return null;

    const filteredData = filterSphiData(rawData);
    mapsPRData.igp_sphi = filteredData;

    // Paso 2: Agrupar y guardar en nueva variable
    mapsPRData.igp_sphi_byHourBlock = groupByHourAndBlock(filteredData);
    console.log("Agrupado por hora y bloque (step 2):", mapsPRData.igp_sphi_byHourBlock);

    hourBtnAvailability();

    // Después de mapsPRData.igp_sphi = filteredData;
    const bloques = mapsPRData.igp_sphi;
    const resumen = {};

    bloques.forEach(b => {
      const h = Math.floor(b.TIME / 3600);
      if (!resumen[h]) resumen[h] = 0;
      resumen[h]++;
    });

    console.log("Bloques por hora:", resumen);
    console.log("Data from igp_sphi.dat.xz filtered and stored.");
    return filteredData;
  } catch (error) {
    console.error("Error al obtener o procesar los datos SPHI:", error.message);
    handlerSpinner(false);
  }
}

// [] Update hour button availability ====================================================
function hourBtnAvailability() {
  const byHourBlock = mapsPRData.igp_sphi_byHourBlock;
  document.querySelectorAll('#hourButtonsPR button.tertiaryBtn').forEach((btn) => {
    const hour = parseInt(btn.getAttribute('data-hour'), 10);
    const hasData = (byHourBlock[hour] || []).some(b => b && b.data && b.data.length > 0);
    if (!hasData) {
      btn.classList.add('tertiaryBtn--disabled');
      btn.disabled = true; // Opcional, útil para accesibilidad
    } else {
      btn.classList.remove('tertiaryBtn--disabled');
      btn.disabled = false;
    }
  });
}



// [H] Captura fecha y obtiene datos ==================================
document
  .getElementById("dateInputMaps")
  .addEventListener("change", async function () {
    const { year, doy } = getSelectedMapDate(this.value);
    console.log(
      "Fecha seleccionada:",
      this.value,
      "Año:",
      year,
      "Día del año (DoY):",
      doy
    );

    handlerSpinner(true);
    await fetchIgpSphiData(year, doy);
    handlerSpinner(false);
  });

// [Z] Getter para obtener el bloque filtrado por hora y bloque de 10 minutos
export function getSphiBlockByHourAndMinute(hour, blockIdx) {
  if (!mapsPRData.igp_sphi_byHourBlock) return null;
  return mapsPRData.igp_sphi_byHourBlock[hour]?.[blockIdx] ?? null;
}






*/


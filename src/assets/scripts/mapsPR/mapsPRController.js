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


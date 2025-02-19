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

// [G] Funcion principal para SPHI ==================================
export async function fetchIgpSphiData(year, doy) {
  try {
    const rawData = await fetchRawIgpSphiData(year, doy);
    if (!rawData) return null;

    const filteredData = filterSphiData(rawData);
    mapsPRData.igp_sphi = filteredData;
    console.log("Data from igp_sphi.dat.xz filtered and stored.");
    return filteredData;
  } catch (error) {
    console.error("Error al obtener o procesar los datos SPHI:", error.message);
    handlerSpinner(false);
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

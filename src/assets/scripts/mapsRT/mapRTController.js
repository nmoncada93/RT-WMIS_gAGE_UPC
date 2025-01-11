// [A] Funcion para obtener datos RAW del backend =====================================
// [A.1] Fetch para SPHI
async function fetchRawSphiData() {
  if (isFetching.sphi) {
    console.warn("Solicitud SPHI en proceso. Evitando solapamiento.");
    return null; // Evita solicitudes simultáneas
  }

  isFetching.sphi = true; // Activa el flag
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/mapsRT/read-igp-sphi`);
    if (!response.ok) {
      throw new Error(`Error HTTP para SPHI: ${response.status}`);
    }
    return await response.json();
  } finally {
    isFetching.sphi = false;
  }
}

// [A.2] Fetch para ROTI
async function fetchRawRotiData() {
  if (isFetching.roti) {
    console.warn("Solicitud ROTI en proceso. Evitando solapamiento.");
    return null; // Evita solicitudes simultáneas
  }

  isFetching.roti = true; // Activa el flag
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/mapsRT/read-igp-roti`);
    if (!response.ok) {
      throw new Error(`Error HTTP para ROTI: ${response.status}`);
    }
    return await response.json();
  } finally {
    isFetching.roti = false;
  }
}

// [A.3] Fetch para S4
async function fetchRawS4Data() {
  if (isFetching.s4) {
    console.warn("Solicitud S4 en proceso. Evitando solapamiento.");
    return null; // Evita solicitudes simultáneas
  }

  isFetching.s4 = true; // Activa el flag
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/mapsRT/read-igp-roti`);
    if (!response.ok) {
      throw new Error(`Error HTTP para S4: ${response.status}`);
    }
    return await response.json();
  } finally {
    isFetching.s4 = false;
  }
}

// [B] Funcion para filtrar y estructurar los datos ========================================
// [B.1] Filtro para SPHI
function filterSphiData(rawData) {
  const latestTime = Math.max(...rawData.map(group => group.TIME));
  const latestGroup = rawData.find(group => group.TIME === latestTime);

  if (!latestGroup) {
    console.error("No se encontró bloque de datos TIME para SPHI...");
    return [];
  }

  return [
    {
      TIME: latestGroup.TIME,
      data: latestGroup.data
        .map(cell => ({
          Longitude: cell.Longitude ?? null,
          Latitude: cell.Latitude ?? null,
          mean_sphi: cell.mean_sphi ?? null,
        }))
        .filter(cell => cell.Longitude !== null && cell.Latitude !== null),
    },
  ];
}

// [B.2] Filtro para ROTI
function filterRotiData(rawData) {
  const latestTime = Math.max(...rawData.map(group => group.TIME));
  const latestGroup = rawData.find(group => group.TIME === latestTime);

  if (!latestGroup) {
    console.error("No se encontró bloque de datos TIME para ROTI...");
    return [];
  }

  return [
    {
      TIME: latestGroup.TIME,
      data: latestGroup.data
        .map(cell => ({
          Longitude: cell.Longitude ?? null,
          Latitude: cell.Latitude ?? null,
          mean_roti: cell.mean_roti ?? null,
        }))
        .filter(cell => cell.Longitude !== null && cell.Latitude !== null),
    },
  ];
}

// [B.3] Filtro para S4
function filterS4Data(rawData) {
  const latestTime = Math.max(...rawData.map(group => group.TIME));
  const latestGroup = rawData.find(group => group.TIME === latestTime);

  if (!latestGroup) {
    console.error("No se encontró bloque de datos TIME para S4...");
    return [];
  }

  return [
    {
      TIME: latestGroup.TIME,
      data: latestGroup.data
        .map(cell => ({
          Longitude: cell.Longitude ?? null,
          Latitude: cell.Latitude ?? null,
          mean_s4: cell.mean_s4 ?? null,
        }))
        .filter(cell => cell.Longitude !== null && cell.Latitude !== null),
    },
  ];
}

// [C] Funcion principal para obtener y procesar los datos ======================================
// [C.1] Para SPHI
  export async function fetchIgpSphiData() {
  try {
    const rawData = await fetchRawSphiData();
    if (!rawData) return null;

    return filterSphiData(rawData);
  } catch (error) {
    console.error("Error al obtener o procesar los datos SPHI:", error.message);
  }
}

// [C.2] Para ROTI
export async function fetchIgpRotiData() {
  try {
    const rawData = await fetchRawRotiData();
    if (!rawData) return null;

    return filterRotiData(rawData);
  } catch (error) {
    console.error("Error al obtener o procesar los datos ROTI:", error.message);
  }
}

// [C.3] Para S4
export async function fetchIgpS4Data() {
  try {
    const rawData = await fetchRawS4Data();
    if (!rawData) return null;

    return filterS4Data(rawData);
  } catch (error) {
    console.error("Error al obtener o procesar los datos S4:", error.message);
  }
}

// [GLOBAL] Flag para manejar solicitudes individuales
const isFetching = {
  sphi: false,
  roti: false,
  s4: false,
};


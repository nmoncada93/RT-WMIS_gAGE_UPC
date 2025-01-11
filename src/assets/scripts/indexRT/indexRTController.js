import { renderChart } from './indexRTChart.js';

// [A] Variables Globales =========================================================
let realTimeData = {
  sphi: null,  // Almacena el JSON de sphi.tmp
  roti: null   // Almacena el JSON de roti.tmp
};
let activeIndex = null;
let selectedStation = "";
let isFetching = false;
let lastDataHash = null;
let fetchInterval = null;

// [B] Obtiene datos de sphi.tmp ==================================================
async function fetchSphiData() {
  const url = `http://127.0.0.1:5000/api/indexRT/read-sphi`;
  console.log("Fetch Request Enviada a Sphi");
  toggleLoadingText(true);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Error obtaining sphi.tmp for selected date");
    }

    const data = await response.json();
    realTimeData.sphi = data;
    console.log("Data from sphi.tmp obtained and stored");
    updateStationSelector(data);
    console.log("Actualizando selector de estaciones desde Fetch de SPHI");
    toggleLoadingText(false);
    return data;
  }

  catch (error) {
    console.error("Error during sphi.tmp request:", error);
    handleNoData("No data available for the selected date. Please try again later or choose another date!");
  }
}

// [C] Obtiene datos de roti.tmp ===================================================
async function fetchRotiData() {

  const url = `http://127.0.0.1:5000/api/indexRT/read-roti`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Error obtaining roti.tmp for selected date");
    }

    const data = await response.json();
    realTimeData.roti = data;
    console.log("Data from roti.tmp obtained and stored");

    showIndexButtons();
    return data;
  }

  catch (error) {
    console.error("Error during roti.tmp request:", error);
    handleNoData("No data available for the selected date. Please try again later or choose another date!");
  }
}

// [D] Detecta estacion seleccionada =================================================
function detectSelectedStation() {
  const stationSelector = document.getElementById("stationSelector");
  selectedStation = stationSelector.value;
  console.log("Estación seleccionada:", selectedStation);
}

// [E] Actualiza estaciones en el selector ===========================================
function updateStationSelector(data) {
  const stationSelector = document.getElementById("stationSelector");
  const availableStations = data.map(item => item[1]);  // Lista de estaciones disponibles

  Array.from(stationSelector.options).forEach(option => {
    const isAvailable = availableStations.includes(option.value);  // Verifica
    option.disabled = !isAvailable;
    option.classList.toggle('selectOption--disabled', !isAvailable);

    option.style.color = isAvailable ? 'white' : 'red';
  });
}

// [F] Marca boton activo y desactiva el resto ============================================
function setActiveButton(button) {
  const buttons = document.querySelectorAll(".primaryRTBtn");
  buttons.forEach(btn => btn.classList.remove("active-button"));
  button.classList.add("active-button");
}

// [G] Muestra botones INDEX solo si hay estación seleccionada y datos cargados ============
function showIndexButtons() {
  const buttons = document.querySelectorAll('.primaryRTBtn');
  const s4Button = document.getElementById("s4Button");
  const rotiButton = document.getElementById("rotiButton");

  if (selectedStation) {
    // Muestra SPHI solo si sphi.tmp esta cargado
    buttons.forEach(btn => {
      if (btn.id === "sphiButton") {
        btn.style.display = realTimeData.sphi ? 'inline-block' : 'none';
      }
    });

    // Muestra S4 y ROTI solo si roti.tmp está cargado
    const showRotiButtons = realTimeData.roti ? 'inline-block' : 'none';
    s4Button.style.display = showRotiButtons;
    rotiButton.style.display = showRotiButtons;
  }
}

// [H] Verifica y actualiza datos SOLO si han cambiado ===================================
async function checkAndUpdateData() {
  if (isFetching) return;
  isFetching = true;
  let newData;

  // Realiza fetch dependiendo del índice activo
  if (activeIndex === 'sphi') {
    newData = await fetchSphiData();
  } else if (activeIndex === 'roti' || activeIndex === 's4') {
    newData = await fetchRotiData();
  } else {
    console.log("No active index to fetch data.");
    isFetching = false;
    return;
  }

  // Si hay datos nuevos, calcula el hash y compara
  if (newData && newData.length > 0) {
    const newHash = JSON.stringify(newData);

    if (lastDataHash !== newHash) {
      // Actualiza la data correspondiente
      if (activeIndex === 'sphi') {
        realTimeData.sphi = newData;
      } else {
        realTimeData.roti = newData;
      }

      lastDataHash = newHash;  // Guarda el nuevo hash
      console.log("Data updated - Changes detected.");

      // Re-renderiza el grafico SOLO si hay datos nuevos
      if (selectedStation) {
        console.log("Re-renderizando gráfico con datos actualizados...");
        renderChart(newData, selectedStation, activeIndex);
      }
    } else {
      console.log("Data is up to date.");
    }
  }
  isFetching = false;
}

// [I] Iniciar el fetch automático REAL-TIME ================================================
function startAutoFetch() {
  if (!fetchInterval) {
    fetchInterval = setInterval(checkAndUpdateData, 10000);
    console.log("Auto fetch started...");
  }
}

// [J] Detiene autofetch REAL-TIME ===========================================================
function stopAutoFetch() {
  if (fetchInterval) {
    clearInterval(fetchInterval);
    fetchInterval = null;
    console.log("Auto fetch stopped.");
  }
}

// [K] Texto de carga selector de estacion ====================================================
function toggleLoadingText(isLoading) {
  const stationSelector = document.getElementById("stationSelector");
  const defaultOption = stationSelector.querySelector('.selectOption--disabled');

  if (isLoading) {
    defaultOption.textContent = "Loading stations...";
  } else {
    defaultOption.textContent = "Scroll down to select station";
  }
}

// [L] Muestra/oculta boton Reset ==========================================================
function toggleResetButton(show) {
  const resetButton = document.getElementById("closeChartButton");
  resetButton.style.display = show ? 'inline-block' : 'none';
}

// [M] Detiene fetch, oculta grafico ========================================================
function resetChart() {
  stopAutoFetch();
  const chartContainer = document.getElementById("indexRTContainer");
  if (chartContainer) {
    chartContainer.style.display = 'none';
    console.log("RESET: Fetch detenido y gráfico oculto.");
  } else {
    console.warn("El contenedor del gráfico no existe.");
  }

  //Resetea selector de estaciones
  const stationSelector = document.getElementById("stationSelector");
  stationSelector.selectedIndex = 0;

  // Oculta botones de índice
  const indexButtons = document.querySelectorAll('.primaryRTBtn');
  indexButtons.forEach(btn => {
    btn.style.display = 'none';
    btn.classList.remove('active-button');
  });

}

//=======================================================================================
//==============================  LISTENERS =============================================
//=======================================================================================


// [N] Captura estacion renderizasi hay índice activo ==========================================
document.getElementById("stationSelector").addEventListener("change", function () {
  detectSelectedStation();
  showIndexButtons();
  if (activeIndex) {
    const dataToRender = activeIndex === 's4' ? realTimeData['roti'] : realTimeData[activeIndex];
    if (dataToRender) {
      console.log ("[I] Intentando renderizar");

      renderChart(dataToRender, selectedStation, activeIndex);
      toggleResetButton(true);
    }
  }
});

// [M1] Render Chart for SPHI Index ============================================================
document.getElementById("sphiButton").addEventListener("click", function () {
  stopAutoFetch();
  if (realTimeData.sphi && selectedStation) {
    activeIndex = 'sphi';
    document.getElementById("indexRTContainer").style.display = 'flex';
    renderChart(realTimeData.sphi, selectedStation, 'sphi');
    setActiveButton(this);
    startAutoFetch();
    document.getElementById("closeChartButton").style.display = 'inline-block';
  } else {
    console.log("Selecciona una estación antes de generar el gráfico.");
  }
});

// [M2] Render Chart for ROTI Index ============================================================
document.getElementById("rotiButton").addEventListener("click", function () {
  stopAutoFetch();
  if (realTimeData.roti && selectedStation) {
    activeIndex = 'roti';
    document.getElementById("indexRTContainer").style.display = 'flex';
    renderChart(realTimeData.roti, selectedStation, 'roti');
    setActiveButton(this);
    startAutoFetch();
    document.getElementById("closeChartButton").style.display = 'inline-block';
  } else {
    console.log("Selecciona una estación antes de generar el gráfico.");
  }
});

// [M3] Render Chart for S4 Index ==============================================================
document.getElementById("s4Button").addEventListener("click", function () {
  stopAutoFetch();
  if (realTimeData.roti && selectedStation) {
    activeIndex = 's4';
    document.getElementById("indexRTContainer").style.display = 'flex';
    renderChart(realTimeData.roti, selectedStation, 's4');
    setActiveButton(this);
    startAutoFetch();
    document.getElementById("closeChartButton").style.display = 'inline-block';
  } else {
    console.log("Selecciona una estación antes de generar el gráfico.");
  }
});

// [O] Evento para ejecutar el fetch ============================================================
document.getElementById("stationSelector").addEventListener("focus", function () {
  console.log("Evento FOCUS del selector de estaciones");
  fetchSphiData();
  fetchRotiData();
});

const resetButton = document.getElementById("closeChartButton");
if (resetButton) {
  resetButton.addEventListener("click", function () {
    resetChart();
    toggleResetButton(false);
  });
} else {
  console.warn("El botón de reset no existe en el DOM.");
}


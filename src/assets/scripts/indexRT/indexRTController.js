import { renderChart } from "./indexRTChart.js";

// [A] Variables Globales =========================================================
let realTimeData = {
  sphi: null, // Almacena el JSON de sphi.tmp
  roti: null, // Almacena el JSON de roti.tmp
};
let activeIndex = null;
let selectedStation = "";
let isFetching = false;
let lastDataHash = null;
let fetchInterval = null;

// [B] Fetch SPHI data from backend =============================================
async function fetchSphiData() {
  const url = `http://127.0.0.1:5000/api/indexRT/read-sphi`;
  //const url = `https://gage1.upc.edu/api/indexRT/read-sphi`;
  console.log("[SPHI] Fetch request sent...");

  toggleLoadingText(true);

  try {
    const response = await fetch(url);
    handlerSpinner(true);

    if (!response.ok) {
      updateIndexLed("sphi",  false);
      toggleConnectionAlert(true); 
      handlerSpinner(false);
      console.error(`[SPHI] ❌ Backend responded with status ${response.status}`);
      throw new Error("Non-OK response");
    }

    const data = await response.json();
    updateIndexLed("sphi",  true);
    toggleConnectionAlert(false);
    toggleStatusBoxRT(true);
    console.log("[SPHI] ✅ Data received successfully");

    realTimeData.sphi = data;
    updateStationSelector(data);
    toggleLoadingText(false);
    handlerSpinner(false);

    return true;

  } catch (error) {
    updateIndexLed("sphi",  false);
    toggleConnectionAlert(true); 
    handlerSpinner(false);

    // [X.1] Reset station selector if fetch fails
    const stationSelector = document.getElementById("stationSelector");
    if (stationSelector) {
      stationSelector.selectedIndex = 0; // Resetea a opción inicial
    }

    console.error("[SPHI] 🚨 Connection failed or RAW data missing:", error.message);
    return false;
  }
}

// [C] Fetch ROTI data from backend =============================================
async function fetchRotiData() {
  const url = `http://127.0.0.1:5000/api/indexRT/read-roti`;
  //const url = `https://gage1.upc.edu/api/indexRT/read-roti`;
  console.log("[ROTI] Fetch request sent...");

  try {
    const response = await fetch(url);

    if (!response.ok) {
      updateIndexLed("roti",  false);
      updateIndexLed("s4",  false);
      console.error(`[ROTI] ❌ Backend responded with status ${response.status}`);
      throw new Error("Non-OK response");
    }

    const data = await response.json();
    updateIndexLed("roti",  true);
    updateIndexLed("s4",  true);
    console.log("[ROTI] ✅ Data received successfully");

    realTimeData.roti = data;
    showIndexButtons();

    return true;
  } catch (error) {
    console.error("[ROTI] 🚨 Connection failed or roti.tmp missing:", error.message);
    return false;
  }
}

// [D] Detecta estacion seleccionada =================================================
function detectSelectedStation() {
  const stationSelector = document.getElementById("stationSelector");
  selectedStation = stationSelector.value;
  //console.log("Estación seleccionada:", selectedStation);
}

// [E] Actualiza estaciones en el selector ===========================================
function updateStationSelector(data) {
  const stationSelector = document.getElementById("stationSelector");
  const availableStations = data.map((item) => item[1]); // Lista de estaciones disponibles

  Array.from(stationSelector.options).forEach((option) => {
    const isAvailable = availableStations.includes(option.value); // Verifica
    option.disabled = !isAvailable;
    option.classList.toggle("selectOption--disabled", !isAvailable);

    option.style.color = isAvailable ? "white" : "red";
  });
}

// [F] Marca boton activo y desactiva el resto ============================================
function setActiveButton(button) {
  const buttons = document.querySelectorAll(".primaryRTBtn");
  buttons.forEach((btn) => btn.classList.remove("active-button"));
  button.classList.add("active-button");
}

// [G] Muestra botones INDEX solo si hay estación seleccionada y datos cargados ============
function showIndexButtons() {
  const buttons = document.querySelectorAll(".primaryRTBtn");
  const s4Button = document.getElementById("s4Button");
  const rotiButton = document.getElementById("rotiButton");

  if (selectedStation) {
    // Muestra SPHI solo si sphi.tmp esta cargado
    buttons.forEach((btn) => {
      if (btn.id === "sphiButton") {
        btn.style.display = realTimeData.sphi ? "inline-block" : "none";
      }
    });

    // Muestra S4 y ROTI solo si roti.tmp está cargado
    const showRotiButtons = realTimeData.roti ? "inline-block" : "none";
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
  if (activeIndex === "sphi") {
    newData = await fetchSphiData();
  } else if (activeIndex === "roti" || activeIndex === "s4") {
    newData = await fetchRotiData();
  } else {
    console.log("No active index to fetch data.");
    //updateIndexLed("sphi", false);
    //updateIndexLed("roti", false);
    //updateIndexLed("s4", false);

    isFetching = false;
    return;
  }

  // Si hay datos nuevos, calcula el hash y compara
  if (newData && newData.length > 0) {
    const newHash = JSON.stringify(newData);

    if (lastDataHash !== newHash) {
      // Actualiza la data correspondiente
      if (activeIndex === "sphi") {
        realTimeData.sphi = newData;
      } else {
        realTimeData.roti = newData;
      }

      lastDataHash = newHash; // Guarda el nuevo hash
      console.log("Data updated - Changes detected.");

      // Re-renderiza el grafico SOLO si hay datos nuevos
      if (selectedStation) {
        console.log("Re-renderizando gráfico con datos actualizados...");
        renderChart(newData, selectedStation, activeIndex);
      }
    } else {
      //updateIndexLed("roti", false);
      //updateIndexLed("sphi", false);
      //updateIndexLed("s4", false);
      console.log("Data is up to date.");
    }
  }
  isFetching = false;
}

// [I] Iniciar el fetch automático REAL-TIME ================================================
function startAutoFetch() {
  if (!fetchInterval) {
    fetchInterval = setInterval(checkAndUpdateData, 8000);
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
  const defaultOption = stationSelector.querySelector(
    ".selectOption--disabled"
  );

  if (isLoading) {
    defaultOption.textContent = "Loading stations...";
  } else {
    defaultOption.textContent = "Scroll down to select station";
  }
}

// [L] Muestra/oculta boton Reset ==========================================================
function toggleResetButton(show) {
  const resetButton = document.getElementById("closeChartButton");
  resetButton.style.display = show ? "inline-block" : "none";
}

// [M] Detiene fetch, oculta grafico ========================================================
function resetChart() {
  stopAutoFetch();
  const chartContainer = document.getElementById("indexRTContainer");
  if (chartContainer) {
    chartContainer.style.display = "none";
    console.log("RESET: Fetch detenido y gráfico oculto.");
  } else {
    console.warn("El contenedor del gráfico no existe.");
  }

  //Resetea selector de estaciones
  const stationSelector = document.getElementById("stationSelector");
  stationSelector.selectedIndex = 0;

  // Oculta botones de índice
  const indexButtons = document.querySelectorAll(".primaryRTBtn");
  indexButtons.forEach((btn) => {
    btn.style.display = "none";
    btn.classList.remove("active-button");
  });
}

// [N] LED Real-Time Status ========================================================
function updateIndexLed(index, isOk) {
  const ledMap = {
    sphi: document.getElementById("ledSphi"),
    roti: document.getElementById("ledRoti"),
    s4: document.getElementById("ledS4"),
  };

  const led = ledMap[index];
  if (!led) return;

  led.classList.remove("statusLed--ok", "statusLed--error");

  if (isOk) {
    led.classList.add("statusLed--ok");
    led.title = `${index.toUpperCase()} receiving data`;
  } else {
    led.classList.add("statusLed--error");
    led.title = `${index.toUpperCase()} no data`;
  }
}

/*
// [I] Show/hide spinner in Real-Time section ========================================
function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessageRTindex");
  if (spinner) {
    spinner.style.display = show ? "flex" : "none";
    console.log(show ? "[RT] Spinner ON" : "[RT] Spinner OFF");
  }
}*/

// [I] Show/hide spinner in Real-Time section ========================================
function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessageRTindex");
  const chartContainer = document.getElementById("indexRTContainer");

  // Usa getComputedStyle para obtener el valor real del display
  const chartVisible = chartContainer && window.getComputedStyle(chartContainer).display !== "none";

  /*if (show && chartVisible) {
    console.log("[RT] Spinner skipped because chart is visible");
    return;
  }*/

  if (spinner) {
    spinner.style.display = show ? "flex" : "none";
  }
}

// [Z] Show Real-Time LED container only if SPHI is loaded ==========================
function toggleStatusBoxRT(show) {
  const box = document.querySelector(".statusBoxRTIndex");
  if (box) {
    box.style.display = show ? "flex" : "none";
  }
}

// [X] Show or hide connection error message =======================================
function toggleConnectionAlert(show) {
  const alertBox = document.getElementById("alertConnectionLost");
  if (!alertBox) return;

  alertBox.style.display = show ? "block" : "none";
}

//=======================================================================================
//==============================  LISTENERS =============================================
//=======================================================================================

// [N] Captura estacion renderizasi hay índice activo ==========================================
document
  .getElementById("stationSelector")
  .addEventListener("change", function () {
    detectSelectedStation();
    showIndexButtons();
    if (activeIndex) {
      const dataToRender =
        activeIndex === "s4" ? realTimeData["roti"] : realTimeData[activeIndex];
      if (dataToRender) {
        console.log("[I] Intentando renderizar");

        renderChart(dataToRender, selectedStation, activeIndex);
        toggleResetButton(true);
      }
    }
  });

// [M1] Render Chart for SPHI Index ============================================================
document.getElementById("sphiButton").addEventListener("click", function () {
  stopAutoFetch();
  if (realTimeData.sphi && selectedStation) {
    activeIndex = "sphi";
    document.getElementById("indexRTContainer").style.display = "flex";
    renderChart(realTimeData.sphi, selectedStation, "sphi");
    setActiveButton(this);
    startAutoFetch();
    updateIndexLed("sphi", true);
    document.getElementById("closeChartButton").style.display = "inline-block";

  } else {
    updateIndexLed("sphi", false);
    console.log("Selecciona una estación antes de generar el gráfico.");
  }
});

// [M2] Render Chart for ROTI Index ============================================================
document.getElementById("rotiButton").addEventListener("click", function () {
  stopAutoFetch();
  if (realTimeData.roti && selectedStation) {
    activeIndex = "roti";
    document.getElementById("indexRTContainer").style.display = "flex";
    renderChart(realTimeData.roti, selectedStation, "roti");
    setActiveButton(this);
    startAutoFetch();
    updateIndexLed("roti", true);
    document.getElementById("closeChartButton").style.display = "inline-block";

  } else {
    updateIndexLed("roti", false);
    console.log("Selecciona una estación antes de generar el gráfico.");
  }
});

// [M3] Render Chart for S4 Index ==============================================================
document.getElementById("s4Button").addEventListener("click", function () {
  stopAutoFetch();
  if (realTimeData.roti && selectedStation) {
    activeIndex = "s4";
    document.getElementById("indexRTContainer").style.display = "flex";
    renderChart(realTimeData.roti, selectedStation, "s4");
    setActiveButton(this);
    startAutoFetch();
    updateIndexLed("s4", true);
    document.getElementById("closeChartButton").style.display = "inline-block";

  } else {
    updateIndexLed("s4", false);
    console.log("Selecciona una estación antes de generar el gráfico.");
  }
});

// [O] Evento para ejecutar el fetch ============================================================
document
  .getElementById("stationSelector")
  .addEventListener("focus", function () {
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

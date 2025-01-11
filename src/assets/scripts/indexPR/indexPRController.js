import { renderChart, resetChart } from './indexPRChart.js';
import { getSelectedDate, processIndexData } from './indexPRUnxz.js';

// [A] Variables Globales ============================================
let pastRecordsData = {
  sphi: null,  // Almacena el JSON de sphi.tmp
  roti: null   // Almacena el JSON de roti.tmp
};
let activeIndex = null;
let selectedStation = "";
let activeChart = null;

// [B] Obtiene datos de sphi.tmp =====================================
async function fetchSphiData(year, doy) {
  const url = `http://127.0.0.1:5000/api/indexPR/read-sphi/${year}/${doy}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Error obtaining sphi.tmp for selected date");
    }

    const data = await response.json();
    pastRecordsData.sphi = data;
    console.log("Data from sphi.tmp obtained and stored");

    return data;
  } catch (error) {
    console.error("Error during sphi.tmp request:", error);
    handleNoData("No data available for the selected date. Please try again, later or choose another date!");
  }
}

// [C] Obtiene datos de roti.tmp =====================================
async function fetchRotiData(year, doy) {

  const url = `http://127.0.0.1:5000/api/indexPR/read-roti/${year}/${doy}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Error obtaining roti.tmp for selected date");
    }

    const data = await response.json();
    pastRecordsData.roti = data;
    console.log("Data from roti.tmp obtained and stored");

    const stationSelector = document.getElementById("pastStationSelector");
    stationSelector.style.display = 'block';
    updateStationSelector(data);

    return data;
  } catch (error) {
    console.error("Error during roti.tmp request:", error);
    handleNoData("No data available for the selected date. Please try again, later or choose another date!");
  }
}

// [D] Detecta estacion seleccionada =================================================
function detectSelectedStation() {
  const stationSelector = document.getElementById("pastStationSelector");
  selectedStation = stationSelector.value;
  console.log("Estación seleccionada:", selectedStation);
}

// [E] Actualiza estaciones en el selector ===========================================
function updateStationSelector(data) {
  const stationSelector = document.getElementById("pastStationSelector");
  const availableStations = data.map(item => item[1]);  // Extrae estaciones
  handlerSpinner(false);

  Array.from(stationSelector.options).forEach(option => {
    const stationCode = option.value;
    if (!availableStations.includes(stationCode)) {
      option.classList.add('no-data');
      option.disabled = true;
    } else {
      option.classList.remove('no-data');
      option.disabled = false;
    }
  });
}

// [F] Marca boton activo y desactiva el resto ========================================
function setActiveButton(button) {
  const buttons = document.querySelectorAll(".primaryPRBtn");
  buttons.forEach(btn => btn.classList.remove("active-button"));
  button.classList.add("active-button");
}

// [G] Resetear el estado de UI al hacer focus en el calendario
function resetUI() {
  const stationSelector = document.getElementById("pastStationSelector");
  document.getElementById("indexPRContainer").style.display = 'none';
  stationSelector.style.display = 'none';

  // Elimina gráfico activo si existe
  if (activeChart) {
    activeChart.dispose();
    activeChart = null;
    console.log("Gráfico eliminado.");
  }
  stationSelector.value = "";

  // Desactiva y oculta todos los botones
  const buttons = document.querySelectorAll(".primaryPRBtn");
  buttons.forEach(btn => {
    btn.classList.remove("active-button");
    btn.style.display = 'none';
  });

  // Reinicia Indice activo
  activeIndex = null;
}

// [H] Muestra botones INDEX solo si hay estación seleccionada y datos cargados ============
function showIndexButtons() {
  const buttons = document.querySelectorAll('.primaryPRBtn');

  if (selectedStation && (pastRecordsData.sphi || pastRecordsData.roti)) {
    buttons.forEach(btn => {
      btn.style.display = 'inline-block';
    });
  }
}

// [I] Mostrar/ocultar spinner de carga ====================================================
function handlerSpinner(show) {
  const spinner = document.getElementById('loadingMessagePRindex');
  spinner.style.display = show ? 'flex' : 'none';
  console.log(show ? "Spinner mostrado" : "Spinner oculto");
}

// [J] Función para manejar errores de datos o solicitudes fallidas ========================
function handleNoData(message = "No data available for the selected date.") {
  const noDataMessage = document.getElementById('noDataMessagePRindex');
  handlerSpinner(false);
  noDataMessage.innerHTML = `<p style="color: #ff6600; font-weight: bold;">${message}</p>`;
  noDataMessage.style.display = 'block';
  resetUI();
}


//=======================================================================================
//==============================  LISTENERS =============================================
//=======================================================================================

// [K] Captura estacion, renderizasi hay índice activo =====================================
document.getElementById("dateInput").addEventListener("change", function () {
  const { year, doy } = getSelectedDate(this.value);
  console.log("Fecha seleccionada:", this.value, "Año:", year, "Día del año (DoY):", doy);

  handlerSpinner(true);
  resetChart();
  document.getElementById('noDataMessagePRindex').style.display = 'none';
  processIndexData(year, doy, fetchSphiData, fetchRotiData);
});

// [L] Reset UI cuando el calendario obtiene foco ==========================================
document.getElementById("dateInput").addEventListener("change", resetUI);

// [M] Captura estacion y renderiza si hay indice activo ===================================
document.getElementById("pastStationSelector").addEventListener("change", function () {
  detectSelectedStation();
  showIndexButtons();
  if (activeIndex) {
    const dataToRender = activeIndex === 's4' ? pastRecordsData['roti'] : pastRecordsData[activeIndex];
    if (dataToRender) {
      renderChart(dataToRender, selectedStation, activeIndex);
    }
  }
});

// [N1] Renderiza SPHI =====================================================================
document.getElementById("sphiIndexPRBtn").addEventListener("click", function () {
  if (pastRecordsData.sphi && selectedStation) {
    activeIndex = 'sphi';
    document.getElementById("indexPRContainer").style.display = 'flex';
    renderChart(pastRecordsData.sphi, selectedStation, 'sphi');
    setActiveButton(this);
  } else {
    console.log("Selecciona una estación antes de generar el gráfico.");
  }
});

// [N2] Renderiza ROTI =====================================================================
document.getElementById("rotiIndexPRBtn").addEventListener("click", function () {
  if (pastRecordsData.roti && selectedStation) {
    activeIndex = 'roti';
    document.getElementById("indexPRContainer").style.display = 'flex';
    renderChart(pastRecordsData.roti, selectedStation, 'roti');
    setActiveButton(this);
  } else {
    console.log("Selecciona una estación antes de generar el gráfico.");
  }
});

// [N3] Renderiza S4 =======================================================================
document.getElementById("s4IndexPRBtn").addEventListener("click", function () {
  if (pastRecordsData.roti && selectedStation) {
    activeIndex = 's4';
    document.getElementById("indexPRContainer").style.display = 'flex';
    renderChart(pastRecordsData.roti, selectedStation, 's4');
    setActiveButton(this);
  } else {
    console.log("Selecciona una estación antes de generar el gráfico.");
  }
});


import { getSelectedMapDate } from "./mapsPRCalendar.js";

// [A] Global Variables  ============================================
let mapsPRData = {
  igp_roti: null, // Save JSON from igp_roti.dat.xz
};

const rotiMapBtn = document.getElementById("rotiMapPRBtn");
rotiMapBtn.classList.add("boxContainer__titleH3--disabled");
document.getElementById("hourButtonsPRRoti").classList.remove("hourButtonsContainer--visible");

// [B] Handle Fetch Flag =========================================
const isFetching = {
  igp_roti: false,
};

function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessagePRMapsRoti");
  const map = document.getElementById("rotiMapPRContainer");

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

// [C] Fetch raw IGP ROTI data ====================
async function fetchRawIgpRotiData(year, doy) {
  if (isFetching.igp_roti) {
    console.warn("ROTI request in progress. Avoiding overlap.");
    return null;
  }

  isFetching.igp_roti = true; // Activate the flag
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-roti/${year}/${doy}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error for ROTI: ${response.status}`);
    }

    return await response.json();
  } finally {
    isFetching.igp_roti = false; // Desactivate the flag
  }
}

// [D] Filter ROTI L1 data =====================================
function filterRotiL1Data(rawData) {
  return rawData.map((group) => ({
    TIME: group.TIME,
    data: group.data
      .map((cell) => ({
        Longitude: cell.Longitude ?? null,
        Latitude: cell.Latitude ?? null,
        mean_roti: cell.mean_roti ?? null,
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

// [F] Main function for ROTI ============================================
export async function fetchIgpRotiData(year, doy) {
  try {
    const rawData = await fetchRawIgpRotiData(year, doy);
    const hasUsefulData = Array.isArray(rawData) && rawData.some(group => Array.isArray(group.data) && group.data.length > 0);

    if (!rawData || !hasUsefulData) {
      // If there is no data, clear the structure and update buttons
      mapsPRData.igp_roti_byHourBlock = {};
      hourBtnAvailability();
      hourDropdownAvailability();
      return null;
    }

    const filteredData = filterRotiL1Data(rawData);
    mapsPRData.igp_roti = filteredData;
    rotiMapBtn.classList.remove("boxContainer__titleH3--disabled");

    // Group and save in new variable
    mapsPRData.igp_roti_byHourBlock = groupByHourAndBlock(filteredData);
    hourBtnAvailability();
    hourDropdownAvailability();
    return filteredData;

  } catch (error) {
    console.error("Error obtaining or processing ROTI data:", error.message);
    // if there is an error, clear the structure and update buttons
    mapsPRData.igp_roti_byHourBlock = {};
    hourBtnAvailability();
    hourDropdownAvailability();
    document.getElementById("hourButtonsPRRoti").classList.remove("hourButtonsContainer--visible");
    handlerSpinner(false);
  }
}

// [G] Update hour buttons availability =====================================
function hourBtnAvailability() {
  const byHourBlock = mapsPRData.igp_roti_byHourBlock;
  document.querySelectorAll('#hourButtonsPRRoti button.tertiaryBtn').forEach((btn) => {
    const hour = parseInt(btn.getAttribute('data-hour'), 10);
    const hasData = (byHourBlock[hour] || []).some(b => b && b.data && b.data.length > 0);
    
    if (!hasData) {
      btn.classList.add('tertiaryBtn--disabled');
      btn.disabled = true; 
    } else {
      btn.classList.remove('tertiaryBtn--disabled');
      btn.disabled = false;
    }
  });
}

// [H] Update dropdown hours availability===================================
function hourDropdownAvailability() {
  const byHourBlock = mapsPRData.igp_roti_byHourBlock;
  const hourSelect = document.getElementById("hourSelectPRRoti");
  // Clear the hour select dropdown
  hourSelect.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
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
  document.querySelectorAll('#hourButtonsPRRoti .tertiaryBtn.active-button').forEach(btn => {
    btn.classList.remove('active-button');
  });
  document.getElementById("hourSelectPRRoti").selectedIndex = 0;
  document.getElementById("blockSelectPRRoti").selectedIndex = 0;
}

// [J] On date change ===========================================
document.getElementById("dateInputMapsRoti").addEventListener("change", async function () {
  const { year, doy } = getSelectedMapDate(this.value);
  console.log(
    "Selected Date:",
    this.value,
    "Year:",
    year,
    "Day of Year (DoY):",
    doy
  );
  window.dispatchEvent(new Event("cleanMapPR"));
  clearHourAndMinuteSelections();
  handlerSpinner(true);
  await fetchIgpRotiData(year, doy);
  handlerSpinner(false);
});


// [K] Update hour button availability ====================================================
document.getElementById('blockPrevBtnRoti').addEventListener('mousedown', function(e) {
  e.preventDefault();
  this.blur();
});

// [L] Update hour button availability ====================================================
document.getElementById('blockNextBtnRoti').addEventListener('mousedown', function(e) {
  e.preventDefault();
  this.blur();
});

// [Z] Getter to get the filtered block by hour and 10-minute block ============
export function getRotiBlockByHourAndMinute(hour, blockIdx) {
  if (!mapsPRData.igp_roti_byHourBlock) return null;
  return mapsPRData.igp_roti_byHourBlock[hour]?.[blockIdx] ?? null;
}

// [AUTO-PLAY] ==================================================

// [A] Player state variables
let isAutoPlaying = false;
let autoPlayIntervalId = null;
let autoPlayIndex = 0;
let activeHourButtons = [];

// [B] Start auto-play
function startAutoPlay() {
  const playButton = document.getElementById("autoPlayHoursBtnRoti");

// [B.1] Get active hour buttons (those not disabled)
  activeHourButtons = Array.from(document.querySelectorAll("#hourButtonsPRRoti .tertiaryBtn"))
    .filter(btn => !btn.classList.contains("tertiaryBtn--disabled"))
    .sort((a, b) => parseInt(a.dataset.hour, 10) - parseInt(b.dataset.hour, 10));

  if (activeHourButtons.length === 0) {
    console.warn("No active hour buttons for ROTI.");
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
      stopAutoPlay();
      return;
    }

    activeHourButtons[autoPlayIndex].click();
    autoPlayIndex++;
  }, 1300);
}

// [C] Stop auto-play
function stopAutoPlay() {
  const playButton = document.getElementById("autoPlayHoursBtnRoti");
  clearInterval(autoPlayIntervalId);
  autoPlayIntervalId = null;
  isAutoPlaying = false;
  autoPlayIndex = 0;
  playButton.textContent = "▶️";
  playButton.classList.remove("playing");
}

// [D] Toggle auto-play
function toggleAutoPlay() {
  if (isAutoPlaying) {
    stopAutoPlay();
  } else {
    startAutoPlay();
  }
}

// [E] Listener for play/pause button
document.getElementById("autoPlayHoursBtnRoti").addEventListener("click", toggleAutoPlay);

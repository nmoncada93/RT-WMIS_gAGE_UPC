import { getSelectedMapDateS4 } from "./mapsPRCalendarS4.js";

// [A] Global Variables  ============================================
let mapsPRDataS4 = {
  igp_roti: null, // Save JSON from igp_roti.dat.xz
};

const s4MapBtn = document.getElementById("s4MapPRBtn");
s4MapBtn.classList.add("boxContainer__titleH3--disabled");
document.getElementById("hourButtonsPRS4").classList.remove("hourButtonsContainer--visible");

// [B] Handle Fetch Flags =========================================
const isFetching = {
  igp_roti: false,
};

function handlerSpinner(show) {
  const spinner = document.getElementById("loadingMessagePRMapsS4");
  const map = document.getElementById("s4MapPRContainer");

  if (show) {
    map.dataset.wasVisible = map.style.display === "block";
    map.style.display = "none";
    spinner.style.display = "flex";
  } else {
    spinner.style.display = "none";
    if (map.dataset.wasVisible === "true") {
      map.style.display = "block";
    }
    delete map.dataset.wasVisible;
  }
}

// [C] Fetch igp_roti.dat.xz ============================================
async function fetchRawIgpRotiData(year, doy) {
  if (isFetching.igp_roti) {
    console.warn("S4 application in process. Avoiding overlapping.");
    return null;
  }

  isFetching.igp_roti = true;
  try {
    const url = `http://127.0.0.1:5000/api/mapsPR/read-igp-roti/${year}/${doy}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error for S4: ${response.status}`);
    }
    return await response.json();
  } finally {
    isFetching.igp_roti = false;
  }
}

// [D] Filter data for S4 ============================================
function filterS4Data(rawData) {
  return rawData.map((group) => ({
    TIME: group.TIME,
    data: group.data
      .map((cell) => ({
        Longitude: cell.Longitude ?? null,
        Latitude: cell.Latitude ?? null,
        mean_s4: cell.mean_s4 ?? null,
      }))
      .filter((cell) => cell.Longitude !== null && cell.Latitude !== null),
  }));
}

// [E] Group by hour and 10-min block =======================================
function groupByHourAndBlock(filteredData) {
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

// [F] Main function for S4 ============================================
export async function fetchIgpS4Data(year, doy) {
  try {
    const rawData = await fetchRawIgpRotiData(year, doy);
    const hasUsefulData = Array.isArray(rawData) && rawData.some(group => Array.isArray(group.data) && group.data.length > 0);

    if (!rawData || !hasUsefulData) {
      mapsPRDataS4.igp_s4_byHourBlock = {};
      hourBtnAvailability();
      hourDropdownAvailability();
      return null;
    }

    const filteredData = filterS4Data(rawData);
    mapsPRDataS4.igp_s4 = filteredData;
    s4MapBtn.classList.remove("boxContainer__titleH3--disabled");
    mapsPRDataS4.igp_s4_byHourBlock = groupByHourAndBlock(filteredData);

    hourBtnAvailability();
    hourDropdownAvailability();
    return filteredData;
  } catch (error) {
    console.error("Error obtaining or processing S4 data:", error.message);
    mapsPRDataS4.igp_s4_byHourBlock = {};
    hourBtnAvailability();
    hourDropdownAvailability();
    document.getElementById("hourButtonsPRS4").classList.remove("hourButtonsContainer--visible");
    handlerSpinner(false);
  }
}

// [G] Update hour buttons =====================================
function hourBtnAvailability() {
  const byHourBlock = mapsPRDataS4.igp_s4_byHourBlock;
  document.querySelectorAll('#hourButtonsPRS4 button.tertiaryBtn').forEach((btn) => {
    const hour = parseInt(btn.getAttribute('data-hour'), 10);
    const hasData = (byHourBlock[hour] || []).some(b => b && b.data && b.data.length > 0);
    btn.classList.toggle('tertiaryBtn--disabled', !hasData);
    btn.disabled = !hasData;
  });
}

// [H] Update dropdown hours ===================================
function hourDropdownAvailability() {
  const byHourBlock = mapsPRDataS4.igp_s4_byHourBlock;
  const hourSelect = document.getElementById("hourSelectPRS4");
  hourSelect.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = `${h}h`;
    const hasData = (byHourBlock[h] || []).some(b => b && b.data && b.data.length > 0);
    option.disabled = !hasData;
    if (!hasData) option.classList.add("selectOption--disabled");
    hourSelect.appendChild(option);
  }
}

// [I] Clear selection states ===================================
function clearHourAndMinuteSelections() {
  document.querySelectorAll("#hourButtonsPRS4 .tertiaryBtn.active-button").forEach((btn) => btn.classList.remove("active-button"));
  document.getElementById("hourSelectPRS4").selectedIndex = 0;
  document.getElementById("blockSelectPRS4").selectedIndex = 0;
}

// [J] On date change ===========================================
document.getElementById("dateInputMapsS4").addEventListener("change", async function () {
  const { year, doy } = getSelectedMapDateS4(this.value);
    console.log(
    "Selected Date:",
    this.value,
    "Year:",
    year,
    "Day of Year (DoY):",
    doy
  );
  window.dispatchEvent(new Event("cleanMapPRS4"));
  clearHourAndMinuteSelections();
  handlerSpinner(true);
  await fetchIgpS4Data(year, doy);
  handlerSpinner(false);
});

// [Z] Getter to access specific block ======================================
export function getS4BlockByHourAndMinute(hour, blockIdx) {
  if (!mapsPRDataS4.igp_s4_byHourBlock) return null;
  return mapsPRDataS4.igp_s4_byHourBlock[hour]?.[blockIdx] ?? null;
}

// [AUTO-PLAY] ================================================================

// [A] Player state variables
let isAutoPlayingS4 = false;
let autoPlayIntervalIdS4 = null;
let autoPlayIndexS4 = 0;
let activeHourButtonsS4 = [];

// [B] Start auto-play
function startAutoPlayS4() {
  const playButton = document.getElementById("autoPlayHoursBtnS4");

  // [B.1] Get active hour buttons
  activeHourButtonsS4 = Array.from(document.querySelectorAll("#hourButtonsPRS4 .tertiaryBtn"))
    .filter(btn => !btn.classList.contains("tertiaryBtn--disabled"))
    .sort((a, b) => parseInt(a.dataset.hour, 10) - parseInt(b.dataset.hour, 10));

  if (activeHourButtonsS4.length === 0) {
    console.warn("No active hour buttons for S4.");
    return;
  }

  // [B.2] Setup state
  isAutoPlayingS4 = true;
  autoPlayIndexS4 = 0;
  playButton.textContent = "⏸️";
  playButton.classList.add("playing");

  // [B.3] Simulate clicks on buttons
  autoPlayIntervalIdS4 = setInterval(() => {
    if (autoPlayIndexS4 >= activeHourButtonsS4.length) {
      stopAutoPlayS4();
      return;
    }

    activeHourButtonsS4[autoPlayIndexS4].click();
    autoPlayIndexS4++;
  }, 1300);
}

// [C] Stop auto-play
function stopAutoPlayS4() {
  const playButton = document.getElementById("autoPlayHoursBtnS4");
  clearInterval(autoPlayIntervalIdS4);
  autoPlayIntervalIdS4 = null;
  isAutoPlayingS4 = false;
  autoPlayIndexS4 = 0;
  playButton.textContent = "▶️";
  playButton.classList.remove("playing");
}

// [D] Toggle auto-play
function toggleAutoPlayS4() {
  if (isAutoPlayingS4) {
    stopAutoPlayS4();
  } else {
    startAutoPlayS4();
  }
}

// [E] Listener for play/pause button
document.getElementById("autoPlayHoursBtnS4").addEventListener("click", toggleAutoPlayS4);

import {
  coordinateAxes,
  drawAxisLabels,
  drawColorBar,
  paintGrid,
} from "./mapPRVisualRoti.js";

import { getRotiBlockByHourAndMinute } from "./mapsPRControllerRoti.js";

// [A] Initial Configuration ------------------------------------------------------------
const width = 1150;
const height = 600;
const gridSize = 2; // Size of the grid cells in degrees

// [A.1] Projection configuration
const projection = d3
  .geoEquirectangular()
  .scale(150)
  .translate([width / 2, height / 2]); // Centers the projection

// [A.2] GeoJSON path generator
const pathGenerator = d3.geoPath().projection(projection);

// [A.3] SVG container
const svg = d3
  .select("#rotiMapPRRender")
  .attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

// [A.4] Global grid data (reusable)
const gridData = generateGridData(projection, gridSize);

// [B] Generate grid data --------------------------------------------------------
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

// [C] Load map data -------------------------------------------------------------
async function loadWorldData() {
  try {
    return await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
  } catch (error) {
    throw new Error("Error loading GeoJSON for the map...");
  }
}

// [D] Draw countries ------------------------------------------------------------
function drawCountries(worldData) {
  svg
    .selectAll("path")
    .data(worldData.features)
    .join("path")
    .attr("d", pathGenerator)
    .attr("fill", "#dcdcdc")
    .attr("stroke", "black");
}

// [E] Core function: update map based on selectors ------------------------------
function updateMapForSelection() {
  const hourSelect = document.getElementById("hourSelectPRRoti");
  const blockSelect = document.getElementById("blockSelectPRRoti");
  const selectedHour = parseInt(hourSelect.value, 10);
  const selectedBlock = parseInt(blockSelect.value, 10);

  // Get the corresponding data block
  const blockData = getRotiBlockByHourAndMinute(selectedHour, selectedBlock);
  
  // Clear the grid before drawing
  svg.selectAll(".gridCellRoti").remove();

  // Draw the block if there is data
  if (blockData && blockData.data && blockData.data.length > 0) {
    paintGrid(gridData, [blockData], svg);
    console.log(`Plotting ROTI @ ${selectedHour}:${selectedBlock * 10}`);
  } else {
    console.warn("Data not available.");
  }

  // Show message below the map
  const msgDiv = document.getElementById("rotiMapMessagePR");
  const selectedDate = document.getElementById("dateInputMapsRoti").value;
  const horaTxt = selectedHour.toString().padStart(2, "0");
  const minTxt = (selectedBlock * 10).toString().padStart(2, "0");

  if (blockData && blockData.data && blockData.data.length > 0) {
    msgDiv.textContent = `Displaying: ${selectedDate} at ${horaTxt}:${minTxt} GPST`;
  } else {
    msgDiv.textContent = `Data not available for ${selectedDate} at ${horaTxt}:${minTxt} GPST.`;
  }
}

// [F] Initialize map on button click -------------------------------------------
document.getElementById("rotiMapPRBtn").addEventListener("click", async () => {
  try {
    const mapContainer = document.getElementById("rotiMapPRContainer");
    mapContainer.style.display = "block";
    document.getElementById("hourButtonsPRRoti").classList.add("hourButtonsContainer--visible");

    // Get the selected date
    const dateInput = document.getElementById("dateInputMapsRoti").value;
    if (!dateInput) {
      console.error("Please select a date before starting the map.");
      return;
    }

    const worldData = await loadWorldData();
    drawCountries(worldData);
    coordinateAxes(projection, svg);
    drawAxisLabels(svg, width, height);
    drawColorBar(svg, width, height);

    //Draws the current block according to selects
    updateMapForSelection();

    // Listeners
    const hourSelect = document.getElementById("hourSelectPRRoti");
    const blockSelect = document.getElementById("blockSelectPRRoti");
    hourSelect.addEventListener("change", updateMapForSelection);
    blockSelect.addEventListener("change", updateMapForSelection);

    // Makes the “Reset” button visible
    const resetButton = document.getElementById("closeRotiMapPRBtn");
    if (resetButton) resetButton.style.display = "block";
  } catch (error) {
    console.error("Error starting historical map (ROTI):", error);
  }
});

// [G] Cleans the entire map ---------------------------------------------------
function resetMap() {
  console.log("Resetting map");
  svg.selectAll("*").remove();
  document.getElementById("hourButtonsPRRoti").classList.remove("hourButtonsContainer--visible");
  const mapContainer = document.getElementById("rotiMapPRContainer");
  if (mapContainer) {
    mapContainer.style.display = "none";
  } else {
    console.error("Map container not found...");
  }
}

// [H] Cleans the entire map ---------------------------------------------------
function cleanMap() {
  svg.selectAll(".gridCellRoti").remove();
}

// [I] Monitoring buttons  --------------------------------------------------
function markActiveHourButton(hour) {
  document.querySelectorAll('#hourButtonsPRRoti .tertiaryBtn').forEach(btn => {
    btn.classList.toggle('active-button', parseInt(btn.dataset.hour, 10) === hour);
  });
}

// [J] Stops the historical map when pressing the “Reset” button ------------------
document.getElementById("closeRotiMapPRBtn").addEventListener("click", () => {
  resetMap();
});

// [K] When another script triggers the custom event
window.addEventListener("cleanMapPR", () => {
  cleanMap();
});

// [L]
document.getElementById("hourButtonsPRRoti").addEventListener("click", function (e) {
  if (e.target.classList.contains("tertiaryBtn")) {
    const hour = parseInt(e.target.getAttribute("data-hour"), 10);
    document.getElementById("hourSelectPRRoti").value = hour;
    markActiveHourButton(hour);
    updateMapForSelection();
  }
});

// [M]
document.getElementById("hourSelectPRRoti").addEventListener("change", function () {
  const hour = parseInt(this.value, 10);
  markActiveHourButton(hour);
  updateMapForSelection();
});

// [N] Listener for arrow buttons to change minutes -------------------
const blockSelect = document.getElementById("blockSelectPRRoti");
const blockPrevBtn = document.getElementById("blockPrevBtnRoti");
const blockNextBtn = document.getElementById("blockNextBtnRoti");

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

window.updateMapForSelectionRoti = updateMapForSelection;

import {
  coordinateAxes,
  drawAxisLabels,
  drawColorBar,
  paintGrid,
} from "./mapPRVisualS4.js";

import { getS4BlockByHourAndMinute } from "./mapsPRControllerS4.js";

// [A] Initial Configuration ------------------------------------------------------------
const width = 1100;
const height = 580;
const gridSize = 2; // Size of the grid cells in degrees

// [A.1] Projection configuration
const projection = d3
  .geoEquirectangular()
  .scale(150)
  .translate([width / 2, height / 2]);

// [A.2] GeoJSON path generator
const pathGenerator = d3.geoPath().projection(projection);

// [A.3] SVG container
const svg = d3
  .select("#s4MapPRRender")
  //.attr("viewBox", `-50 -5 ${width + 100} ${height + 100}`)
  .attr("viewBox", `0 0 ${width} ${height+80}`)
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
  const hourSelect = document.getElementById("hourSelectPRS4");
  const blockSelect = document.getElementById("blockSelectPRS4");
  const selectedHour = parseInt(hourSelect.value, 10);
  const selectedBlock = parseInt(blockSelect.value, 10);

  // Get the corresponding data block
  const blockData = getS4BlockByHourAndMinute(selectedHour, selectedBlock);

  // Clear the grid before drawing
  svg.selectAll(".gridCellS4").remove();

  // Draw the block if there is data
  if (blockData && blockData.data && blockData.data.length > 0) {
    paintGrid(gridData, [blockData], svg);
    console.log(`Plotting S4 @ ${selectedHour}:${selectedBlock * 10}`);
  } else {
    console.warn("Data not available.");
  }

  // Show message below the map
  const msgDiv = document.getElementById("s4MapMessagePR");
  const selectedDate = document.getElementById("dateInputMapsS4").value;
  const horaTxt = selectedHour.toString().padStart(2, "0");
  const minTxt = (selectedBlock * 10).toString().padStart(2, "0");

  if (blockData && blockData.data && blockData.data.length > 0) {
    msgDiv.textContent = `Displaying: ${selectedDate} at ${horaTxt}:${minTxt} GPST`;
    msgDiv.style.color = "inherit";
  } else {
    msgDiv.textContent = `Data not available for ${selectedDate} at ${horaTxt}:${minTxt} GPST.`;
    msgDiv.style.color = "#ff6600";
  }
}

// [F] Initialize map on button click -------------------------------------------
document.getElementById("s4MapPRBtn").addEventListener("click", async () => {
  try {
    const mapContainer = document.getElementById("s4MapPRContainer");
    mapContainer.style.display = "block";
    document.getElementById("hourButtonsPRS4").classList.add("hourButtonsContainer--visible");

    const dateInput = document.getElementById("dateInputMapsS4").value;
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
    const hourSelect = document.getElementById("hourSelectPRS4");
    const blockSelect = document.getElementById("blockSelectPRS4");
    hourSelect.addEventListener("change", updateMapForSelection);
    blockSelect.addEventListener("change", updateMapForSelection);

    // Makes the “Reset” button visible
    const resetButton = document.getElementById("closeS4MapPRBtn");
    if (resetButton) resetButton.style.display = "block";
  } catch (error) {
    console.error("Error starting historical map (S4):", error);
  }
});

// [G] Cleans the entire map ---------------------------------------------------
function resetMap() {
  console.log("Resetting map");
  svg.selectAll("*").remove();
  document.getElementById("hourButtonsPRS4").classList.remove("hourButtonsContainer--visible");
  const mapContainer = document.getElementById("s4MapPRContainer");
  if (mapContainer) {
    mapContainer.style.display = "none";
  } else {
    console.error("Map container not found...");
  }
}

// [H] Cleans the entire map ---------------------------------------------------
function cleanMap() {
  svg.selectAll(".gridCellS4").remove();
}

// [I] Monitoring buttons  --------------------------------------------------
function markActiveHourButton(hour) {
  document.querySelectorAll('#hourButtonsPRS4 .tertiaryBtn').forEach(btn => {
    btn.classList.toggle('active-button', parseInt(btn.dataset.hour, 10) === hour);
  });
}

// [J] Stops the historical map when pressing the “Reset” button ------------------
document.getElementById("closeS4MapPRBtn").addEventListener("click", () => {
  resetMap();
});

// [K] When another script triggers the custom event
window.addEventListener("cleanMapPR", () => {
  cleanMap();
});

// [L]
document.getElementById("hourButtonsPRS4").addEventListener("click", function (e) {
  if (e.target.classList.contains("tertiaryBtn")) {
    const hour = parseInt(e.target.getAttribute("data-hour"), 10);
    document.getElementById("hourSelectPRS4").value = hour;
    markActiveHourButton(hour);
    updateMapForSelection();
  }
});

// [M]
document.getElementById("hourSelectPRS4").addEventListener("change", function () {
  const hour = parseInt(this.value, 10);
  markActiveHourButton(hour);
  updateMapForSelection();
});

// [N] Listener for arrow buttons to change minutes -------------------
const blockSelect = document.getElementById("blockSelectPRS4");
const blockPrevBtn = document.getElementById("blockPrevBtnS4");
const blockNextBtn = document.getElementById("blockNextBtnS4");

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

window.updateMapForSelectionS4 = updateMapForSelection;

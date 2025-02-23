import * as d3 from "d3";
import { sliderBottom } from "d3-simple-slider";
import { generateGridData } from "./mapPRProjectionSphi.js";
const gridData = generateGridData();

import { svg } from "./mapPRProjectionSphi.js";
import { paintGrid } from "./mapPRVisualSphi.js";
import { mapsPRData } from "./mapsPRController.js";

// [A] Configuración del slider ========================================
const sliderWidth = 600;
const sliderHeight = 70;
const minTimeIndex = 0;
const maxTimeIndex = 143; // 144 pasos (24h en intervalos de 10 min)
const timeStep = 10;

const timeFormat = d3.timeFormat("%H:%M");
const referenceTime = new Date(2024, 0, 1, 0, 0); // Hora base

// [B] Crear escala de tiempo ==========================================
const timeScale = d3
  .scaleLinear()
  .domain([minTimeIndex, maxTimeIndex])
  .range([0, 1430])
  .clamp(true);

// [C] Crear slider con d3-simple-slider ===============================
const slider = sliderBottom()
  .min(minTimeIndex)
  .max(maxTimeIndex)
  .step(timeStep)
  .width(sliderWidth)
  .ticks(12)
  .default(0)
  .handle(d3.symbol().type(d3.symbolCircle).size(200)())
  .on("onchange", (timeIndex) => updateMapTime(timeIndex)); // ✅ Corrección aquí

// [D] Contenedor del slider ============================================
const sliderContainer = d3
  .select("#sliderContainer")
  .append("svg")
  .attr("width", sliderWidth + 50)
  .attr("height", sliderHeight)
  .append("g")
  .attr("transform", "translate(20,30)")
  .call(slider);

// [E] Etiqueta para mostrar la hora seleccionada ======================
const timeLabel = sliderContainer
  .append("text")
  .attr("x", sliderWidth / 2)
  .attr("y", -10)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .text("00:00");

// [F] Función para actualizar el mapa con los datos del slider ========
function updateMapTime(timeIndex) {
  const adjustedTime = timeIndex * 10 * 60; // ✅ Multiplicamos solo por 60, no por 600
  console.log(`⏳ Tiempo seleccionado en slider: ${adjustedTime}s`);

  // Buscar el conjunto de datos correspondiente al tiempo seleccionado
  const filteredEntry = mapsPRData.igp_sphi.find(
    (d) => d.TIME === adjustedTime
  );

  if (!filteredEntry || !filteredEntry.data) {
    console.warn(
      `⚠ No hay datos para este intervalo de tiempo (${adjustedTime}s).`
    );
    return;
  }

  // Verificar si hay datos en el grupo seleccionado
  const timeFilteredData = filteredEntry.data;
  console.log("📊 Datos filtrados para este tiempo:", timeFilteredData);

  // Si hay datos, actualizar el mapa
  if (timeFilteredData.length > 0) {
    paintGrid(gridData, timeFilteredData, svg);
  } else {
    console.warn(
      `⚠ No hay datos válidos para pintar en el mapa (${adjustedTime}s).`
    );
  }
}

console.log("Slider de tiempo cargado correctamente");

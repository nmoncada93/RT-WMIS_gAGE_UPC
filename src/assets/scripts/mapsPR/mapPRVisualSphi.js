// [A] Paints grid cells on the map ===========================================
function paintGrid(gridData, dynamicData, svg) {
  svg
    .selectAll(".grid-cell")
    .data(gridData)
    .join("rect")
    .attr("class", "grid-cell")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .attr("width", (d) => d.width)
    .attr("height", (d) => d.height)
    .style("fill", (d) => {
      const match = findMatchingCell(dynamicData, d);
      return match ? getColor(match.mean_sphi) : "none";
    })
    .style("stroke", "lightgray") // Grid cell borders
    .style("stroke-width", 0.3);
}

// [B] Finds matching data for a grid cell ===================================
function findMatchingCell(dynamicData, gridCell) {
  const tolerance = 0.01; // Tolerance for matching coordinates
  return dynamicData
    .flatMap((group) => group.data)
    .find(
      (cell) =>
        Math.abs(cell.Longitude - gridCell.Longitude) <= tolerance &&
        Math.abs(cell.Latitude - gridCell.Latitude) <= tolerance
    );
}

// [C] Generates color based on SPHI values ==================================
function getColor(value) {
  if (value === null || value === 0) return "transparent"; // No color
  if (value < 0.5) return "#0837d0"; // Dark blue
  if (value < 1) return "#40E0D0"; // Turquoise
  if (value < 1.5) return "#00FF00"; // Green
  if (value < 2) return "#FFFF00"; // Yellow
  if (value < 2.5) return "#FFA500"; // Orange
  return "#bc0000"; // Dark red
}

// [D] Draws coordinate axes on the map ======================================
function coordinateAxes(projection, svg, step = 10) {
  // [D.1] Draw latitude lines (horizontal)
  for (let lat = -90; lat <= 90; lat += step) {
    const startPoint = projection([-180, lat]);
    const endPoint = projection([180, lat]);

    if (startPoint && endPoint) {
      const line = d3.line()([startPoint, endPoint]);
      svg
        .append("path")
        .attr("d", line)
        .attr("stroke", "lightgray")
        .attr("stroke-width", 0.5)
        .attr("fill", "none");

      // Add labels on the left and right sides
      svg
        .append("text")
        .attr("x", startPoint[0] - 15)
        .attr("y", startPoint[1] + 5)
        .attr("fill", "gray")
        .attr("font-size", "10px")
        .attr("text-anchor", "end")
        .text(`${lat}°`);

      svg
        .append("text")
        .attr("x", endPoint[0] + 15)
        .attr("y", endPoint[1] + 5)
        .attr("fill", "gray")
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .text(`${lat}°`);
    }
  }

  // [D.2] Draw longitude lines (vertical)
  for (let lon = -180; lon <= 180; lon += 20) {
    const startPoint = projection([lon, 90]);
    const endPoint = projection([lon, -90]);

    if (startPoint && endPoint) {
      const line = d3.line()([startPoint, endPoint]);
      svg
        .append("path")
        .attr("d", line)
        .attr("stroke", "lightgray")
        .attr("stroke-width", 0.5)
        .attr("fill", "none");

      // Add labels at the top and bottom
      svg
        .append("text")
        .attr("x", startPoint[0])
        .attr("y", startPoint[1] - 15)
        .attr("fill", "gray")
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .text(`${lon}°`);

      svg
        .append("text")
        .attr("x", endPoint[0])
        .attr("y", endPoint[1] + 15)
        .attr("fill", "gray")
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .text(`${lon}°`);
    }
  }
}

// [E] Draws axis labels ====================================================
function drawAxisLabels(svg, width, height) {
  // Label for Y-axis (Latitude)
  svg
    .append("text")
    .attr("x", -height / 2)
    .attr("y", 50)
    .attr("transform", "rotate(-90)")
    .attr("fill", "black")
    .attr("font-size", "14px")
    .attr("text-anchor", "middle")
    .text("Latitude");

  // Label for X-axis (Longitude)
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 30)
    .attr("fill", "black")
    .attr("font-size", "14px")
    .attr("text-anchor", "middle")
    .text("Longitude");
}

// [F] Draws a color bar ====================================================
function drawColorBar(svg, width, height) {
  const barWidth = width - 200; // Width of the color bar
  const barHeight = 15; // Height of the color bar
  const barPadding = 15; // Space between the map and the bar

  // Container for the color bar
  const barGroup = svg
    .append("g")
    .attr(
      "transform",
      `translate(${(width - barWidth) / 2}, ${height + barPadding})`
    );

  // Color gradient
  const gradient = svg
    .append("defs")
    .append("linearGradient")
    .attr("id", "colorBarGradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  gradient.append("stop").attr("offset", "0%").attr("stop-color", "#0837d0"); // Dark blue
  gradient.append("stop").attr("offset", "16.6%").attr("stop-color", "#40E0D0"); // Turquoise
  gradient.append("stop").attr("offset", "33.2%").attr("stop-color", "#00FF00"); // Green
  gradient.append("stop").attr("offset", "49.8%").attr("stop-color", "#FFFF00"); // Yellow
  gradient.append("stop").attr("offset", "66.4%").attr("stop-color", "#FFA500"); // Orange
  gradient.append("stop").attr("offset", "100%").attr("stop-color", "#bc0000"); // Dark red

  // Color bar legend
  barGroup
    .append("rect")
    .attr("width", barWidth)
    .attr("height", barHeight)
    .style("fill", "url(#colorBarGradient)");

  // Numerical labels below the bar
  const axisScale = d3.scaleLinear().domain([0, 3]).range([0, barWidth]);

  const axis = d3
    .axisBottom(axisScale)
    .ticks(6) // Increments of 0.5
    .tickFormat(d3.format(".1f")); // One decimal format

  barGroup
    .append("g")
    .attr("transform", `translate(0, ${barHeight})`)
    .call(axis);

  // Informational text below the bar
  barGroup
    .append("text")
    .attr("x", barWidth / 2) // Horizontally centered
    .attr("y", barHeight + 35) // Space below the bar
    .attr("fill", "black")
    .attr("font-size", "14px")
    .attr("text-anchor", "middle")
    .text("Color Scale (SPHI in TECU/min)");
}

export {
  coordinateAxes,
  drawAxisLabels,
  drawColorBar,
  findMatchingCell,
  getColor,
  paintGrid,
};

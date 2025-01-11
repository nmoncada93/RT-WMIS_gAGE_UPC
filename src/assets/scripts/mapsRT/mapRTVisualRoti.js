// [A] Pinta cuadricula ========================================================
function paintGrid(gridData, dynamicData, svg) {
  svg.selectAll(".grid-cell")
      .data(gridData)
      .join("rect")
      .attr("class", "grid-cell")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .style("fill", d => {
          const match = findMatchingCell(dynamicData, d);
          return match ? getColor(match.mean_roti) : "none";
      })
      .style("stroke", "lightgray") // Bordes cuadricula
      .style("stroke-width", 0.3);
}

// [B] Busca coincidencia de datos =============================================
function findMatchingCell(dynamicData, gridCell) {
  const tolerance = 0.01; // Tolerancia
  return dynamicData.flatMap(group => group.data).find(cell =>
      Math.abs(cell.Longitude - gridCell.Longitude) <= tolerance &&
      Math.abs(cell.Latitude - gridCell.Latitude) <= tolerance
  );
}

// [C] Genera colores según los valores =========================================
function getColor(value) {
  if (value === null || value === 0) return "transparent"; // No pinta
  if (value < 0.5) return "#0837d0"; // Azul oscuro
  if (value < 1) return "#40E0D0"; // Turquesa
  if (value < 1.5) return "#00FF00"; // Verde
  if (value < 2) return "#FFFF00"; // Amarillo
  if (value < 2.5) return "#FFA500"; // Naranja
  return "#bc0000"; // Rojo oscuro
}

//-----------------------------------VISUAL ELEMENTS -----------------------------------
//--------------------------------------------------------------------------------------

// [D] Dibuja reglas de coordenadas ============================================
function coordinateAxes(projection, svg, step = 10) {
  // [D.1] Dibujar líneas de latitud (horizontales)
  for (let lat = -90; lat <= 90; lat += step) {
    const startPoint = projection([-180, lat]);
    const endPoint = projection([180, lat]);

    if (startPoint && endPoint) {
      const line = d3.line()([startPoint, endPoint]);
      svg.append("path")
        .attr("d", line)
        .attr("stroke", "lightgray")
        .attr("stroke-width", 0.5)
        .attr("fill", "none");

      // Etiquetas en los lados izquierdo y derecho
      svg.append("text")
        .attr("x", startPoint[0] - 15)
        .attr("y", startPoint[1] + 5)
        .attr("fill", "gray")
        .attr("font-size", "10px")
        .attr("text-anchor", "end")
        .text(`${lat}°`);

      svg.append("text")
        .attr("x", endPoint[0] + 15)
        .attr("y", endPoint[1] + 5)
        .attr("fill", "gray")
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .text(`${lat}°`);
    }
  }

  // [D.2] Dibujar líneas de longitud (verticales)
  for (let lon = -180; lon <= 180; lon += 20) { // Cambiado step a 20 grados
    const startPoint = projection([lon, 90]);
    const endPoint = projection([lon, -90]);

    if (startPoint && endPoint) {
      const line = d3.line()([startPoint, endPoint]);
      svg.append("path")
        .attr("d", line)
        .attr("stroke", "lightgray")
        .attr("stroke-width", 0.5)
        .attr("fill", "none");

      // Etiquetas en la parte superior
      svg.append("text")
        .attr("x", startPoint[0])
        .attr("y", startPoint[1] - 15)
        .attr("fill", "gray")
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .text(`${lon}°`);

      // Etiquetas en la parte inferior
      svg.append("text")
        .attr("x", endPoint[0])
        .attr("y", endPoint[1] + 15)
        .attr("fill", "gray")
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .text(`${lon}°`);
    }
  }
}

// [E] Dibuja etiquetas de ejes ===========================================
function drawAxisLabels(svg, width, height) {
  // Etiqueta para el eje Y (Latitude)
  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", 50)
    .attr("transform", "rotate(-90)")
    .attr("fill", "black")
    .attr("font-size", "14px")
    .attr("text-anchor", "middle")
    .text("Latitude");

  // Etiqueta para el eje X (Longitude)
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 1)
    .attr("fill", "black")
    .attr("font-size", "14px")
    .attr("text-anchor", "middle")
    .text("Longitude"); // Texto para el eje X
}

// [F] Dibuja barra de colores ==============================================
function drawColorBar(svg, width, height) {
  const barWidth = width - 200; // Ancho de la barra de colores
  const barHeight = 15; // Altura de la barra de colores
  const barPadding = 15; // Separación entre el mapa y la barra

  // Contenedor para la barra
  const barGroup = svg.append("g")
    .attr("transform", `translate(${(width - barWidth) / 2}, ${height + barPadding})`);

  // Gradiente de colores
  const gradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "colorBarGradientRoti")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

  gradient.append("stop").attr("offset", "0%").attr("stop-color", "#0837d0"); // Azul oscuro
  gradient.append("stop").attr("offset", "16.6%").attr("stop-color", "#40E0D0"); // Turquesa
  gradient.append("stop").attr("offset", "33.2%").attr("stop-color", "#00FF00"); // Verde
  gradient.append("stop").attr("offset", "49.8%").attr("stop-color", "#FFFF00"); // Amarillo
  gradient.append("stop").attr("offset", "66.4%").attr("stop-color", "#FFA500"); // Naranja
  gradient.append("stop").attr("offset", "83%").attr("stop-color", "#bc0000"); // Rojo oscuro
  gradient.append("stop").attr("offset", "100%").attr("stop-color", "#bc0000"); // Rojo oscuro

  // Leyenda
  barGroup.append("rect")
    .attr("width", barWidth)
    .attr("height", barHeight)
    .style("fill", "url(#colorBarGradientRoti)");

  // Etiquetas numericas debajo de la barra
  const axisScale = d3.scaleLinear()
    .domain([0, 3]) // Ajustar según rango de valores de ROTI
    .range([0, barWidth]);

  const axis = d3.axisBottom(axisScale)
    .ticks(6) // Incrementos de 0.5
    .tickFormat(d3.format(".1f")); // Formato con un decimal

  barGroup.append("g")
    .attr("transform", `translate(0, ${barHeight})`)
    .call(axis);

  // Texto informativo debajo de la barra
  barGroup.append("text")
    .attr("x", barWidth / 2) // Centrado horizontalmente
    .attr("y", barHeight + 35) // Espaciado debajo de la barra
    .attr("fill", "black")
    .attr("font-size", "14px")
    .attr("text-anchor", "middle")
    .text("Color Scale (ROTI in TECU/min)"); // Texto descriptivo
}

export { coordinateAxes, drawAxisLabels, drawColorBar, findMatchingCell, getColor, paintGrid };

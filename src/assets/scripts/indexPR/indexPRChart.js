import * as echarts from 'echarts';

// [A] Variable global para almacenar el grafico activo ====================================
let activeChart = null;

// [B] Resetea grafico actual ==============================================================
export function resetChart() {
  if (activeChart) {
    activeChart.dispose();  // Elimina el gráfico de Echarts
    activeChart = null;     // Resetea la referencia global
    console.log("Gráfico reseteado correctamente.");
  }
}

// [C] Para seleccionar la columna correcta segun indice ====================================
function getIndexColumn(item, index) {
  switch (index) {
    case 'sphi': return item[5];  // SPHI L1 (columna 6)
    case 'roti': return item[6];  // ROTI L1 (columna 7)
    case 's4':   return item[10]; // S4 (columna 11)
    default:
      console.warn(`Índice desconocido: ${index}. Se usa SPHI por defecto.`);
      return item[5];  // Por defecto SPHI
  }
}

// [C.1] Determina etiqueta del eje Y segun el indice seleccionado ==========================
function getYAxisLabel(index) {
  switch (index) {
    case 'sphi':
      return 'SigmaPhi (Radians)';
    case 'roti':
      return 'ROTI L1 (TECU/min)';
    case 's4':
      return 'S4 (No units)';
    default:
      return `${index.toUpperCase()} (units)`;
  }
}

// [D] Renderiza grafico segun el indice seleccionado ========================================
export function renderChart(data, station, index) {
  const chartDom = document.getElementById('pastChart');

  // Verifica si el contenedor del grafico esta visible y tiene dimensiones
  if (chartDom.clientWidth === 0 || chartDom.clientHeight === 0) {
    console.warn("No es posible renderizar gráfico: el contenedor no tiene dimensiones.");
    return;
  }

  // Filtra los datos segun estación seleccionada
  const filteredData = data.filter(item => item[1] === station);
  if (filteredData.length === 0) {
    console.warn("No se encontraron datos para la estación seleccionada.");
    return;
  }

  // MANDATORY: Resetea grafico existente antes de crear uno nuevo
  resetChart();

  // Inicializa el gráfico Echarts
  const myChart = echarts.init(chartDom);

  // Guarda el grafico activo en la variable global
  activeChart = myChart;

  // Mapea datos filtrados para obtener los valores correctos segun el indice
  const scatterData = filteredData.map(item => [item[0], getIndexColumn(item, index)]);

  // Configuración del gráfico
  const option = {
    title: { text: `Index: ${index.toUpperCase()} for station: ${station}` },
    tooltip: {  //Al pasar cursor por encima da información extra
      trigger: 'item',
      formatter: function (params) {
          return `Time: ${params.data[0]}<br>Value: ${params.data[1]}`;
      }
    },

    grid: {
      top: '15%',
      bottom: '20%'  // Añade espacio debajo del grafico
    },

    xAxis: {
      type: 'value',
      name: 'Time (Seconds of the day)',
      nameLocation: 'center',
      nameGap: 40,
      min: 0,
      max: 90000,
      interval: 10000,
      axisLabel: {
        hideOverlap: true // Oculta etiquetas superpuestas al reducir tamaño del chart
      }
    },
    yAxis: { type: 'value',  name: getYAxisLabel(index) /*name: `${index.toUpperCase()} (units)`*/ },
    series: [{
      type: 'scatter',
      data: scatterData,
      itemStyle: { color: '#002366', opacity: 0.5 },
      symbolSize: 4
    }],

        // Zoom
        dataZoom: [
          { type: 'slider', start: 0, end: 100},  // Zoom con barra deslizante
          { type: 'inside', start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnTouch: true  }   // Zoom con scroll del ratón
      ],
      // Botón de exportación
      toolbox: {
        show: true,

        feature: {
          saveAsImage: {
            name: 'Past_Records_Index_Chart',
            title: 'Export Chart as PNG',
            type: 'png',
            iconStyle: {
              normal: {
                color: '#002366',        // Color del icono
                borderColor: '#000000',  // Color del borde
                borderWidth: 0.5,
              },
              emphasis: {
                color: '#ff6600'         // Color al pasar el mouse
              }
            }
          }
        }
      }
  };
  // Renderiza el gráfico
  // Configura el gráfico con las opciones y fuerza el ajuste inicial
  myChart.setOption(option);
  myChart.resize(); // Fuerza el tamaño adecuado en la carga inicial

  // Asegura que el grafico se redimensione en el evento de cambio de tamaño (RESPONSIVE)
  window.addEventListener('resize', () => {
    myChart.resize();
  });
}


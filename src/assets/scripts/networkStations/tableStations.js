
async function fetchData() {
  try {
      const response = await fetch('http://127.0.0.1:5000/api/network-stations');

      if (!response.ok) {
          throw new Error('No data available in the UPC server');
      }

      const data = await response.json();
      updateStationStatus(data.content);
  } catch (error) {
      console.error('Connection problem', error);
  }
}

fetchData();
setInterval(fetchData, 10000);

// Updates the status of each station in the table
function updateStationStatus(content) {
  const stationRegex = /INFO\s(\w+)\s(NOT available|available)/g;
  let match;

  while ((match = stationRegex.exec(content)) !== null) {
      const stationName = match[1];
      const status = match[2];

      const rowId = `tr${stationName}`;
      const row = document.getElementById(rowId);

      if (row) {
          row.style.color = (status === "NOT available") ? 'red' : '';
      }
  }
}

// [A] Función para obtener el año y el día del año (DoY) a partir de una fecha ================
export function getSelectedDate(dateString) {
  const selectedDate = new Date(dateString);
  const year = selectedDate.getFullYear();
  const startOfYear = new Date(year, 0, 0);
  const diff = selectedDate - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const doy = Math.floor(diff / oneDay);
  return { year, doy };
}

// [B] Coordina obtención de datos de SPHI y ROTI ============================================
export function processIndexData(year, doy, fetchSphiData, fetchRotiData) {
  // Realiza fetch de SPHI y ROTI en paralelo
  Promise.all([
    fetchSphiData(year, doy), // Obtiene sphi.tmp
    fetchRotiData(year, doy), // Obtiene roti.tmp
  ])
    .then(() => {
      console.log("sphi.tmp and roti.tmp files were successfully obtained");
    })
    .catch((error) => {
      console.error("Error in data collection process:", error);
    });
}

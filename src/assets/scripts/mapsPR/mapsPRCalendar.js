// [A] Función para obtener el año y el día del año (DoY) a partir de una fecha ================
export function getSelectedMapDate(dateString) {
  const selectedDate = new Date(dateString);
  const year = selectedDate.getFullYear();
  const startOfYear = new Date(year, 0, 0);
  const diff = selectedDate - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const doy = Math.floor(diff / oneDay);
  return { year, doy };
}

// [B] Coordina obtención de datos de IGP SPHI y IGP ROTI =====================================
export function processMapIndexData(
  year,
  doy,
  fetchIgpSphiData,
  fetchIgpRotiData
) {
  // Realiza fetch de igp_sphi.dat.xz y igp_roti.dat.xz en paralelo
  Promise.all([
    fetchIgpSphiData(year, doy), // Obtiene igp_sphi.dat.xz
    fetchIgpRotiData(year, doy), // Obtiene igp_roti.dat.xz
  ])
    .then(() => {
      console.log(
        "igp_sphi.dat.xz and igp_roti.dat.xz files were successfully obtained"
      );
    })
    .catch((error) => {
      console.error("Error in data collection process:", error);
    });
}

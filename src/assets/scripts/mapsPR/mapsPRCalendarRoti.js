// [A] Get Year and Day of Year from Date (for S4) ==========================
export function getSelectedS4Date(dateString) {
  const selectedDate = new Date(dateString);
  const year = selectedDate.getFullYear();
  const startOfYear = new Date(year, 0, 0);
  const diff = selectedDate - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const doy = Math.floor(diff / oneDay);
  return { year, doy };
}

// [B] Trigger data fetch for S4 ===========================================
export function processMapS4IndexData(year, doy, fetchIgpRotiData) {
  fetchIgpRotiData(year, doy)
    .then(() => {
      console.log("igp_roti.dat.xz (for S4) was successfully fetched.");
    })
    .catch((error) => {
      console.error("Error fetching S4 data from igp_roti.dat.xz:", error);
    });
}

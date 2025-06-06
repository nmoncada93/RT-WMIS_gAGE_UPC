// mapPRCalendarS4.js

// [A] Get year and day-of-year (DoY) from selected date =======================
export function getSelectedMapDateS4(dateString) {
  const selectedDate = new Date(dateString);
  const year = selectedDate.getFullYear();
  const startOfYear = new Date(year, 0, 0);
  const diff = selectedDate - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const doy = Math.floor(diff / oneDay);
  return { year, doy };
}

// [B] Fetch IGP data specifically for S4 =======================================
export function processMapIndexDataS4(year, doy, fetchIgpRotiData) {
  fetchIgpRotiData(year, doy)
    .then(() => {
      console.log("igp_roti.dat.xz successfully fetched for S4 plotting.");
    })
    .catch((error) => {
      console.error("Error fetching igp_roti.dat.xz for S4:", error);
    });
}

// kml-parser.js: Ανάλυση KML και δημιουργία οντοτήτων AR στο A-Frame

function parseKML(kmlText) {
  try {
    // Μετατροπή κειμένου KML σε XML DOM
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, "text/xml");
    // Εύρεση στοιχείων coordinates
    const coordsNodes = xmlDoc.getElementsByTagName("coordinates");
    if (coordsNodes.length === 0) {
      throw new Error("Δεν βρέθηκαν συντεταγμένες στο αρχείο KML");
    }
    // Λήψη του κειμένου συντεταγμένων και διαχωρισμός σε ζεύγη
    const coordsText = coordsNodes[0].textContent.trim();
    const coordsArray = coordsText.split(/\s+/);
    // Δημιουργία οντότητας AR για κάθε συντεταγμένη
    coordsArray.forEach(coord => {
      const parts = coord.split(',');
      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      addMarker(lat, lon);
    });
  } catch (e) {
    alert("Σφάλμα κατά την επεξεργασία του αρχείου KML");
    console.error("KML Parsing error:", e);
  }
}

// Δημιουργεί μια σφαίρα στο AR στη δοθείσα γεωγραφική θέση
function addMarker(lat, lon) {
  const scene = document.querySelector('a-scene');
  const entity = document.createElement('a-entity');
  entity.setAttribute('gps-new-entity-place', `latitude: ${lat}; longitude: ${lon};`);
  entity.setAttribute('geometry', 'primitive: sphere; radius: 1;');
  entity.setAttribute('material', 'color: #FFFF00; opacity: 0.6;');
  scene.appendChild(entity);
}

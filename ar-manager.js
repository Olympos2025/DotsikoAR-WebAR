// ar-manager.js: Διαχείριση AR, τοποθέτηση KML, κουμπιά UI και Street View overlay.

let lastPosition = null;  // Θα αποθηκεύει την τελευταία θέση GPS
let isStreetVisible = false;

// Αναφορά στα στοιχεία UI
const fileInput = document.getElementById('kmlFileInput');
const clearBtn = document.getElementById('clearBtn');
const refreshBtn = document.getElementById('refreshBtn');
const streetBtn = document.getElementById('streetBtn');
const accuracyValue = document.getElementById('accuracyValue');
const streetOverlayContainer = document.getElementById('streetOverlayContainer');
const streetOverlay = document.getElementById('streetOverlay');

// Παρακολούθηση θέσης GPS για την ενημέρωση ακρίβειας
if ('geolocation' in navigator) {
  navigator.geolocation.watchPosition(pos => {
    lastPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    // Ενημέρωση της ακρίβειας
    accuracyValue.textContent = Math.round(pos.coords.accuracy);
  }, err => {
    console.error('Σφάλμα γεωεντοπισμού:', err);
  }, {
    enableHighAccuracy: true,
    maximumAge: 0
  });
}

// Χειριστής επιλογής αρχείου KML
fileInput.addEventListener('change', event => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const kmlText = e.target.result;
      try {
        // Καλούμε τη συνάρτηση ανάλυσης KML από το kml-parser.js
        parseKML(kmlText);
      } catch (error) {
        alert("Σφάλμα φόρτωσης αρχείου KML");
        console.error('Error parsing KML:', error);
      }
    };
    reader.onerror = function() {
      alert("Σφάλμα φόρτωσης αρχείου KML");
    };
    reader.readAsText(file);
  }
});

// Κουμπί Καθαρισμός: Αφαίρεση οντοτήτων AR από τη σκηνή
clearBtn.addEventListener('click', () => {
  const scene = document.querySelector('a-scene');
  // Αφαιρεί όλα τα στοιχεία που έχουν gps-new-entity-place
  const entities = scene.querySelectorAll('[gps-new-entity-place]');
  entities.forEach(entity => entity.parentNode.removeChild(entity));
});

// Κουμπί Ανανέωση: Απλή ανανέωση της σελίδας
refreshBtn.addEventListener('click', () => {
  window.location.reload();
});

// Προετοιμασία για Street View: Κλειδί API Google Maps
// Αντικαταστήστε το 'YOUR_API_KEY' με το δικό σας κλειδί Google Maps API
const googleMapsApiKey = 'YOUR_API_KEY';

// Κουμπί Street View: Εναλλαγή εμφάνισης overlay
streetBtn.addEventListener('click', () => {
  if (!isStreetVisible) {
    if (lastPosition) {
      // Δημιουργία URL για την αίτηση Street View Static API
      const url = `https://maps.googleapis.com/maps/api/streetview?size=600x600&location=${lastPosition.lat},${lastPosition.lon}&fov=90&heading=235&pitch=0&key=${googleMapsApiKey}`;
      streetOverlay.src = url;
    }
    streetOverlayContainer.style.display = 'block';
    isStreetVisible = true;
    streetBtn.textContent = 'Κλείσιμο';  // Αλλάζουμε την ένδειξη του κουμπιού
  } else {
    streetOverlayContainer.style.display = 'none';
    isStreetVisible = false;
    streetBtn.textContent = 'Street View';
  }
});

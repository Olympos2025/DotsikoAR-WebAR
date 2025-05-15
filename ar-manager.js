// Helper: Hide info panel
function hideInfoPanel() {
  document.getElementById('info-panel').style.display = 'none';
}

// Helper: Show info panel
function showInfoPanel(title, props) {
  document.getElementById('info-title').textContent = title;
  const content = document.getElementById('info-content');
  content.innerHTML = '';
  for (const [key, value] of Object.entries(props)) {
    if (!value || key === 'id') continue;
    content.innerHTML += `<div class="info-item"><span>${key}</span><span>${value}</span></div>`;
  }
  document.getElementById('info-panel').style.display = 'block';
}

// Main AR Manager
(function() {
  const loader = document.getElementById('loader');
  const fileInput = document.getElementById('file-input');
  const clearBtn = document.getElementById('clear-btn');
  const arEntities = document.getElementById('ar-entities');
  let features = [];

  // Hide loader after AR.js ready
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => loader.style.display = 'none', 1200);
  });

  // Clear AR entities
  clearBtn.addEventListener('click', () => {
    arEntities.innerHTML = '';
    features = [];
    hideInfoPanel();
  });

  // Load KML
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    loader.style.display = 'flex';
    for (const file of files) {
      try {
        const geoJson = await parseKML(file);
        features = features.concat(geoJson.features);
        renderFeatures(geoJson.features);
      } catch (err) {
        alert('Σφάλμα KML: ' + err.message);
      }
    }
    loader.style.display = 'none';
  });

  // Parse KML to GeoJSON
  function parseKML(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const kmlDoc = new DOMParser().parseFromString(e.target.result, 'text/xml');
          const geoJson = toGeoJSON.kml(kmlDoc);
          if (!geoJson || !geoJson.features || !geoJson.features.length)
            throw new Error('Το αρχείο δεν περιέχει γεωμετρικά στοιχεία.');
          // Εμπλουτισμός properties
          geoJson.features.forEach((f, i) => {
            f.properties = f.properties || {};
            const placemark = kmlDoc.getElementsByTagName('Placemark')[i];
            if (placemark) {
              const name = placemark.getElementsByTagName('name')[0];
              if (name) f.properties.name = name.textContent;
              const desc = placemark.getElementsByTagName('description')[0];
              if (desc) f.properties.description = desc.textContent;
              // ExtendedData
              const ext = placemark.getElementsByTagName('ExtendedData')[0];
              if (ext) {
                Array.from(ext.getElementsByTagName('Data')).forEach(d => {
                  const key = d.getAttribute('name');
                  const val = d.getElementsByTagName('value')[0]?.textContent;
                  if (key && val) f.properties[key] = val;
                });
              }
            }
            f.properties.id = `f${Date.now()}${i}${Math.floor(Math.random()*10000)}`;
          });
          resolve(geoJson);
        } catch (err) {
          reject(new Error('Λάθος μορφή αρχείου ή μη υποστηριζόμενο KML.'));
        }
      };
      reader.onerror = () => reject(new Error('Αδυναμία ανάγνωσης αρχείου'));
      reader.readAsText(file);
    });
  }

  // Render GeoJSON features in AR
  function renderFeatures(features) {
    for (const feature of features) {
      let entity = document.createElement('a-entity');
      entity.classList.add('ar-entity');
      entity.setAttribute('data-feature-id', feature.properties.id);

      // Material
      const color = getColor(feature.geometry.type);
      const material = `color: ${color}; opacity: ${feature.geometry.type==='Polygon'?0.4:1}; transparent: true;`;

      // Geometry
      if (feature.geometry.type === 'Point') {
        const [lon, lat, alt=0] = feature.geometry.coordinates;
        entity.setAttribute('gps-new-entity-place', {latitude: lat, longitude: lon, altitude: alt});
        entity.setAttribute('geometry', {primitive: 'sphere', radius: 3});
        entity.setAttribute('material', material);
      }
      else if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates;
        for (let i=0; i<coords.length-1; i++) {
          const [lon1, lat1, alt1=0] = coords[i];
          const [lon2, lat2, alt2=0] = coords[i+1];
          let line = document.createElement('a-entity');
          line.setAttribute('gps-new-entity-place', {latitude: lat1, longitude: lon1, altitude: alt1});
          line.setAttribute('line', {
            start: "0 0 0",
            end: `${(lon2-lon1)*90000} ${(alt2-alt1)} ${(lat2-lat1)*111000}`,
            color: color,
            opacity: 1
          });
          line.classList.add('ar-entity');
          line.setAttribute('data-feature-id', feature.properties.id);
          line.addEventListener('click', () => showInfoPanel(feature.properties.name || 'Γραμμή', feature.properties));
          arEntities.appendChild(line);
        }
        continue;
      }
      else if (feature.geometry.type === 'Polygon') {
        // Βρίσκουμε το κέντρο για το plane
        const coords = feature.geometry.coordinates[0];
        const center = getCenter(coords);
        entity.setAttribute('gps-new-entity-place', {latitude: center.lat, longitude: center.lon, altitude: 0});
        entity.setAttribute('geometry', {primitive: 'plane', width: 30, height: 30});
        entity.setAttribute('material', material);
      }
      entity.addEventListener('click', () => showInfoPanel(feature.properties.name || 'Στοιχείο', feature.properties));
      arEntities.appendChild(entity);
    }
  }

  // Χρώματα ανά τύπο
  function getColor(type) {
    return type === 'Polygon' ? '#6366f1' : type === 'LineString' ? '#10b981' : '#f59e0b';
  }

  // Κέντρο πολυγώνου
  function getCenter(coords) {
    let lats = coords.map(c => c[1]), lons = coords.map(c => c[0]);
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lon: (Math.min(...lons) + Math.max(...lons)) / 2
    };
  }
})();

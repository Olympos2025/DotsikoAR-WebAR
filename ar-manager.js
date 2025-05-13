const arManager = {
    container: null,
    fileInput: null,
    clearButton: null,
    refreshButton: null,
    loadedFeatures: [],
    userPosition: null,

    init: function() {
        this.container = document.querySelector('#ar-container');
        this.fileInput = document.getElementById('file-input');
        this.clearButton = document.getElementById('clear-button');
        this.refreshButton = document.getElementById('refresh-button');

        this.initEventListeners();
        this.initGeoLocation();
    },

    initEventListeners: function() {
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.loadKMLFiles(e.target.files);
            }
        });

        this.clearButton.addEventListener('click', () => {
            this.clearARScene();
        });

        this.refreshButton.addEventListener('click', () => {
            location.reload();
        });
    },

    initGeoLocation: function() {
        // Fallback GPS για Θεσσαλονίκη
        this.userPosition = {
            latitude: 40.6401,
            longitude: 22.9444,
            altitude: 0,
            accuracy: 1000
        };

        const gpsOptions = {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 27000
        };

        navigator.geolocation.watchPosition(
            (position) => {
                document.getElementById('gps-status').textContent = 'GPS: Ενεργό';
                document.getElementById('gps-indicator').classList.add('active');
                this.userPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    altitude: position.coords.altitude || 0,
                    accuracy: position.coords.accuracy
                };
            },
            (error) => {
                document.getElementById('gps-status').textContent = 'GPS: Ανενεργό';
            },
            gpsOptions
        );
    },

    loadKMLFiles: async function(files) {
        document.getElementById('loading').style.display = 'flex';
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file.name.toLowerCase().endsWith('.kml')) continue;
                const geoJson = await kmlParser.parseKML(file);
                const styledGeoJson = kmlParser.applyStyling(geoJson);
                const simplifiedGeoJson = kmlParser.simplifyGeometry(styledGeoJson, 0.0001);
                this.createAREntities(simplifiedGeoJson.features);
                this.loadedFeatures = [...this.loadedFeatures, ...simplifiedGeoJson.features];
            }
        } catch (error) {
            alert(`Σφάλμα φόρτωσης KML: ${error.message}`);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    },

    createAREntities: function(features) {
        if (!this.container) return;
        features.forEach((feature, index) => {
            if (!feature.geometry || !feature.geometry.coordinates) return;
            const geomType = feature.geometry.type;
            const properties = feature.properties || {};
            const entity = document.createElement('a-entity');
            entity.classList.add('ar-entity');
            entity.setAttribute('data-feature-index', index);
            const color = properties.color || '#FF0000';
            const opacity = properties.fillOpacity || 1;

            if (geomType === 'Point') {
                const coords = feature.geometry.coordinates;
                entity.setAttribute('geometry', {
                    primitive: 'sphere',
                    radius: 5
                });
                entity.setAttribute('material', {
                    color: color,
                    opacity: opacity,
                    transparent: opacity < 1
                });
                entity.setAttribute('gps-new-entity-place', {
                    latitude: coords[1],
                    longitude: coords[0],
                    altitude: coords[2] || 0
                });
            } else if (geomType === 'LineString') {
                const coords = feature.geometry.coordinates;
                coords.forEach((coord, i) => {
                    if (i === coords.length - 1) return;
                    const next = coords[i + 1];
                    const line = document.createElement('a-entity');
                    line.setAttribute('line', {
                        start: "0 0 0",
                        end: `${next[0] - coord[0]} 0 ${next[1] - coord[1]}`,
                        color: color,
                        opacity: properties.strokeOpacity || 1,
                        width: properties.strokeWidth || 3
                    });
                    line.setAttribute('gps-new-entity-place', {
                        latitude: coord[1],
                        longitude: coord[0],
                        altitude: coord[2] || 0
                    });
                    this.container.appendChild(line);
                });
                return;
            } else if (geomType === 'Polygon') {
                const coords = feature.geometry.coordinates[0];
                let centerLat = 0, centerLon = 0, centerAlt = 0;
                coords.forEach(coord => {
                    centerLon += coord[0];
                    centerLat += coord[1];
                    centerAlt += coord[2] || 0;
                });
                centerLat /= coords.length;
                centerLon /= coords.length;
                centerAlt /= coords.length;
                entity.setAttribute('geometry', {
                    primitive: 'plane',
                    width: 100,
                    height: 100
                });
                entity.setAttribute('material', {
                    color: color,
                    opacity: opacity,
                    transparent: true,
                    side: 'double'
                });
                entity.setAttribute('gps-new-entity-place', {
                    latitude: centerLat,
                    longitude: centerLon,
                    altitude: centerAlt
                });
            }
            this.container.appendChild(entity);
        });
    },

    clearARScene: function() {
        if (!this.container) return;
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        this.loadedFeatures = [];
    }
};

document.addEventListener('DOMContentLoaded', () => {
    arManager.init();
});

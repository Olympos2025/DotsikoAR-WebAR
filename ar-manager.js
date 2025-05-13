class ARManager {
    constructor() {
        this.scene = document.querySelector('#ar-scene');
        this.container = document.querySelector('#ar-content');
        this.loader = document.querySelector('#loading');
        this.initEventListeners();
        this.initAREnvironment();
    }

    initEventListeners() {
        // KML File Input
        document.getElementById('kml-input').addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            this.loader.style.display = 'flex';
            try {
                for (const file of files) {
                    const geoJson = await this.parseKML(file);
                    this.createAREntities(geoJson.features);
                }
            } catch (error) {
                this.showError(`Σφάλμα: ${error.message}`);
            }
            this.loader.style.display = 'none';
        });

        // Clear Button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.container.innerHTML = '';
        });
    }

    async parseKML(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const kmlDoc = new DOMParser().parseFromString(e.target.result, 'text/xml');
                    const geoJson = toGeoJSON.kml(kmlDoc);
                    
                    // Validate GeoJSON
                    if (!geoJson || !geoJson.features) {
                        throw new Error('Μη έγκυρο KML αρχείο');
                    }
                    
                    resolve(geoJson);
                } catch (error) {
                    reject(new Error('Λάθος μορφή αρχείου'));
                }
            };
            reader.onerror = () => reject(new Error('Αδυναμία ανάγνωσης αρχείου'));
            reader.readAsText(file);
        });
    }

    createAREntities(features) {
        features.forEach(feature => {
            const entity = document.createElement('a-entity');
            entity.classList.add('ar-element');
            
            // Material properties
            const material = {
                color: this.getColorForType(feature.geometry.type),
                opacity: 0.8,
                transparent: true,
                metalness: 0.7,
                roughness: 0.3
            };

            switch(feature.geometry.type) {
                case 'Polygon':
                    this.createPolygon(entity, feature, material);
                    break;
                case 'LineString':
                    this.createLine(entity, feature, material);
                    break;
                case 'Point':
                    this.createPoint(entity, feature, material);
                    break;
            }

            entity.addEventListener('click', () => this.showFeatureInfo(feature));
            this.container.appendChild(entity);
        });
    }

    createPolygon(entity, feature, material) {
        const coords = feature.geometry.coordinates[0];
        const center = this.calculateCenter(coords);
        
        entity.setAttribute('gps-new-entity-place', {
            latitude: center.lat,
            longitude: center.lon
        });

        entity.setAttribute('geometry', {
            primitive: 'plane',
            width: 10,
            height: 10
        });

        entity.setAttribute('material', material);
    }

    showFeatureInfo(feature) {
        const panel = document.querySelector('.info-panel');
        const title = feature.properties.name || 'Μη ονομασμένο στοιχείο';
        let content = '';
        
        for (const [key, value] of Object.entries(feature.properties)) {
            content += `
                <div class="info-item">
                    <span>${key}</span>
                    <span>${value || 'N/A'}</span>
                </div>
            `;
        }

        document.getElementById('feature-title').textContent = title;
        document.getElementById('feature-properties').innerHTML = content;
        panel.classList.add('active');
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    calculateCenter(coords) {
        const lons = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        return {
            lon: (Math.min(...lons) + Math.max(...lons)) / 2,
            lat: (Math.min(...lats) + Math.max(...lats)) / 2
        };
    }

    getColorForType(type) {
        const colors = {
            Polygon: '#6366f1',
            LineString: '#10b981',
            Point: '#f59e0b'
        };
        return colors[type] || '#ffffff';
    }
}

// Initialize AR Manager
const arManager = new ARManager();

// Helper functions
function hideInfo() {
    document.querySelector('.info-panel').classList.remove('active');
}

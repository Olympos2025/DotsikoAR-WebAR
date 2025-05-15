class ARManager {
    constructor() {
        this.scene = document.getElementById('ar-scene');
        this.container = document.getElementById('ar-content');
        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('kml-input').addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) await this.loadKML(file);
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.container.innerHTML = '';
        });

        this.scene.addEventListener('click', (e) => {
            const entity = e.detail.intersection?.el;
            if (entity?.classList.contains('ar-element')) {
                this.showInfo(entity.dataset.featureId);
            }
        });
    }

    async loadKML(file) {
        try {
            const geoJson = await this.parseKML(file);
            this.createEntities(geoJson.features);
        } catch (error) {
            alert(`Σφάλμα: ${error.message}`);
        }
    }

    parseKML(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const kmlDoc = new DOMParser().parseFromString(e.target.result, 'text/xml');
                    const geoJson = window.toGeoJSON.kml(kmlDoc);
                    
                    // Extract properties
                    geoJson.features.forEach((feature, index) => {
                        const placemark = kmlDoc.getElementsByTagName('Placemark')[index];
                        feature.properties = {
                            name: placemark?.getElementsByTagName('name')[0]?.textContent || 'Χωρίς όνομα',
                            description: placemark?.getElementsByTagName('description')[0]?.textContent || '',
                            id: `feature-${Date.now()}-${index}`
                        };
                    });

                    resolve(geoJson);
                } catch (error) {
                    reject(new Error('Μη έγκυρο KML αρχείο'));
                }
            };
            reader.onerror = () => reject(new Error('Αδυναμία ανάγνωσης αρχείου'));
            reader.readAsText(file);
        });
    }

    createEntities(features) {
        features.forEach(feature => {
            const entity = document.createElement('a-entity');
            entity.classList.add('ar-element');
            entity.setAttribute('data-feature-id', feature.properties.id);

            switch(feature.geometry.type) {
                case 'Polygon':
                    this.createPolygon(entity, feature);
                    break;
                case 'LineString':
                    this.createLine(entity, feature);
                    break;
                case 'Point':
                    this.createPoint(entity, feature);
                    break;
            }

            this.container.appendChild(entity);
        });
    }

    createPolygon(entity, feature) {
        const coords = feature.geometry.coordinates[0];
        const center = this.calculateCenter(coords);
        
        entity.setAttribute('gps-new-entity-place', {
            latitude: center.lat,
            longitude: center.lon,
            altitude: 0
        });

        entity.setAttribute('geometry', {
            primitive: 'plane',
            width: 10,
            height: 10
        });

        entity.setAttribute('material', {
            color: '#6366f1',
            opacity: 0.4,
            transparent: true
        });
    }

    showInfo(featureId) {
        const panel = document.querySelector('.info-panel');
        const feature = [...this.container.children].find(e => e.dataset.featureId === featureId)?.__feature;
        if (!feature) return;

        document.getElementById('info-title').textContent = feature.properties.name;
        document.getElementById('info-content').innerHTML = `
            <p>${feature.properties.description}</p>
            <div class="info-item">
                <span>Τύπος</span>
                <span>${feature.geometry.type}</span>
            </div>
        `;
        panel.classList.add('active');
    }

    calculateCenter(coords) {
        const lons = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        return {
            lon: (Math.min(...lons) + Math.max(...lons)) / 2,
            lat: (Math.min(...lats) + Math.max(...lats)) / 2
        };
    }
}

// Initialize
const arManager = new ARManager();

// Helper function
function hideInfo() {
    document.querySelector('.info-panel').classList.remove('active');
}

class ARManager {
    constructor() {
        this.container = document.getElementById('ar-container');
        this.scene = document.getElementById('scene');
        this.initEventListeners();
    }

    initEventListeners() {
        // File input
        document.getElementById('file-input').addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files.length > 0) await this.loadKML(files);
        });

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearScene();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            location.reload();
        });

        // Click events
        this.scene.addEventListener('click', (e) => {
            const entity = e.detail.intersection?.el;
            if (entity?.classList.contains('ar-element')) {
                this.showFeatureInfo(entity.dataset.featureId);
            }
        });
    }

    async loadKML(files) {
        try {
            for (const file of files) {
                const geoJson = await KMLParser.parse(file);
                this.createEntities(geoJson.features);
            }
        } catch (error) {
            alert(`Σφάλμα φόρτωσης: ${error.message}`);
        }
    }

    createEntities(features) {
        features.forEach(feature => {
            const entity = document.createElement('a-entity');
            entity.classList.add('ar-element');
            entity.setAttribute('data-feature-id', feature.properties.id);
            
            // Δημιουργία γεωμετρίας
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
            height: 10,
            color: '#FF4081',
            opacity: 0.5
        });

        entity.setAttribute('material', 'transparent', true);
    }

    createLine(entity, feature) {
        const coords = feature.geometry.coordinates;
        const positions = coords.map(coord => `${coord[0]} ${coord[1]} ${coord[2] || 0}`);
        
        entity.setAttribute('line', {
            points: positions.join(', '),
            color: '#2196F3',
            lineWidth: 2
        });
    }

    createPoint(entity, feature) {
        const [lon, lat, alt] = feature.geometry.coordinates;
        
        entity.setAttribute('gps-new-entity-place', {
            latitude: lat,
            longitude: lon,
            altitude: alt || 0
        });

        entity.setAttribute('geometry', {
            primitive: 'sphere',
            radius: 2,
            color: '#4CAF50'
        });
    }

    showFeatureInfo(featureId) {
        const feature = currentFeatures.find(f => f.properties.id === featureId);
        if (!feature) return;

        let content = '';
        for (const [key, value] of Object.entries(feature.properties)) {
            if (key !== 'id') content += `<p><strong>${key}:</strong> ${value}</p>`;
        }
        
        showInfo(feature.properties.name || 'Χωρίς τίτλο', content);
    }

    calculateCenter(coords) {
        const lons = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        
        return {
            lon: (Math.min(...lons) + Math.max(...lons)) / 2,
            lat: (Math.min(...lats) + Math.max(...lats)) / 2
        };
    }

    clearScene() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }
}

// Αρχικοποίηση
const arManager = new ARManager();

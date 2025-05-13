class ARManager {
    constructor() {
        this.scene = document.querySelector('a-scene');
        this.container = document.getElementById('ar-container');
        this.initEventListeners();
        this.initAREnvironment();
        this.features = [];
    }

    initEventListeners() {
        // File input
        document.getElementById('file-input').addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            document.getElementById('loading').style.display = 'flex';
            try {
                for (const file of files) {
                    const geoJson = await KMLParser.parse(file);
                    this.createAREntities(geoJson.features);
                    this.features.push(...geoJson.features);
                }
            } catch (error) {
                alert(error.message);
            }
            document.getElementById('loading').style.display = 'none';
        });

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.container.innerHTML = '';
            this.features = [];
        });

        // Scene click handler
        this.scene.addEventListener('click', (e) => {
            const entity = e.detail.intersection?.el;
            if (entity?.classList.contains('ar-element')) {
                const feature = this.features.find(f => f.id === entity.dataset.featureId);
                if (feature) this.showFeatureInfo(feature);
            }
        });
    }

    initAREnvironment() {
        // Configure scene environment
        this.scene.setAttribute('environment', {
            preset: 'default',
            seed: 1234,
            lighting: 'distant',
            shadow: true
        });

        // Add ambient light
        const ambientLight = document.createElement('a-light');
        ambientLight.setAttribute('type', 'ambient');
        ambientLight.setAttribute('intensity', '0.5');
        this.scene.appendChild(ambientLight);
    }

    createAREntities(features) {
        features.forEach(feature => {
            const entity = document.createElement('a-entity');
            entity.classList.add('ar-element');
            entity.setAttribute('data-feature-id', feature.id);
            
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
            longitude: center.lon
        });

        entity.setAttribute('geometry', {
            primitive: 'plane',
            width: 10,
            height: 10
        });

        entity.setAttribute('material', {
            color: '#6366f1',
            opacity: 0.4,
            transparent: true,
            metalness: 0.7,
            roughness: 0.3
        });

        entity.setAttribute('animation', {
            property: 'material.opacity',
            to: 0.7,
            dir: 'alternate',
            loop: true,
            dur: 2000
        });
    }

    showFeatureInfo(feature) {
        let content = `<div class="info-item">
            <span>Τύπος</span>
            <span>${feature.geometry.type}</span>
        </div>`;

        for (const [key, value] of Object.entries(feature.properties)) {
            content += `<div class="info-item">
                <span>${key}</span>
                <span>${value || 'N/A'}</span>
            </div>`;
        }

        showInfo(feature.properties.name || 'Άγνωστο Στοιχείο', content);
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

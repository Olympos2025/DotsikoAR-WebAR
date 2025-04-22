const arManager = {
    container: document.querySelector('#ar-container'),
    
    loadKML: async (files) => {
        const allFeatures = [];
        
        for (const file of files) {
            const geoJson = await kmlParser.parseKML(file);
            const styledFeatures = kmlParser.applyStyling(geoJson);
            allFeatures.push(...styledFeatures);
        }
        
        this.clearExisting();
        this.createAREntities(allFeatures);
    },

    createAREntities: (features) => {
        features.forEach(feature => {
            const entity = document.createElement('a-entity');
            
            switch(feature.geometry.type) {
                case 'Polygon':
                    entity.setAttribute('primitive', 'a-plane');
                    break;
                case 'LineString':
                    entity.setAttribute('primitive', 'a-line');
                    break;
                case 'Point':
                    entity.setAttribute('primitive', 'a-sphere');
                    break;
            }
            
            entity.setAttribute('material', {
                color: feature.properties.color || '#FF0000',
                opacity: feature.properties.fillOpacity,
                transparent: feature.properties.fillOpacity < 1
            });
            
            entity.setAttribute('gps-new-entity-place', {
                latitude: feature.geometry.coordinates[1],
                longitude: feature.geometry.coordinates[0],
                altitude: feature.geometry.coordinates[2] || 0
            });
            
            this.container.appendChild(entity);
        });
    },

    clearExisting: () => {
        this.container.querySelectorAll('a-entity').forEach(entity => {
            entity.remove();
        });
    },

    initEventListeners: () => {
        document.getElementById('file-input').addEventListener('change', (e) => {
            arManager.loadKML(e.target.files);
        });
        
        document.getElementById('clear-button').addEventListener('click', () => {
            arManager.clearExisting();
        });
    }
};

arManager.initEventListeners();

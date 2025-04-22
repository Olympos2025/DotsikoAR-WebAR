const kmlParser = {
    parseKML: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const kml = new DOMParser().parseFromString(e.target.result, 'text/xml');
                const geoJson = toGeoJSON.kml(kml);
                resolve(geoJson);
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    applyStyling: (geoJson) => {
        return geoJson.features.map(feature => {
            const properties = feature.properties || {};
            
            // Ρύθμιση διαφανειότητας
            properties.fillOpacity = feature.geometry.type === 'Polygon' ? 0.3 : 1;
            properties.strokeOpacity = 1;
            
            return feature;
        });
    }
};

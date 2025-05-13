const kmlParser = {
    parseKML: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const kml = new DOMParser().parseFromString(e.target.result, 'text/xml');
                    const geoJson = toGeoJSON.kml(kml);
                    resolve(geoJson);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    applyStyling: function(geoJson) {
        if (!geoJson || !geoJson.features) return geoJson;
        geoJson.features = geoJson.features.map(feature => {
            const properties = feature.properties || {};
            if (feature.geometry.type === 'Polygon') {
                properties.color = "#2ECC40";
                properties.fillOpacity = 0.3;
                properties.strokeOpacity = 1;
            } else if (feature.geometry.type === 'LineString') {
                properties.color = "#0074D9";
                properties.fillOpacity = 1;
                properties.strokeOpacity = 1;
            } else {
                properties.color = "#FF4136";
                properties.fillOpacity = 1;
                properties.strokeOpacity = 1;
            }
            feature.properties = properties;
            return feature;
        });
        return geoJson;
    },

    simplifyGeometry: function(geoJson, tolerance = 0.001) {
        if (!geoJson || !geoJson.features) return geoJson;
        geoJson.features = geoJson.features.map(feature => {
            if (feature.geometry.type === 'LineString') {
                feature.geometry.coordinates = feature.geometry.coordinates.filter((_, i) => i % 2 === 0 || i === feature.geometry.coordinates.length - 1);
            }
            return feature;
        });
        return geoJson;
    }
};

class KMLParser {
    static async parse(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const parser = new DOMParser();
                    const kmlDoc = parser.parseFromString(e.target.result, 'text/xml');
                    const geoJson = window.toGeoJSON.kml(kmlDoc);
                    
                    // Εξαγωγή properties
                    geoJson.features = geoJson.features.map((feature, index) => {
                        const placemark = kmlDoc.getElementsByTagName('Placemark')[index];
                        return {
                            ...feature,
                            properties: this.extractProperties(placemark)
                        };
                    });

                    resolve(geoJson);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    static extractProperties(placemark) {
        const properties = {};
        // Εξαγωγή όνοματος
        const name = placemark.getElementsByTagName('name')[0];
        if (name) properties.name = name.textContent;
        
        // Εξαγωγή περιγραφής
        const description = placemark.getElementsByTagName('description')[0];
        if (description) properties.description = description.textContent;

        // Προσθήκη μοναδικού ID
        properties.id = `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return properties;
    }
}

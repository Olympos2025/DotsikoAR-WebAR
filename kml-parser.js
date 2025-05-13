class KMLParser {
    static async parse(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parser = new DOMParser();
                    const kmlDoc = parser.parseFromString(e.target.result, 'text/xml');
                    const geoJson = window.toGeoJSON.kml(kmlDoc);
                    
                    // Extract extended properties
                    geoJson.features = Array.from(kmlDoc.getElementsByTagName('Placemark')).map((placemark, index) => {
                        const feature = geoJson.features[index];
                        feature.properties = this.extractPlacemarkData(placemark);
                        feature.id = `feature-${Date.now()}-${index}`;
                        return feature;
                    });

                    resolve(geoJson);
                } catch (error) {
                    reject(new Error('Λάθος μορφή KML αρχείου'));
                }
            };
            reader.onerror = () => reject(new Error('Σφάλμα ανάγνωσης αρχείου'));
            reader.readAsText(file);
        });
    }

    static extractPlacemarkData(placemark) {
        const props = {};
        // Extract name
        const nameElement = placemark.getElementsByTagName('name')[0];
        if (nameElement) props.name = nameElement.textContent;
        
        // Extract description
        const descElement = placemark.getElementsByTagName('description')[0];
        if (descElement) props.description = descElement.textContent;

        // Extract custom data
        const extendedData = placemark.getElementsByTagName('ExtendedData')[0];
        if (extendedData) {
            Array.from(extendedData.getElementsByTagName('Data')).forEach(dataElement => {
                const key = dataElement.getAttribute('name');
                const value = dataElement.getElementsByTagName('value')[0]?.textContent;
                if (key && value) props[key] = value;
            });
        }

        return props;
    }
}

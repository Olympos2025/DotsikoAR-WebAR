class KMLParser {
    static async parse(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const parser = new DOMParser();
                    const kmlDoc = parser.parseFromString(e.target.result, 'text/xml');
                    
                    // Check for parser errors
                    if (kmlDoc.getElementsByTagName('parsererror').length > 0) {
                        throw new Error('Μη έγκυρο KML αρχείο');
                    }

                    // Convert KML to GeoJSON
                    const geoJson = window.toGeoJSON.kml(kmlDoc);

                    // Enrich features with additional data
                    geoJson.features = Array.from(kmlDoc.getElementsByTagName('Placemark')).map((placemark, index) => {
                        const feature = geoJson.features[index];
                        feature.properties = this.extractProperties(placemark);
                        feature.id = `feature-${Date.now()}-${index}`;
                        return feature;
                    });

                    resolve(geoJson);
                } catch (error) {
                    reject(new Error('Σφάλμα ανάλυσης KML: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Σφάλμα ανάγνωσης αρχείου'));
            reader.readAsText(file);
        });
    }

    static extractProperties(placemark) {
        const props = {};
        
        // Extract basic properties
        props.name = placemark.getElementsByTagName('name')[0]?.textContent || 'Χωρίς όνομα';
        props.description = placemark.getElementsByTagName('description')[0]?.textContent || 'Δεν υπάρχει περιγραφή';

        // Extract ExtendedData
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

class KMLParser {
    /**
     * Ανάγνωση ενός αρχείου KML και μετατροπή του σε GeoJSON
     * @param {File} file - Το αρχείο KML προς φόρτωση
     * @returns {Promise<Object>} - Υπόσχεση που επιστρέφει ένα GeoJSON αντικείμενο
     */
    static parse(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const text = event.target.result;
                    const parser = new DOMParser();
                    const kmlDoc = parser.parseFromString(text, 'text/xml');
                    // Μετατροπή KML σε GeoJSON
                    const geoJson = toGeoJSON.kml(kmlDoc);
                    if (!geoJson || !geoJson.features) {
                        throw new Error('Το KML αρχείο δεν περιέχει έγκυρα γεωμετρικά δεδομένα.');
                    }
                    // Εμπλουτισμός properties για κάθε feature από τα Placemark
                    geoJson.features = geoJson.features.map((feature, index) => {
                        const placemark = kmlDoc.getElementsByTagName('Placemark')[index];
                        feature.properties = this.extractProperties(placemark);
                        return feature;
                    });
                    // Επίπεδοποίηση όλων των υψομέτρων σε επίπεδο εδάφους (altitude = 0)
                    geoJson.features.forEach(f => {
                        const geom = f.geometry;
                        if (!geom) return;
                        if (geom.type === 'Polygon') {
                            geom.coordinates = geom.coordinates.map(ring =>
                                ring.map(([lon, lat, alt]) => [lon, lat, 0])
                            );
                        } else if (geom.type === 'LineString') {
                            geom.coordinates = geom.coordinates.map(([lon, lat, alt]) => [lon, lat, 0]);
                        } else if (geom.type === 'Point') {
                            if (geom.coordinates.length === 3) {
                                geom.coordinates[2] = 0;
                            }
                        }
                    });
                    resolve(geoJson);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => {
                reject(new Error('Αποτυχία ανάγνωσης του αρχείου KML.'));
            };
            // Έναρξη ανάγνωσης αρχείου ως κείμενο
            reader.readAsText(file);
        });
    }

    /**
     * Εξαγωγή βασικών ιδιοτήτων (όνομα, περιγραφή, κλπ) από ένα Placemark στοιχείο
     * @param {Element} placemark - Το στοιχείο Placemark από το KML DOM
     * @returns {Object} - Αντικείμενο με τις ιδιότητες του Placemark
     */
    static extractProperties(placemark) {
        const properties = {};
        if (!placemark) return properties;
        // Όνομα (Name)
        const nameElem = placemark.getElementsByTagName('name')[0];
        if (nameElem && nameElem.textContent) {
            properties.name = nameElem.textContent;
        }
        // Περιγραφή (Description)
        const descElem = placemark.getElementsByTagName('description')[0];
        if (descElem && descElem.textContent) {
            properties.description = descElem.textContent;
        }
        // Δημιουργία μοναδικού ID
        properties.id = `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return properties;
    }
}

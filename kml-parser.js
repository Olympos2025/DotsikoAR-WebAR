/**
 * KML Parser Module - Μετατρέπει KML αρχεία σε GeoJSON
 * @author Thomas G. Lagkas
 * @version 1.0.0
 */

const kmlParser = {
    /**
     * Μετατρέπει ένα KML αρχείο σε GeoJSON
     * @param {File} file - Το αρχείο KML
     * @returns {Promise<Object>} - GeoJSON αντικείμενο
     */
    parseKML: function(file) {
        return new Promise((resolve, reject) => {
            console.log(`Parsing KML file: ${file.name}`);
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    // Μετατροπή του περιεχομένου του αρχείου σε XML
                    const kmlString = e.target.result;
                    const parser = new DOMParser();
                    const kmlDoc = parser.parseFromString(kmlString, 'text/xml');
                    
                    // Έλεγχος για σφάλματα στο parsing
                    const parserError = kmlDoc.querySelector('parsererror');
                    if (parserError) {
                        console.error('XML parsing error:', parserError);
                        reject(new Error('Invalid KML: XML parsing error'));
                        return;
                    }
                    
                    // Μετατροπή KML σε GeoJSON
                    const geoJson = this.kmlToGeoJSON(kmlDoc);
                    console.log('Converted to GeoJSON:', geoJson);
                    resolve(geoJson);
                } catch (error) {
                    console.error('Error parsing KML:', error);
                    reject(error);
                }
            };
            
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(error);
            };
            
            reader.readAsText(file);
        });
    },
    
    /**
     * Μετατρέπει ένα KML DOM σε GeoJSON
     * @param {Document} kmlDoc - Το KML ως XML Document
     * @returns {Object} - GeoJSON αντικείμενο
     */
    kmlToGeoJSON: function(kmlDoc) {
        // Χρήση της βιβλιοθήκης toGeoJSON για τη μετατροπή
        if (typeof toGeoJSON !== 'undefined' && toGeoJSON.kml) {
            return toGeoJSON.kml(kmlDoc);
        } else {
            // Fallback εάν δεν έχει φορτωθεί η βιβλιοθήκη
            console.warn('toGeoJSON library not loaded, using basic parser');
            return this.basicKmlToGeoJSON(kmlDoc);
        }
    },
    
    /**
     * Βασικός parser KML → GeoJSON
     * @param {Document} kmlDoc - Το KML ως XML Document
     * @returns {Object} - Απλοποιημένο GeoJSON
     */
    basicKmlToGeoJSON: function(kmlDoc) {
        const features = [];
        
        // Εξαγωγή placemarks
        const placemarks = kmlDoc.querySelectorAll('Placemark');
        
        placemarks.forEach((placemark, index) => {
            const name = placemark.querySelector('name')?.textContent || `Feature ${index}`;
            const description = placemark.querySelector('description')?.textContent || '';
            
            // Διαχείριση σημείων (Points)
            const point = placemark.querySelector('Point');
            if (point) {
                const coordinates = point.querySelector('coordinates')?.textContent.trim();
                if (coordinates) {
                    const [lon, lat, alt = 0] = coordinates.split(',').map(parseFloat);
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [lon, lat, alt]
                        },
                        properties: { name, description }
                    });
                }
            }
            
            // Διαχείριση γραμμών (LineStrings)
            const lineString = placemark.querySelector('LineString');
            if (lineString) {
                const coordinatesText = lineString.querySelector('coordinates')?.textContent.trim();
                if (coordinatesText) {
                    const coords = coordinatesText.split(/\s+/).map(coord => {
                        const [lon, lat, alt = 0] = coord.split(',').map(parseFloat);
                        return [lon, lat, alt];
                    });
                    
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: coords
                        },
                        properties: { name, description }
                    });
                }
            }
            
            // Διαχείριση πολυγώνων (Polygons)
            const polygon = placemark.querySelector('Polygon');
            if (polygon) {
                const outerBoundary = polygon.querySelector('outerBoundaryIs LinearRing coordinates');
                if (outerBoundary) {
                    const outerCoords = outerBoundary.textContent.trim().split(/\s+/).map(coord => {
                        const [lon, lat, alt = 0] = coord.split(',').map(parseFloat);
                        return [lon, lat, alt];
                    });
                    
                    // Πολύγωνα πρέπει να είναι κλειστά στο GeoJSON (πρώτο = τελευταίο σημείο)
                    if (outerCoords.length > 0 && (outerCoords[0][0] !== outerCoords[outerCoords.length-1][0] || 
                                                 outerCoords[0][1] !== outerCoords[outerCoords.length-1][1])) {
                        outerCoords.push([...outerCoords[0]]);
                    }
                    
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [outerCoords]
                        },
                        properties: { name, description }
                    });
                }
            }
        });
        
        return {
            type: 'FeatureCollection',
            features: features
        };
    },
    
    /**
     * Εφαρμόζει στυλ στα GeoJSON features
     * @param {Object} geoJson - GeoJSON αντικείμενο
     * @returns {Object} - GeoJSON με εφαρμοσμένα στυλ
     */
    applyStyling: function(geoJson) {
        if (!geoJson || !geoJson.features) {
            console.error('Invalid GeoJSON for styling');
            return geoJson;
        }
        
        // Χρώματα ανά τύπο γεωμετρίας
        const defaultColors = {
            'Point': '#FF4136',      // Κόκκινο
            'LineString': '#0074D9', // Μπλε
            'Polygon': '#2ECC40'     // Πράσινο
        };
        
        // Εφαρμογή στυλ σε κάθε feature
        geoJson.features = geoJson.features.map(feature => {
            if (!feature.geometry) return feature;
            
            // Δημιουργία αντιγράφου του feature
            const styledFeature = JSON.parse(JSON.stringify(feature));
            const geomType = feature.geometry.type;
            
            // Αρχικοποίηση ιδιοτήτων αν δεν υπάρχουν
            if (!styledFeature.properties) {
                styledFeature.properties = {};
            }
            
            // Καθορισμός χρώματος βάσει τύπου γεωμετρίας
            styledFeature.properties.color = defaultColors[geomType] || '#7FDBFF';
            
            // Καθορισμός διαφάνειας (πολύγωνα είναι ημιδιαφανή)
            styledFeature.properties.fillOpacity = geomType === 'Polygon' ? 0.3 : 1;
            styledFeature.properties.strokeOpacity = 1;
            
            // Καθορισμός πάχους γραμμής
            styledFeature.properties.strokeWidth = geomType === 'LineString' ? 3 : 2;
            
            return styledFeature;
        });
        
        return geoJson;
    },
    
    /**
     * Απλοποιεί τη γεωμετρία για καλύτερη απόδοση
     * @param {Object} geoJson - GeoJSON αντικείμενο
     * @param {number} tolerance - Τιμή απλοποίησης (0.0001 - 0.001 για τυπικά δεδομένα)
     * @returns {Object} - Απλοποιημένο GeoJSON
     */
    simplifyGeometry: function(geoJson, tolerance = 0.0001) {
        // Απλή απλοποίηση που αφαιρεί κάποια σημεία
        if (!geoJson || !geoJson.features) return geoJson;
        
        // Λόγω έλλειψης βιβλιοθήκης simplify, κάνουμε βασική απλοποίηση
        const simplifiedFeatures = geoJson.features.map(feature => {
            if (!feature.geometry) return feature;
            
            const geomType = feature.geometry.type;
            let coords = feature.geometry.coordinates;
            
            if (geomType === 'LineString' && coords.length > 20) {
                // Διατηρούμε περίπου 1 στα 3 σημεία
                feature.geometry.coordinates = coords.filter((_, i) => i % 3 === 0 || i === coords.length - 1);
            } 
            else if (geomType === 'Polygon' && coords[0].length > 20) {
                // Διατηρούμε περίπου 1 στα 3 σημεία για κάθε δακτύλιο, πάντα κρατώντας το πρώτο και τελευταίο
                feature.geometry.coordinates = coords.map(ring => 
                    ring.filter((_, i) => i % 3 === 0 || i === 0 || i === ring.length - 1)
                );
            }
            
            return feature;
        });
        
        return {
            type: 'FeatureCollection',
            features: simplifiedFeatures
        };
    }
};

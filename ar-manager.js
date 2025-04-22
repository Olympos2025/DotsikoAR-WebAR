/**
 * AR Manager Module - Διαχειρίζεται την AR εμπειρία και τα KML
 * @author Thomas G. Lagkas
 * @version 1.0.0
 */

const arManager = {
    // Αναφορές DOM
    container: null,
    scene: null,
    camera: null,
    fileInput: null,
    clearButton: null,
    refreshButton: null,
    
    // Μεταβλητές κατάστασης
    isInitialized: false,
    loadedFeatures: [],
    userPosition: null,
    userHeading: 0,
    
    /**
     * Αρχικοποίηση AR Manager
     */
    init: function() {
        console.log('Initializing AR Manager');
        
        // Αρχικοποίηση αναφορών DOM
        this.container = document.querySelector('#ar-container');
        this.scene = document.querySelector('a-scene');
        this.camera = document.querySelector('a-camera');
        this.fileInput = document.getElementById('file-input');
        this.clearButton = document.getElementById('clear-button');
        this.refreshButton = document.getElementById('refresh-button');
        
        // Έλεγχος υποστήριξης
        if (!this.scene || !this.camera || !this.container) {
            console.error('Missing critical A-Frame elements');
            alert('Η εφαρμογή δεν μπορεί να αρχικοποιηθεί. Λείπουν κρίσιμα στοιχεία.');
            return;
        }
        
        // Αρχικοποίηση listeners συμβάντων
        this.initEventListeners();
        
        // Αρχικοποίηση υπηρεσιών GPS
        this.initGeoLocation();
        
        this.isInitialized = true;
        console.log('AR Manager initialized');
    },
    
    /**
     * Αρχικοποίηση event listeners
     */
    initEventListeners: function() {
        // File input listener
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.loadKMLFiles(e.target.files);
            }
        });
        
        // Clear button listener
        this.clearButton.addEventListener('click', () => {
            this.clearARScene();
        });
        
        // Refresh button listener
        this.refreshButton.addEventListener('click', () => {
            location.reload();
        });
        
        // Scene loaded listener
        this.scene.addEventListener('loaded', () => {
            console.log('A-Frame scene loaded');
            document.getElementById('loading').style.display = 'none';
        });
        
        // Camera movement listener
        this.camera.addEventListener('gps-camera-update-position', (e) => {
            this.userPosition = {
                latitude: e.detail.position.latitude,
                longitude: e.detail.position.longitude,
                altitude: e.detail.position.altitude || 0
            };
            console.log('Camera position updated:', this.userPosition);
        });
    },
    
    /**
     * Αρχικοποίηση υπηρεσιών γεωεντοπισμού
     */
    initGeoLocation: function() {
        // Ενισχυμένες επιλογές GPS για καλύτερη ακρίβεια
        const gpsOptions = {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 27000
        };
        
        // Παρακολούθηση θέσης χρήστη
        navigator.geolocation.watchPosition(
            (position) => {
                // Επιτυχία GPS
                document.getElementById('gps-status').textContent = 'GPS: Ενεργό';
                document.getElementById('gps-indicator').classList.add('active');
                
                // Αποθήκευση θέσης χρήστη
                this.userPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    altitude: position.coords.altitude || 0,
                    accuracy: position.coords.accuracy
                };
                
                // Εμφάνιση δεδομένων στην κονσόλα για debugging
                console.log(`GPS Position: ${this.userPosition.latitude}, ${this.userPosition.longitude} (±${this.userPosition.accuracy}m)`);
                
                // Αυτοματοποιημένη ενημέρωση αποστάσεων
                this.updateAREntities();
            },
            (error) => {
                // Σφάλμα GPS
                document.getElementById('gps-status').textContent = 'GPS: Ανενεργό';
                console.error('GPS error:', error.message);
                
                if (error.code === error.PERMISSION_DENIED) {
                    alert("Παρακαλώ επιτρέψτε την πρόσβαση στην τοποθεσία για να λειτουργήσει η εφαρμογή AR");
                }
            },
            gpsOptions
        );
        
        // Εναλλακτική λύση για κατεύθυνση
        window.addEventListener('deviceorientation', (event) => {
            if (event.webkitCompassHeading) {
                // iOS
                this.userHeading = event.webkitCompassHeading;
            } else if (event.alpha) {
                // Android
                this.userHeading = 360 - event.alpha;
            }
        }, true);
    },
    
    /**
     * Φορτώνει KML αρχεία
     * @param {FileList} files - Τα KML αρχεία
     */
    loadKMLFiles: async function(files) {
        // Εμφάνιση ένδειξης φόρτωσης
        document.getElementById('loading').style.display = 'flex';
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Έλεγχος τύπου αρχείου
                if (!file.name.toLowerCase().endsWith('.kml')) {
                    console.warn(`Το αρχείο ${file.name} δεν είναι KML και θα παραληφθεί.`);
                    continue;
                }
                
                console.log(`Processing ${file.name} (${i+1}/${files.length})`);
                
                // Parsing και μετατροπή σε GeoJSON
                const geoJson = await kmlParser.parseKML(file);
                
                // Εφαρμογή στυλ στο GeoJSON
                const styledGeoJson = kmlParser.applyStyling(geoJson);
                
                // Απλοποίηση γεωμετρίας για καλύτερη απόδοση
                const simplifiedGeoJson = kmlParser.simplifyGeometry(styledGeoJson, 0.0001);
                
                // Δημιουργία AR οντοτήτων
                this.createAREntities(simplifiedGeoJson.features);
                
                // Αποθήκευση features για μετέπειτα χρήση
                this.loadedFeatures = [...this.loadedFeatures, ...simplifiedGeoJson.features];
            }
            
            console.log(`Loaded ${this.loadedFeatures.length} features successfully`);
        } catch (error) {
            console.error('Error loading KML files:', error);
            alert(`Σφάλμα φόρτωσης KML: ${error.message}`);
        } finally {
            // Απόκρυψη ένδειξης φόρτωσης
            document.getElementById('loading').style.display = 'none';
        }
    },
    
    /**
     * Δημιουργεί A-Frame οντότητες από GeoJSON features
     * @param {Array} features - GeoJSON features
     */
    createAREntities: function(features) {
        if (!this.container) {
            console.error('AR container not initialized');
            return;
        }
        
        features.forEach((feature, index) => {
            if (!feature.geometry || !feature.geometry.coordinates) {
                console.warn('Feature missing geometry or coordinates', feature);
                return;
            }
            
            const geomType = feature.geometry.type;
            const properties = feature.properties || {};
            
            // Δημιουργία βασικής οντότητας
            const entity = document.createElement('a-entity');
            entity.classList.add('ar-entity');
            entity.setAttribute('data-feature-index', index);
            
            // Κοινά χαρακτηριστικά
            const color = properties.color || '#FF0000';
            const opacity = properties.fillOpacity || 1;
            
            switch(geomType) {
                case 'Point':
                    this.createPointEntity(entity, feature);
                    break;
                    
                case 'LineString':
                    this.createLineEntity(entity, feature);
                    break;
                    
                case 'Polygon':
                    this.createPolygonEntity(entity, feature);
                    break;
                    
                default:
                    console.warn(`Unsupported geometry type: ${geomType}`);
                    return;
            }
            
            // Προσθήκη στη σκηνή
            this.container.appendChild(entity);
        });
    },
    
    /**
     * Δημιουργεί οντότητα σημείου (Point)
     * @param {Element} entity - Η A-Frame οντότητα
     * @param {Object} feature - GeoJSON feature
     */
    createPointEntity: function(entity, feature) {
        const coords = feature.geometry.coordinates;
        const properties = feature.properties || {};
        
        // Δημιουργία σφαίρας για το σημείο
        entity.setAttribute('geometry', {
            primitive: 'sphere',
            radius: 5 // μέτρα
        });
        
        entity.setAttribute('material', {
            color: properties.color || '#FF0000',
            opacity: properties.fillOpacity || 1,
            transparent: (properties.fillOpacity || 1) < 1
        });
        
        // Τοποθέτηση στο χώρο
        entity.setAttribute('gps-projected-entity-place', {
            latitude: coords[1],
            longitude: coords[0],
            altitude: coords[2] || 0
        });
        
        // Προσθήκη ονόματος εάν υπάρχει
        if (properties.name) {
            const text = document.createElement('a-text');
            text.setAttribute('value', properties.name);
            text.setAttribute('align', 'center');
            text.setAttribute('position', '0 6 0'); // πάνω από το σημείο
            text.setAttribute('scale', '5 5 5');
            text.setAttribute('color', '#FFFFFF');
            entity.appendChild(text);
        }
    },
    
    /**
     * Δημιουργεί οντότητα γραμμής (LineString)
     * @param {Element} entity - Η A-Frame οντότητα
     * @param {Object} feature - GeoJSON feature
     */
    createLineEntity: function(entity, feature) {
        const coords = feature.geometry.coordinates;
        const properties = feature.properties || {};
        
        if (coords.length < 2) {
            console.warn('LineString needs at least 2 points');
            return;
        }
        
        // Υπολογισμός κεντρικού σημείου για αναφορά
        const centerIndex = Math.floor(coords.length / 2);
        const centerCoord = coords[centerIndex];
        
        // Μετατροπή γεωγραφικών συντεταγμένων σε σχετικές θέσεις (x,y,z)
        const points = [];
        
        for (const coord of coords) {
            const [lon, lat, alt = 0] = coord;
            
            // Υπολογισμός θέσης σχετικά με το κεντρικό σημείο
            const relativePosition = this.geoToLocalPosition(
                lat, lon, alt,
                centerCoord[1], centerCoord[0], centerCoord[2] || 0
            );
            
            points.push(relativePosition);
        }
        
        // Δημιουργία entity για κάθε τμήμα της γραμμής
        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            
            const lineSegment = document.createElement('a-entity');
            lineSegment.setAttribute('line', {
                start: `${start.x} ${start.y} ${start.z}`,
                end: `${end.x} ${end.y} ${end.z}`,
                color: properties.color || '#0074D9',
                opacity: properties.strokeOpacity || 1,
                width: properties.strokeWidth || 3
            });
            
            entity.appendChild(lineSegment);
        }
        
        // Τοποθέτηση του κεντρικού σημείου αναφοράς
        entity.setAttribute('gps-projected-entity-place', {
            latitude: centerCoord[1],
            longitude: centerCoord[0],
            altitude: centerCoord[2] || 0
        });
    },
    
    /**
     * Δημιουργεί οντότητα πολυγώνου (Polygon)
     * @param {Element} entity - Η A-Frame οντότητα
     * @param {Object} feature - GeoJSON feature
     */
    createPolygonEntity: function(entity, feature) {
        const coords = feature.geometry.coordinates[0]; // Εξωτερικό δακτύλιο
        const properties = feature.properties || {};
        
        if (coords.length < 3) {
            console.warn('Polygon needs at least 3 points');
            return;
        }
        
        // Υπολογισμός κεντρικού σημείου
        let centerLat = 0, centerLon = 0, centerAlt = 0;
        coords.forEach(coord => {
            centerLon += coord[0];
            centerLat += coord[1];
            centerAlt += coord[2] || 0;
        });
        centerLat /= coords.length;
        centerLon /= coords.length;
        centerAlt /= coords.length;
        
        // Δημιουργία του shape με εξωθημένη γεωμετρία για το πολύγωνο
        const shape = [];
        coords.forEach(coord => {
            const [lon, lat, alt = 0] = coord;
            
            // Μετατροπή σε τοπικές συντεταγμένες από το κεντρικό σημείο
            const relativePos = this.geoToLocalPosition(
                lat, lon, alt,
                centerLat, centerLon, centerAlt
            );
            
            shape.push([relativePos.x, relativePos.z]); // Σημείωση: z είναι το "y" στο 2D
        });
        
        // Δημιουργία διαφανούς επιφάνειας
        entity.setAttribute('geometry', {
            primitive: 'plane',
            width: 100, // θα αναπροσαρμοστεί με scale
            height: 100
        });
        
        // Υλικό με διαφάνεια για τα πολύγωνα
        entity.setAttribute('material', {
            color: properties.color || '#2ECC40',
            opacity: properties.fillOpacity || 0.3,
            transparent: true,
            side: 'double' // ορατό και από τις δύο πλευρές
        });
        
        // Τοποθέτηση στο χώρο
        entity.setAttribute('gps-projected-entity-place', {
            latitude: centerLat,
            longitude: centerLon,
            altitude: centerAlt
        });
        
        // Προσθήκη ονόματος εάν υπάρχει
        if (properties.name) {
            const text = document.createElement('a-text');
            text.setAttribute('value', properties.name);
            text.setAttribute('align', 'center');
            text.setAttribute('position', '0 10 0');
            text.setAttribute('scale', '10 10 10');
            text.setAttribute('color', '#FFFFFF');
            entity.appendChild(text);
        }
    },
    
    /**
     * Καθαρίζει την AR σκηνή
     */
    clearARScene: function() {
        if (!this.container) return;
        
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        
        this.loadedFeatures = [];
        console.log('AR scene cleared');
    },
    
    /**
     * Ενημερώνει την κατάσταση όλων των AR οντοτήτων
     */
    updateAREntities: function() {
        // Εδώ θα μπορούσε να προστεθεί δυναμική ενημέρωση των οντοτήτων
        // βάσει της θέσης του χρήστη, π.χ. φιλτράρισμα βάσει απόστασης
        
        if (!this.userPosition) {
            console.log('No user position available yet');
            return;
        }
        
        // Ενημέρωση θέσης
        this.scene.setAttribute('arjs', 'sourceType: webcam; videoTexture: true; debugUIEnabled: false');
    },
    
    /**
     * Μετατρέπει γεωγραφικές συντεταγμένες σε τοπικές συντεταγμένες
     * σχετικά με ένα σημείο αναφοράς
     * @param {number} lat - Γεωγραφικό πλάτος
     * @param {number} lon - Γεωγραφικό μήκος
     * @param {number} alt - Υψόμετρο
     * @param {number} refLat - Γεωγραφικό πλάτος αναφοράς
     * @param {number} refLon - Γεωγραφικό μήκος αναφοράς
     * @param {number} refAlt - Υψόμετρο αναφοράς
     * @returns {Object} - Θέση {x, y, z} σε μέτρα
     */
    geoToLocalPosition: function(lat, lon, alt, refLat, refLon, refAlt) {
        // Ακτίνα της Γης σε μέτρα
        const R = 6378137;
        
        // Μετατροπή σε ακτίνια
        const latRad = lat * Math.PI / 180;
        const lonRad = lon * Math.PI / 180;
        const refLatRad = refLat * Math.PI / 180;
        const refLonRad = refLon * Math.PI / 180;
        
        // Υπολογισμός Cartesian συντεταγμένων
        const x = R * (lonRad - refLonRad) * Math.cos(refLatRad);
        const y = (alt - refAlt);
        const z = R * (latRad - refLatRad);
        
        return {x, y, z};
    }
};

// Αρχικοποίηση του AR Manager όταν φορτώσει το παράθυρο
document.addEventListener('DOMContentLoaded', () => {
    arManager.init();
});
